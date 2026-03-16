"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireProjectOwnership, requireAnyRole, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const uploadDocumentoSchema = z.object({
    proyectoId: idSchema,
    titulo: z.string().min(1, "Título requerido").max(100),
    tipo: z.string().min(1, "Tipo de documento requerido"),
    url: z.string().min(1, "URL de documento requerida").max(1000),
    descripcion: z.string().max(500).optional(),
});

const estadoDocumentoSchema = z.object({
    estado: z.enum(["APROBADO", "RECHAZADO", "PENDIENTE"]),
    comentario: z.string().max(500).optional(),
});

// ─── Queries ───

export async function getDocumentosProyecto(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        // AUTH: Must be authenticated and own the project (or be ADMIN)
        await requireProjectOwnership(proyectoId);

        const documentos = await prisma.documentacion.findMany({
            where: { proyectoId },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: documentos };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function uploadDocumento(input: unknown) {
    try {
        const parsed = uploadDocumentoSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // AUTH: Must be authenticated and own the project (or be ADMIN)
        const user = await requireProjectOwnership(data.proyectoId);

        const documento = await prisma.documentacion.create({
            data: {
                proyectoId: data.proyectoId,
                usuarioId: user.id,
                tipo: data.tipo,
                archivoUrl: data.url,
                estado: "PENDIENTE",
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: documento };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateEstadoDocumento(id: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de documento inválido" };

        const parsed = estadoDocumentoSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const { estado, comentario } = parsed.data;

        // AUTH: Only ADMIN can change document status
        await requireAnyRole(["ADMIN"]);

        const doc = await prisma.documentacion.findUnique({
            where: { id },
            select: { proyectoId: true }
        });
        if (!doc) return { success: false, error: "Documento no encontrado" };

        const updated = await prisma.documentacion.update({
            where: { id },
            data: { estado, comentarios: comentario }
        });

        if (doc.proyectoId) revalidatePath(`/dashboard/proyectos/${doc.proyectoId}`);
        return { success: true, data: updated };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteDocumento(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de documento inválido" };

        // AUTH: Look up document → project → ownership
        const doc = await prisma.documentacion.findUnique({
            where: { id },
            select: { proyectoId: true }
        });
        if (!doc) return { success: false, error: "Documento no encontrado" };
        if (!doc.proyectoId) {
            // Document not linked to a project — only ADMIN can delete
            await requireAnyRole(["ADMIN"]);
        } else {
            await requireProjectOwnership(doc.proyectoId);
        }

        await prisma.documentacion.delete({ where: { id } });

        if (doc.proyectoId) revalidatePath(`/dashboard/proyectos/${doc.proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
