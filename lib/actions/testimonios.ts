"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const moderationSchema = z.object({
    id: z.string().cuid(),
    estado: z.string(),
});

export async function createTestimonio(data: {
    autorNombre: string;
    autorTipo: string;
    autorContacto?: string;
    texto: string;
    rating: number;
    mediaUrl?: string;
    proyectoId?: string;
}) {
    try {
        await prisma.testimonio.create({
            data: {
                ...data,
                estado: "PENDIENTE",
            },
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al enviar testimonio" };
    }
}

export async function getTestimonios(params: {
    page?: number;
    pageSize?: number;
    status?: string;
} = {}) {
    const { page = 1, pageSize = 20, status } = params;
    const skip = (page - 1) * pageSize;

    try {
        const where = status ? { estado: status } : {};
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
            metadata: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error("Error fetching testimonios:", error);
        return { success: false, error: "Error al obtener testimonios" };
    }
}

export async function updateTestimonioStatus(id: string, estado: string) {
    try {
        await prisma.testimonio.update({
            where: { id },
            data: { estado },
        });
        revalidatePath("/dashboard/admin/testimonios");
        revalidatePath("/"); // Update home if featured
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar estado" };
    }
}

export async function deleteTestimonio(id: string) {
    try {
        await prisma.testimonio.delete({ where: { id } });
        revalidatePath("/dashboard/admin/testimonios");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar testimonio" };
    }
}

export async function moderarTestimonio(input: unknown) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        const parsed = moderationSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "Datos inválidos" };
        const { id, estado } = parsed.data;

        await prisma.testimonio.update({
            where: { id },
            data: { estado },
        });

        revalidatePath("/dashboard/admin/testimonios");
        revalidatePath("/"); // Update home if featured
        return { success: true };
    } catch (error) {
        Sentry.captureException(error);
        console.error("[moderarTestimonio]", error);
        return { success: false, error: "Error interno al moderar testimonio" };
    }
}
