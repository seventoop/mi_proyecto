"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function crearHito(data: {
    proyectoId: string;
    titulo: string;
    descripcion?: string;
    porcentajeLiberacion: number;
    fechaEstimada?: Date;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

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
                estado: "PENDIENTE", // PENDIENTE -> COMPLETADO -> LIBERADO
                // fechaEstimada: data.fechaEstimada // TODO: Field not in schema
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: hito };
    } catch (error) {
        console.error("Error creating hito:", error);
        return { success: false, error: "Error al crear hito de escrow" };
    }
}

export async function completarHito(id: string, evidenciaUrl?: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const hitoData = await prisma.escrowMilestone.findUnique({
            where: { id },
            include: { proyecto: { select: { creadoPorId: true } } }
        });

        if (!hitoData) return { success: false, error: "Hito no encontrado" };
        if (user.role !== "ADMIN" && hitoData.proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }
        const hito = await prisma.escrowMilestone.update({
            where: { id },
            data: {
                estado: "COMPLETADO",
                fechaLogro: new Date(),
                // evidencia: evidenciaUrl // TODO: Field not in schema
            }
        });

        revalidatePath(`/dashboard/proyectos/${hito.proyectoId}`);
        return { success: true, data: hito };
    } catch (error) {
        console.error("Error completing hito:", error);
        return { success: false, error: "Error al completar hito" };
    }
}

export async function liberarFondosHito(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
        // Esta acción solo debería poder hacerla un admin o smart contract
        const hito = await prisma.escrowMilestone.update({
            where: { id },
            data: {
                estado: "LIBERADO",
                // fechaLiberacion: new Date() // TODO: Field not in schema
            }
        });

        // Aquí iría la lógica de movimiento de dinero real o actualización de saldos

        revalidatePath(`/dashboard/proyectos/${hito.proyectoId}`);
        return { success: true, data: hito };
    } catch (error) {
        console.error("Error releasing funds:", error);
        return { success: false, error: "Error al liberar fondos" };
    }
}

export async function getHitosProyecto(proyectoId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

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
        console.error("Error getting hitos:", error);
        return { success: false, error: "Error al obtener hitos" };
    }
}
