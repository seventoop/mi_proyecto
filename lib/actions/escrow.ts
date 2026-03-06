"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";
import { createNotification } from "./notifications";

// ─── Scemas ───

const hitoCreateSchema = z.object({
    proyectoId: idSchema,
    titulo: z.string().min(1, "Título requerido").max(100),
    descripcion: z.string().max(500).optional(),
    porcentajeLiberacion: z.number().min(0).max(100),
});

// ─── Mutations ───

export async function crearHito(input: unknown) {
    try {
        const user = await requireAuth();

        const parsed = hitoCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: data.proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        // Validar que la suma de porcentajes no supere 100%
        const hitosExistentes = await prisma.escrowMilestone.findMany({
            where: { proyectoId: data.proyectoId }
        });

        const totalAsignado = hitosExistentes.reduce((acc, h) => acc + h.porcentaje, 0);

        if (totalAsignado + data.porcentajeLiberacion > 100) {
            return { success: false, error: "La suma de porcentajes supera el 100%" };
        }

        const hito = await prisma.escrowMilestone.create({
            data: {
                proyectoId: data.proyectoId,
                titulo: data.titulo,
                descripcion: data.descripcion,
                porcentaje: data.porcentajeLiberacion,
                estado: "PENDIENTE",
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: hito };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function completarHito(id: string, evidenciaUrl?: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de hito inválido" };

        const user = await requireAuth();

        const hitoData = await prisma.escrowMilestone.findUnique({
            where: { id },
            include: { proyecto: { select: { creadoPorId: true, nombre: true } } }
        });

        if (!hitoData) return { success: false, error: "Hito no encontrado" };
        if (user.role !== "ADMIN" && hitoData.proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }
        const hito = await prisma.escrowMilestone.update({
            where: { id },
            data: {
                estado: "COMPLETADO" as any,
                fechaLogro: new Date(),
            }
        });

        // Notify Investors of progress reached
        const inversiones = await prisma.inversion.findMany({
            where: { proyectoId: hito.proyectoId, estado: "EN_ESCROW" },
            select: { inversorId: true }
        });

        for (const inv of inversiones) {
            await createNotification(
                inv.inversorId,
                "EXITO",
                "Hito de Progreso Alcanzado",
                `Se ha completado el hito "${hito.titulo}" en el proyecto "${hitoData.proyecto.nombre}". Los fondos entrarán en proceso de liberación.`,
                `/dashboard/inversor/proyectos/${hito.proyectoId}`
            );
        }

        revalidatePath(`/dashboard/proyectos/${hito.proyectoId}`);
        return { success: true, data: hito };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function liberarFondosHito(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de hito inválido" };

        await requireRole("ADMIN");
        const hito = await prisma.escrowMilestone.update({
            where: { id },
            data: {
                estado: "LIBERADO" as any,
            },
            include: { proyecto: { select: { creadoPorId: true, nombre: true } } }
        });

        // Notify Project Owner
        if (hito.proyecto.creadoPorId) {
            await createNotification(
                hito.proyecto.creadoPorId,
                "EXITO",
                "Fondos Liberados de Hito Escrow",
                `Los fondos del hito "${hito.titulo}" en el proyecto "${hito.proyecto.nombre}" han sido liberados.`,
                `/dashboard/proyectos/${hito.proyectoId}`,
                true
            );
        }

        // Notify Investors
        const inversiones = await prisma.inversion.findMany({
            where: { proyectoId: hito.proyectoId, estado: "EN_ESCROW" },
            select: { inversorId: true }
        });

        for (const inv of inversiones) {
            await createNotification(
                inv.inversorId,
                "INFO",
                "Actualización de Hito en tu Inversión",
                `Se ha completado y liberado un hito en el proyecto "${hito.proyecto.nombre}".`,
                "/dashboard/inversor/mis-inversiones"
            );
        }

        revalidatePath(`/dashboard/proyectos/${hito.proyectoId}`);
        return { success: true, data: hito };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getHitosProyecto(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        const user = await requireAuth();

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        // SECURITY: Only Admin or Owner
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }
        const hitos = await prisma.escrowMilestone.findMany({
            where: { proyectoId },
            orderBy: { createdAt: "asc" }
        });

        return { success: true, data: hitos };
    } catch (error) {
        return handleGuardError(error);
    }
}
