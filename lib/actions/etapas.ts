"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getEtapas(proyectoId: string) {
    try {
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
        console.error("Error fetching etapas:", error);
        return { success: false, error: "Error al obtener etapas" };
    }
}

export async function createEtapa(data: {
    proyectoId: string;
    nombre: string;
    descripcion?: string;
    orden?: number;
}) {
    try {
        // If orden is not provided, get the next available order
        if (!data.orden) {
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
                orden: data.orden
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: etapa };
    } catch (error) {
        console.error("Error creating etapa:", error);
        return { success: false, error: "Error al crear etapa" };
    }
}

export async function updateEtapa(id: string, data: Partial<{
    nombre: string;
    descripcion: string;
    orden: number;
}>) {
    try {
        const etapa = await prisma.etapa.update({
            where: { id },
            data,
            include: { proyecto: true }
        });

        revalidatePath(`/dashboard/proyectos/${etapa.proyectoId}`);
        return { success: true, data: etapa };
    } catch (error) {
        console.error("Error updating etapa:", error);
        return { success: false, error: "Error al actualizar etapa" };
    }
}

export async function deleteEtapa(id: string) {
    try {
        const etapa = await prisma.etapa.findUnique({
            where: { id },
            select: { proyectoId: true }
        });

        if (!etapa) {
            return { success: false, error: "Etapa no encontrada" };
        }

        await prisma.etapa.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${etapa.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting etapa:", error);
        return { success: false, error: "Error al eliminar etapa" };
    }
}
