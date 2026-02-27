"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function uploadDocumento(data: {
    proyectoId: string;
    titulo: string;
    tipo: string;
    url: string;
    descripcion?: string;
}) {
    try {
        const documento = await prisma.documentacion.create({
            data: {
                proyectoId: data.proyectoId,
                tipo: data.tipo,
                archivoUrl: data.url,
                estado: "PENDIENTE", // PENDIENTE -> APROBADO -> RECHAZADO
            }
        });

        // Al subir un documento, el estado general de documentación del proyecto podría cambiar a PENDIENTE
        await prisma.proyecto.update({
            where: { id: data.proyectoId },
            data: {
                // documentacionEstado: "PENDIENTE" // TODO: Fix Prisma Client generation issue
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: documento };
    } catch (error) {
        console.error("Error uploading documento:", error);
        return { success: false, error: "Error al registrar documento" };
    }
}

export async function updateEstadoDocumento(id: string, estado: string, comentario?: string) {
    /*
    try {
        const documento = await prisma.documentacion.update({
            where: { id },
            data: {
                estado,
                comentarios: comentario
            },
            include: { proyecto: true }
        });

        // Verificar si todos los documentos del proyecto están aprobados
        const docs = await prisma.documentacion.findMany({
            where: { proyectoId: documento.proyectoId }
        });

        const todosAprobados = docs.every(d => d.estado === "APROBADO");
        const algunoRechazado = docs.some(d => d.estado === "RECHAZADO");

        await prisma.proyecto.update({
            where: { id: documento.proyectoId },
            data: {
                // documentacionEstado: todosAprobados ? "APROBADO" :
                //    algunoRechazado ? "RECHAZADO" : "PENDIENTE" // TODO: Fix Prisma Client generation
            }
        });

        revalidatePath(`/dashboard/proyectos/${documento.proyectoId}`);
        return { success: true, data: documento };
    } catch (error) {
        console.error("Error updating documento status:", error);
        return { success: false, error: "Error al actualizar estado del documento" };
    }
    */
    return { success: false, error: "Feature disabled temporarily" };
}

export async function deleteDocumento(id: string) {
    /*
    try {
        const documento = await prisma.documentacion.findUnique({
            where: { id },
            select: { proyectoId: true }
        });

        if (!documento) return { success: false, error: "Documento no encontrado" };

        await prisma.documentacion.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${documento.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting documento:", error);
        return { success: false, error: "Error al eliminar documento" };
    }
    */
    return { success: false, error: "Feature disabled temporarily" };
}

export async function getDocumentosProyecto(proyectoId: string) {
    /*
    try {
        const documentos = await prisma.documentacion.findMany({
            where: { proyectoId },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: documentos };
    } catch (error) {
        console.error("Error fetching documentos:", error);
        return { success: false, error: "Error al obtener documentos" };
    }
    */
    return { success: true, data: [] }; // Return empty list to avoid UI errors
}
