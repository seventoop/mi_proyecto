"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const noticiaCreateSchema = z.object({
    titulo: z.string().min(5, "Título demasiado corto").max(200),
    slug: z.string().min(3).max(200),
    excerpt: z.string().max(500).optional(),
    contenido: z.string().min(10, "Contenido demasiado corto"),
    categoria: z.string().default("GENERAL"),
    imagenUrl: z.string().max(1000).optional().or(z.literal("")),
    destacada: z.boolean().default(false),
    autorId: idSchema,
});

const noticiaUpdateSchema = noticiaCreateSchema.partial();

// ─── Queries ───

export async function getNoticias(params: {
    page?: number;
    pageSize?: number;
    categoria?: string;
} = {}) {
    const { page = 1, pageSize = 10, categoria } = params;
    const skip = (page - 1) * pageSize;

    try {
        const where: any = {};
        if (categoria && categoria !== "TODOS") {
            where.categoria = categoria;
        }

        const [noticias, total] = await Promise.all([
            prisma.noticia.findMany({
                where,
                select: {
                    id: true,
                    titulo: true,
                    slug: true,
                    excerpt: true,
                    categoria: true,
                    imagenUrl: true,
                    destacada: true,
                    createdAt: true,
                    autor: { select: { nombre: true, avatar: true } }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.noticia.count({ where })
        ]);

        return {
            success: true,
            data: noticias,
            metadata: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error("Error fetching news:", error);
        return { success: false, error: "Error al obtener noticias" };
    }
}

export async function getNoticiaBySlug(slug: string) {
    try {
        if (!slug) return { success: false, error: "Slug requerido" };

        const noticia = await prisma.noticia.findUnique({
            where: { slug },
            include: {
                autor: { select: { nombre: true, avatar: true, bio: true } }
            }
        });

        if (!noticia) return { success: false, error: "Noticia no encontrada" };
        return { success: true, data: noticia };
    } catch (error) {
        return { success: false, error: "Error al obtener la noticia" };
    }
}

// ─── Mutations ───

export async function createNoticia(input: unknown) {
    try {
        const parsed = noticiaCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const noticia = await prisma.noticia.create({
            data: {
                ...data,
                destacada: data.destacada || false
            }
        });
        revalidatePath("/blog");
        return { success: true, data: noticia };
    } catch (error) {
        console.error("Error creating news:", error);
        return { success: false, error: "Error al crear noticia" };
    }
}

export async function updateNoticia(id: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de noticia inválido" };

        const parsed = noticiaUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        await prisma.noticia.update({
            where: { id },
            data
        });
        revalidatePath("/blog");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar noticia" };
    }
}

export async function deleteNoticia(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de noticia inválido" };

        await prisma.noticia.delete({ where: { id } });
        revalidatePath("/blog");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar noticia" };
    }
}
