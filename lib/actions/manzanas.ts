"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const manzanaCreateSchema = z.object({
    etapaId: idSchema,
    nombre: z.string().min(1, "Nombre de manzana requerido").max(100),
    coordsGeoJSON: z.string().optional(),
});

const manzanaUpdateSchema = z.object({
    nombre: z.string().min(1).max(100).optional(),
    coordsGeoJSON: z.string().optional(),
});

// ─── Helper: resolve etapa → proyectoId ───

async function resolveProyectoIdFromEtapa(etapaId: string): Promise<string | null> {
    const etapa = await prisma.etapa.findUnique({
        where: { id: etapaId },
        select: { proyectoId: true }
    });
    return etapa?.proyectoId ?? null;
}

async function resolveProyectoIdFromManzana(manzanaId: string): Promise<{ proyectoId: string | null; found: boolean }> {
    const manzana = await prisma.manzana.findUnique({
        where: { id: manzanaId },
        include: { etapa: { select: { proyectoId: true } } }
    });
    if (!manzana) return { proyectoId: null, found: false };
    return { proyectoId: manzana.etapa.proyectoId, found: true };
}

// ─── Queries ───

export async function getManzanas(etapaId: string) {
    try {
        const idParsed = idSchema.safeParse(etapaId);
        if (!idParsed.success) return { success: false, error: "ID de etapa inválido" };

        // AUTH: resolve etapa → proyecto → ownership
        const proyectoId = await resolveProyectoIdFromEtapa(etapaId);
        if (!proyectoId) return { success: false, error: "Etapa no encontrada" };
        await requireProjectOwnership(proyectoId);

        const manzanas = await prisma.manzana.findMany({
            where: { etapaId },
            include: { unidades: true },
            orderBy: { nombre: "asc" }
        });

        return { success: true, data: manzanas };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function createManzana(input: unknown) {
    try {
        const parsed = manzanaCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // AUTH: resolve etapa → proyecto → ownership
        const proyectoId = await resolveProyectoIdFromEtapa(data.etapaId);
        if (!proyectoId) return { success: false, error: "Etapa no encontrada" };
        await requireProjectOwnership(proyectoId);

        const manzana = await prisma.manzana.create({ data });

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true, data: manzana };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateManzana(id: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de manzana inválido" };

        const parsed = manzanaUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // AUTH: resolve manzana → etapa → proyecto → ownership
        const { proyectoId, found } = await resolveProyectoIdFromManzana(id);
        if (!found) return { success: false, error: "Manzana no encontrada" };
        await requireProjectOwnership(proyectoId!);

        const manzana = await prisma.manzana.update({
            where: { id },
            data,
            include: { etapa: { select: { proyectoId: true } } }
        });

        revalidatePath(`/dashboard/proyectos/${manzana.etapa.proyectoId}`);
        return { success: true, data: manzana };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteManzana(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de manzana inválido" };

        // AUTH: resolve manzana → etapa → proyecto → ownership
        const { proyectoId, found } = await resolveProyectoIdFromManzana(id);
        if (!found) return { success: false, error: "Manzana no encontrada" };
        await requireProjectOwnership(proyectoId!);

        await prisma.manzana.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
