"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const etapaCreateSchema = z.object({
    proyectoId: idSchema,
    nombre: z.string().min(1, "Nombre de etapa requerido").max(100),
    descripcion: z.string().max(500).optional(),
    orden: z.number().int().optional(),
});

const etapaUpdateSchema = z.object({
    nombre: z.string().min(1).max(100).optional(),
    descripcion: z.string().max(500).optional(),
    orden: z.number().int().optional(),
});

// ─── Queries ───

export async function getEtapas(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        // AUTH: Must be authenticated and own the project (or be ADMIN)
        await requireProjectOwnership(proyectoId);

        const etapas = await prisma.etapa.findMany({
            where: { proyectoId },
            include: {
                manzanas: {
                    include: {
                        unidades: true
                    }
                }
            },
            orderBy: { orden: "asc" }
        });

        return { success: true, data: etapas };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function createEtapa(input: unknown) {
    try {
        const parsed = etapaCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // AUTH: Must be authenticated and own the project (or be ADMIN)
        await requireProjectOwnership(data.proyectoId);

        // If orden is not provided, get the next available order
        if (data.orden === undefined) {
            const maxOrden = await prisma.etapa.findFirst({
                where: { proyectoId: data.proyectoId },
                orderBy: { orden: "desc" },
                select: { orden: true }
            });
            data.orden = (maxOrden?.orden || 0) + 1;
        }

        const etapa = await prisma.etapa.create({
            data: {
                ...data,
                orden: data.orden as number
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: etapa };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateEtapa(id: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de etapa inválido" };

        const parsed = etapaUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // AUTH: Look up etapa → proyecto, then verify ownership
        const existing = await prisma.etapa.findUnique({
            where: { id },
            select: { proyectoId: true }
        });
        if (!existing) return { success: false, error: "Etapa no encontrada" };

        await requireProjectOwnership(existing.proyectoId);

        const etapa = await prisma.etapa.update({
            where: { id },
            data,
            include: { proyecto: true }
        });

        revalidatePath(`/dashboard/proyectos/${etapa.proyectoId}`);
        return { success: true, data: etapa };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteEtapa(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de etapa inválido" };

        const etapa = await prisma.etapa.findUnique({
            where: { id },
            select: { proyectoId: true }
        });

        if (!etapa) {
            return { success: false, error: "Etapa no encontrada" };
        }

        // AUTH: Must own the project (or be ADMIN)
        await requireProjectOwnership(etapa.proyectoId);

        await prisma.etapa.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${etapa.proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
