"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema } from "@/lib/validations";
import { createNotification } from "./notifications";
import { requireAuth, requireAnyRole, handleGuardError } from "@/lib/guards";

// ─── Schemas ───

const bannerCreateSchema = z.object({
    titulo: z.string().min(1, "Título requerido").max(100),
    mediaUrl: z.string().url("URL de media inválida"),
    linkDestino: z.string().url("URL de destino inválida").optional().or(z.literal("")),
    posicion: z.string().min(1, "Posición requerida"),
    prioridad: z.number().int().default(0),
    fechaInicio: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date().optional()),
    fechaFin: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date().optional()),
    tipo: z.string().default("IMAGEN"),
    creadoPorId: idSchema.optional(), // accepted but overridden server-side
});

const bannerUpdateSchema = z.object({
    titulo: z.string().min(1).max(100).optional(),
    mediaUrl: z.string().url().optional(),
    linkDestino: z.string().url().optional().or(z.literal("")),
    posicion: z.string().optional(),
    prioridad: z.number().int().optional(),
    fechaInicio: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date().optional()),
    fechaFin: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date().optional()),
    tipo: z.string().optional(),
    estado: z.string().optional(),
    notasAdmin: z.string().optional(),
});

// ─── Queries ───

export async function getBanners(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    userId?: string;
} = {}) {
    try {
        const user = await requireAuth();
        const { page = 1, pageSize = 20, status, userId } = params;
        const skip = (page - 1) * pageSize;

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        const where: any = {};
        if (status) where.estado = status;

        if (!isAdmin) {
            // Non-admin users can only see their own banners
            if (userId && userId !== user.id) {
                return { success: false, error: "No autorizado" };
            }
            where.creadoPorId = user.id;
        } else if (userId) {
            // Admin filtering by a specific user
            where.creadoPorId = userId;
        }

        const [banners, total] = await Promise.all([
            prisma.banner.findMany({
                where,
                select: {
                    id: true,
                    titulo: true,
                    mediaUrl: true,
                    linkDestino: true,
                    posicion: true,
                    prioridad: true,
                    estado: true,
                    tipo: true,
                    createdAt: true,
                    pago: {
                        select: {
                            id: true,
                            monto: true,
                            estado: true,
                            comprobanteUrl: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.banner.count({ where })
        ]);

        return {
            success: true,
            data: banners,
            metadata: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getBannersLanding() {
    try {
        const banners = await prisma.banner.findMany({
            where: { estado: "ACTIVO" },
            orderBy: { posicion: "asc" },
        });

        return { success: true, data: banners };
    } catch (error) {
        console.error("Error getBannersLanding:", error);
        return { success: false, error: "Error fetching banners" };
    }
}

// ─── Mutations ───

export async function createBanner(input: unknown) {
    try {
        const user = await requireAuth();

        if (!user.orgId) {
            return { success: false, error: "Sin organización asignada. Contacta al administrador." };
        }

        const parsed = bannerCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        // Non-admin creators go through payment flow; admin creates directly in PENDIENTE
        const estado = isAdmin ? "PENDIENTE" : "PENDIENTE_PAGO";

        const banner = await prisma.banner.create({
            data: {
                ...data,
                creadoPorId: user.id, // Always set from authenticated session
                estado,
            },
        });

        revalidatePath("/dashboard/banners");
        return { success: true, data: banner };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function linkBannerPayment(bannerId: string, comprobanteUrl: string, monto: number) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const idParsed = idSchema.safeParse(bannerId);
        if (!idParsed.success) return { success: false, error: "ID de banner inválido" };

        const banner = await prisma.banner.findUnique({ where: { id: bannerId } });
        if (!banner || !banner.creadoPorId) throw new Error("Banner no válido");

        await prisma.pago.create({
            data: {
                monto,
                concepto: `Pago por Banner: ${banner.titulo}`,
                comprobanteUrl,
                usuarioId: banner.creadoPorId,
                bannerId: banner.id,
                estado: "PENDIENTE",
                tipo: "BANNER_PAYMENT" as any,
                fechaPago: new Date(),
            }
        });

        // Update banner status
        await prisma.banner.update({
            where: { id: bannerId },
            data: { estado: "PENDIENTE" }
        });

        revalidatePath("/dashboard/developer/banners");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateBanner(id: string, input: unknown) {
    try {
        const user = await requireAuth();

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de banner inválido" };

        const parsed = bannerUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        // Only admin can change status
        const adminOnlyStates = ["APROBADO", "RECHAZADO", "PAUSADO", "ACTIVO"];
        if (data.estado && adminOnlyStates.includes(data.estado) && !isAdmin) {
            return { success: false, error: "Sin permisos para cambiar el estado del banner" };
        }

        // Non-admin can only edit their own banners
        if (!isAdmin) {
            const existing = await prisma.banner.findUnique({
                where: { id },
                select: { creadoPorId: true }
            });
            if (!existing) return { success: false, error: "Banner no encontrado" };
            if (existing.creadoPorId !== user.id) return { success: false, error: "No autorizado" };
        }

        // Get old status to check for changes
        const oldBanner = await prisma.banner.findUnique({ where: { id } });

        const banner = await prisma.banner.update({
            where: { id },
            data,
        });

        // Notify user if status changed
        if (oldBanner && oldBanner.estado !== (banner as any).estado && (banner as any).creadoPorId) {
            let titulo = "Actualización de Anuncio";
            let mensaje = `El estado de su anuncio "${(banner as any).titulo}" ha cambiado a ${(banner as any).estado}.`;
            let tipo: 'INFO' | 'ALERTA' | 'EXITO' | 'ERROR' = 'INFO';

            if ((banner as any).estado === "APROBADO") {
                titulo = "¡Anuncio Aprobado! 🚀";
                mensaje = `Su anuncio "${(banner as any).titulo}" ha sido aprobado y ya es visible en la plataforma.`;
                tipo = 'EXITO';
            } else if ((banner as any).estado === "RECHAZADO") {
                titulo = "Anuncio Rechazado ❌";
                mensaje = `Su anuncio "${(banner as any).titulo}" ha sido rechazado. MOTIVO: ${data.notasAdmin || "No especificado"}.`;
                tipo = 'ERROR';
            }

            await createNotification(
                (banner as any).creadoPorId,
                tipo,
                titulo,
                mensaje,
                "/dashboard/developer/banners",
                true // Send Email
            );
        }

        revalidatePath("/dashboard/banners");
        revalidatePath("/dashboard/admin/banners");
        return { success: true, data: banner };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteBanner(id: string) {
    try {
        const user = await requireAuth();

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de banner inválido" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        if (!isAdmin) {
            const existing = await prisma.banner.findUnique({
                where: { id },
                select: { creadoPorId: true }
            });
            if (!existing) return { success: false, error: "Banner no encontrado" };
            if (existing.creadoPorId !== user.id) return { success: false, error: "No autorizado" };
        }

        await prisma.banner.delete({ where: { id } });
        revalidatePath("/dashboard/banners");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
