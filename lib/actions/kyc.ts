"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { createNotification } from "./notifications";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Queries ───

export async function getPendingKYC() {
    try {
        await requireRole("ADMIN");
        const users = await prisma.user.findMany({
            where: { kycStatus: { in: ["PENDIENTE", "EN_REVISION"] } },
            include: { documentacion: true },
            orderBy: { createdAt: "desc" },
        } as any);
        return { success: true, data: users };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getUserKYC(userId: string) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        const user = await requireAuth();

        if (user.role !== "ADMIN" && user.id !== userId) {
            return { success: false, error: "No tienes permisos para ver este KYC" };
        }

        const userData = await prisma.user.findUnique({
            where: { id: userId },
            select: { kycStatus: true, riskLevel: true, demoEndsAt: true, demoUsed: true }
        });

        if (!userData) return { success: true, data: null };

        const docs = await prisma.documentacion.findMany({
            where: { usuarioId: userId }
        });

        return {
            success: true,
            data: {
                ...userData,
                documentacion: docs
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function updateKYCStatus(userId: string, status: "VERIFICADO" | "RECHAZADO" | "EN_REVISION", notas?: string) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        await requireRole("ADMIN");
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { kycStatus: status },
            });

            if (status === "VERIFICADO") {
                await tx.proyecto.updateMany({
                    where: { creadoPorId: userId, isDemo: true },
                    data: { isDemo: false, demoExpiresAt: null }
                });
            }

            if (status === "RECHAZADO" || status === "VERIFICADO") {
                await createNotification(
                    userId,
                    status === "VERIFICADO" ? "EXITO" : "ALERTA",
                    `KYC ${status === "VERIFICADO" ? "Verificado" : "Rechazado"}`,
                    notas || `Tu verificación ha sido marcada como ${status === "VERIFICADO" ? "VERIFICADO" : "RECHAZADO"}.`,
                    "/dashboard/profile",
                    true // Send Email
                );
            }
        });

        revalidatePath("/dashboard/kyc");

        try {
            const { getPusherServer, PUSHER_CHANNELS, EVENTS } = await import("@/lib/pusher");
            const pusher = getPusherServer();
            if (pusher) {
                await pusher.trigger(
                    PUSHER_CHANNELS.getUserChannel(userId),
                    EVENTS.USER_UPDATED,
                    { userId, kycStatus: status }
                );
            }
        } catch (error) {
            console.error("Failed to trigger session sync event:", error);
        }

        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function uploadKYCDoc(userId: string, docUrl: string, docType: string) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        const user = await requireAuth();
        if (user.id !== userId) {
            return { success: false, error: "No puedes subir documentos para otro usuario" };
        }

        await prisma.$transaction(async (tx) => {
            await tx.documentacion.deleteMany({
                where: {
                    usuarioId: userId,
                    tipo: docType
                }
            });

            await tx.documentacion.create({
                data: {
                    usuarioId: userId,
                    tipo: docType,
                    archivoUrl: docUrl,
                    estado: "PENDIENTE",
                }
            });

            await tx.user.update({
                where: { id: userId },
                data: { kycStatus: "EN_REVISION" }
            });
        });

        revalidatePath("/dashboard/mi-perfil/kyc");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteKYCDoc(userId: string, docType: string) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        const user = await requireAuth();
        if (user.id !== userId) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.documentacion.deleteMany({
            where: {
                usuarioId: userId,
                tipo: docType
            }
        });

        const count = await prisma.documentacion.count({
            where: { usuarioId: userId }
        });

        if (count === 0) {
            await prisma.user.update({
                where: { id: userId },
                data: { kycStatus: "PENDIENTE" }
            });
        }

        revalidatePath("/dashboard/mi-perfil/kyc");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function uploadProjectDoc(projectId: string, docUrl: string, docType: string) {
    try {
        const idParsed = idSchema.safeParse(projectId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        await requireProjectOwnership(projectId);

        await prisma.documentacion.create({
            data: {
                proyectoId: projectId,
                tipo: docType,
                archivoUrl: docUrl,
                estado: "PENDIENTE",
            }
        });

        const project = await prisma.proyecto.findUnique({ where: { id: projectId } });
        if (project && project.documentacionEstado === 'PENDIENTE') {
            await prisma.proyecto.update({
                where: { id: projectId },
                data: { documentacionEstado: "EN_REVISION" }
            });
        }

        revalidatePath(`/dashboard/proyectos/${projectId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function reviewProjectDocs(projectId: string, status: "APROBADO" | "RECHAZADO", notas?: string) {
    try {
        const idParsed = idSchema.safeParse(projectId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        await requireRole("ADMIN");
        const project = await prisma.proyecto.update({
            where: { id: projectId },
            data: {
                documentacionEstado: status,
            }
        });

        // Notify Project Owner
        if (project.creadoPorId) {
            await createNotification(
                project.creadoPorId,
                status === "APROBADO" ? "EXITO" : "ALERTA",
                `Documentación de Proyecto ${status === "APROBADO" ? "Aprobada" : "Rechazada"}`,
                notas || `La documentación de tu proyecto "${project.nombre}" ha sido ${status === "APROBADO" ? "aprobada" : "rechazada"}.`,
                `/dashboard/proyectos/${projectId}/documentacion`,
                true
            );
        }

        revalidatePath(`/dashboard/proyectos/${projectId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function isKycVerifiedOrDemoActive() {
    try {
        const user = await requireAuth();

        if (user.role === "ADMIN") return true;
        if (user.kycStatus === "VERIFICADO") return true;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { demoEndsAt: true }
        });

        if (dbUser?.demoEndsAt) {
            const now = new Date();
            const demoEndsAt = new Date(dbUser.demoEndsAt);
            if (now < demoEndsAt) return true;
        }

        return false;
    } catch (error) {
        return false;
    }
}
