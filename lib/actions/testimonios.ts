"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { requireRole, handleGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

// ─── Scemas ───

const testimonioCreateSchema = z.object({
    autorNombre: z.string().min(2, "Nombre requerido").max(100),
    autorTipo: z.string().default("USUARIO"),
    autorContacto: z.string().max(100).optional(),
    texto: z.string().min(10, "El testimonio es demasiado corto").max(1000),
    rating: z.number().int().min(1).max(5).default(5),
    mediaUrl: z.string().url("URL de media inválida").optional().or(z.literal("")),
    proyectoId: idSchema.optional(),
});

const moderationSchema = z.object({
    id: idSchema,
    estado: z.enum(["PENDIENTE", "APROBADO", "RECHAZADO"]),
});

// ─── Queries ───

// Public: only returns APROBADO testimonios — no guard needed
export async function getTestimonios(params: {
    page?: number;
    pageSize?: number;
} = {}) {
    const { page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    try {
        const where = { estado: "APROBADO" };
        const [testimonios, total] = await Promise.all([
            prisma.testimonio.findMany({
                where,
                select: {
                    id: true,
                    autorNombre: true,
                    autorTipo: true,
                    texto: true,
                    rating: true,
                    estado: true,
                    mediaUrl: true,
                    createdAt: true,
                    proyecto: { select: { id: true, nombre: true } }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.testimonio.count({ where })
        ]);

        return {
            success: true,
            data: testimonios,
            metadata: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
        };
    } catch (error) {
        return { success: false, error: "Error al obtener testimonios" };
    }
}

// Admin: returns all testimonios regardless of status — requires ADMIN role
export async function getTestimoniosAdmin(params: {
    page?: number;
    pageSize?: number;
} = {}) {
    try {
        await requireRole("ADMIN");
        const { page = 1, pageSize = 50 } = params;
        const skip = (page - 1) * pageSize;

        const [testimonios, total] = await Promise.all([
            prisma.testimonio.findMany({
                select: {
                    id: true,
                    autorNombre: true,
                    autorTipo: true,
                    texto: true,
                    rating: true,
                    estado: true,
                    mediaUrl: true,
                    createdAt: true,
                    proyecto: { select: { id: true, nombre: true } }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.testimonio.count()
        ]);

        return {
            success: true,
            data: testimonios,
            metadata: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function createTestimonio(input: unknown) {
    try {
        const parsed = testimonioCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // Rate limit: max 3 PENDIENTE per autorContacto (email)
        if (data.autorContacto) {
            const pendingCount = await prisma.testimonio.count({
                where: { autorContacto: data.autorContacto, estado: "PENDIENTE" },
            });
            if (pendingCount >= 3) {
                return { success: false, error: "Tienes demasiados testimonios pendientes de revisión. Por favor, aguarda la moderación." };
            }
        }

        await prisma.testimonio.create({
            data: { ...data, estado: "PENDIENTE" },
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al enviar testimonio" };
    }
}

export async function updateTestimonioStatus(id: string, estado: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de testimonio inválido" };

        await requireRole("ADMIN");
        await prisma.testimonio.update({
            where: { id },
            data: { estado },
        });
        revalidatePath("/dashboard/admin/testimonios");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteTestimonio(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de testimonio inválido" };

        await requireRole("ADMIN");
        await prisma.testimonio.delete({ where: { id } });
        revalidatePath("/dashboard/admin/testimonios");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function moderarTestimonio(input: unknown) {
    try {
        await requireRole("ADMIN");

        const parsed = moderationSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "Datos inválidos" };
        const { id, estado } = parsed.data;

        await prisma.testimonio.update({
            where: { id },
            data: { estado },
        });

        revalidatePath("/dashboard/admin/testimonios");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        Sentry.captureException(error);
        return handleGuardError(error);
    }
}
