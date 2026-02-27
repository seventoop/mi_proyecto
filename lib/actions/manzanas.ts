"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getManzanas(etapaId: string) {
    try {
        const manzanas = await prisma.manzana.findMany({
            where: { etapaId },
            include: {
                unidades: true
            },
            orderBy: { nombre: "asc" }
        });

        return { success: true, data: manzanas };
    } catch (error) {
        console.error("Error fetching manzanas:", error);
        return { success: false, error: "Error al obtener manzanas" };
    }
}

export async function createManzana(data: {
    etapaId: string;
    nombre: string;
    coordsGeoJSON?: string;
}) {
    try {
        const etapa = await prisma.etapa.findUnique({
            where: { id: data.etapaId },
            select: { proyectoId: true }
        });

        if (!etapa) {
            return { success: false, error: "Etapa no encontrada" };
        }

        const manzana = await prisma.manzana.create({
            data
        });

        revalidatePath(`/dashboard/proyectos/${etapa.proyectoId}`);
        return { success: true, data: manzana };
    } catch (error) {
        console.error("Error creating manzana:", error);
        return { success: false, error: "Error al crear manzana" };
    }
}

export async function updateManzana(id: string, data: Partial<{
    nombre: string;
    coordsGeoJSON: string;
}>) {
    try {
        const manzana = await prisma.manzana.update({
            where: { id },
            data,
            include: {
                etapa: {
                    select: { proyectoId: true }
                }
            }
        });

        revalidatePath(`/dashboard/proyectos/${manzana.etapa.proyectoId}`);
        return { success: true, data: manzana };
    } catch (error) {
        console.error("Error updating manzana:", error);
        return { success: false, error: "Error al actualizar manzana" };
    }
}

export async function deleteManzana(id: string) {
    try {
        const manzana = await prisma.manzana.findUnique({
            where: { id },
            include: {
                etapa: {
                    select: { proyectoId: true }
                }
            }
        });

        if (!manzana) {
            return { success: false, error: "Manzana no encontrada" };
        }

        await prisma.manzana.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${manzana.etapa.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting manzana:", error);
        return { success: false, error: "Error al eliminar manzana" };
    }
}
