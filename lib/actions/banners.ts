"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema } from "@/lib/validations";
import { createNotification } from "./notifications";

// ─── Schemas ───

const bannerCreateSchema = z.object({
    titulo: z.string().min(1, "Título requerido").max(100),
    mediaUrl: z.string().url("URL de media inválida"),
    linkDestino: z.string().url("URL de destino inválida").optional().or(z.literal("")),
    posicion: z.string().min(1, "Posición requerida"),
    prioridad: z.number().int().default(0),
    fechaInicio: z.string().or(z.date()).optional(),
    fechaFin: z.string().or(z.date()).optional(),
    tipo: z.string().default("IMAGEN"),
    creadoPorId: idSchema.optional(),
});

const bannerUpdateSchema = bannerCreateSchema.partial();

// ─── Queries ───

export async function getBanners(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    userId?: string;
} = {}) {
    const { page = 1, pageSize = 20, status, userId } = params;
    const skip = (page - 1) * pageSize;

    try {
        const where: any = {};
        if (status) where.estado = status;
        if (userId) where.creadoPorId = userId;

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
                            estado: true
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
        console.error("Error fetching banners:", error);
        return { success: false, error: "Error al obtener banners" };
    }
}

// ─── Mutations ───

export async function createBanner(input: unknown) {
    try {
        const parsed = bannerCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const banner = await prisma.banner.create({
            data: {
                ...data,
                estado: data.creadoPorId ? "PENDIENTE_PAGO" : "PENDIENTE",
            },
        });

        revalidatePath("/dashboard/banners");
        return { success: true, data: banner };
    } catch (error) {
        return { success: false, error: "Error al crear banner" };
    }
}

export async function linkBannerPayment(bannerId: string, comprobanteUrl: string, monto: number) {
    try {
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
        return { success: false, error: "Error al registrar pago" };
    }
}

export async function updateBanner(id: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de banner inválido" };

        const parsed = bannerUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

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
                mensaje = `Su anuncio "${(banner as any).titulo}" ha sido rechazado. Por favor contacte a soporte o revise las políticas.`;
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
        return { success: true, data: banner };
    } catch (error) {
        return { success: false, error: "Error al actualizar banner" };
    }
}

export async function deleteBanner(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de banner inválido" };

        await prisma.banner.delete({ where: { id } });
        revalidatePath("/dashboard/banners");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar banner" };
    }
}
