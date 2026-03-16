"use server";

import prisma from "@/lib/db";
import { requireRole, requireAnyRole, handleGuardError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

const blogPostSchema = z.object({
    titulo: z.string().min(1, "Título requerido").max(200),
    contenido: z.string().min(1, "Contenido requerido"),
    slug: z.string().min(1, "Slug requerido"),
    status: z.enum(["PENDIENTE", "APROBADO", "RECHAZADO", "BORRADOR"]).default("PENDIENTE"),
    autorId: idSchema,
    orgId: idSchema.optional().nullable(),
    imagen: z.string().max(1000).optional().nullable(),
    tags: z.array(z.string()).default([]),
});

const updateBlogPostSchema = z.object({
    titulo: z.string().min(1).max(200).optional(),
    contenido: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    status: z.enum(["PENDIENTE", "APROBADO", "RECHAZADO", "BORRADOR"]).optional(),
    imagen: z.string().url().optional().nullable(),
    tags: z.array(z.string()).optional(),
});

export async function getBlogPostsAdmin() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const posts = await prisma.blogPost.findMany({
            include: {
                autor: { select: { nombre: true, email: true } },
                org: { select: { nombre: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return { success: true, data: posts };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function createBlogPost(input: unknown) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const parsed = blogPostSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

        const post = await prisma.blogPost.create({
            data: parsed.data
        });

        revalidatePath("/dashboard/admin/blog");
        return { success: true, data: post };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateBlogPost(id: string, input: unknown) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const parsed = updateBlogPostSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        const post = await prisma.blogPost.update({
            where: { id },
            data: parsed.data
        });
        revalidatePath("/dashboard/admin/blog");
        return { success: true, data: post };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteBlogPost(id: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        await prisma.blogPost.delete({ where: { id } });
        revalidatePath("/dashboard/admin/blog");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
