"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getProjectTours(proyectoId: string) {
    try {
        const tours = await prisma.tour360.findMany({
            where: { proyectoId },
            orderBy: { updatedAt: "desc" }
        });
        return { success: true, data: tours };
    } catch (error) {
        console.error("Error fetching tours:", error);
        return { success: false, error: "Error al obtener tours" };
    }
}

export async function createTour(data: {
    proyectoId: string;
    nombre: string;
    escenas: string; // JSON string
    unidadId?: string;
}) {
    try {
        const tour = await prisma.tour360.create({
            data: {
                proyectoId: data.proyectoId,
                nombre: data.nombre,
                escenas: data.escenas,
                unidadId: data.unidadId,
                estado: "PENDIENTE"
            }
        });
        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: tour };
    } catch (error) {
        console.error("Error creating tour:", error);
        return { success: false, error: "Error al crear tour" };
    }
}

export async function updateTour(id: string, data: {
    nombre?: string;
    escenas?: string;
}) {
    try {
        const tour = await prisma.tour360.update({
            where: { id },
            data: {
                ...data,
                estado: "PENDIENTE" // Reset status on edit? Or keep it? Usually reset to require re-approval.
            }
        });
        revalidatePath(`/dashboard/proyectos/${tour.proyectoId}`);
        return { success: true, data: tour };
    } catch (error) {
        console.error("Error updating tour:", error);
        return { success: false, error: "Error al actualizar tour" };
    }
}

export async function deleteTour(id: string) {
    try {
        const tour = await prisma.tour360.delete({
            where: { id }
        });
        revalidatePath(`/dashboard/proyectos/${tour.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting tour:", error);
        return { success: false, error: "Error al eliminar tour" };
    }
}

export async function approveTour(id: string) {
    try {
        const tour = await prisma.tour360.update({
            where: { id },
            data: {
                estado: "APROBADO",
                notasAdmin: null
            }
        });
        revalidatePath(`/dashboard/proyectos/${tour.proyectoId}`);
        return { success: true, data: tour };
    } catch (error) {
        console.error("Error approving tour:", error);
        return { success: false, error: "Error al aprobar tour" };
    }
}

export async function rejectTour(id: string, reason: string) {
    try {
        const tour = await prisma.tour360.update({
            where: { id },
            data: {
                estado: "RECHAZADO",
                notasAdmin: reason
            }
        });
        revalidatePath(`/dashboard/proyectos/${tour.proyectoId}`);
        return { success: true, data: tour };
    } catch (error) {
        console.error("Error rejecting tour:", error);
        return { success: false, error: "Error al rechazar tour" };
    }
}
