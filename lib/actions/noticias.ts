"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

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

export async function createNoticia(data: {
    titulo: string;
    slug: string;
    excerpt: string;
    contenido: string;
    categoria: string;
    imagenUrl?: string;
    destacada?: boolean;
    autorId: string;
}) {
    try {
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

export async function updateNoticia(id: string, data: any) {
    try {
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
        await prisma.noticia.delete({ where: { id } });
        revalidatePath("/blog");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar noticia" };
    }
}
