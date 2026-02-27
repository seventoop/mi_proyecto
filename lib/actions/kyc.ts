"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// KYC for Users
export async function getPendingKYC() {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };

        const users = await prisma.user.findMany({
            where: { kycStatus: { in: ["PENDIENTE", "EN_REVISION"] } },
            include: { documentacion: true },
            orderBy: { createdAt: "desc" },
        } as any);
        return { success: true, data: users };
    } catch (error) {
        return { success: false, error: "Error al obtener usuarios KYC" };
    }
}

export async function getUserKYC(userId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        // Only Admin or the user themselves can see their KYC docs
        if (user.role !== "ADMIN" && user.id !== userId) {
            return { success: false, error: "No autorizado" };
        }

        const users: any[] = await prisma.$queryRaw`
            SELECT "kycStatus", "riskLevel", "demoEndsAt", "demoUsed" FROM users WHERE id = ${userId}
        `;
        const userData = users[0];

        if (!userData) return { success: true, data: null };

        // Fetch documentation separately to avoid relation selection issues with outdated client
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
        return { success: false, error: "Error al obtener estado KYC" };
    }
}

export async function updateKYCStatus(userId: string, status: "VERIFICADO" | "RECHAZADO" | "EN_REVISION", notas?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
        await prisma.$transaction(async (tx) => {
            // Update user status
            await tx.user.update({
                where: { id: userId },
                data: { kycStatus: status },
            });

            // Auto-promote demo projects if verified using raw SQL for bypass
            if (status === "VERIFICADO") {
                await tx.$executeRaw`
                    UPDATE proyectos 
                    SET "isDemo" = false, "demoExpiresAt" = NULL 
                    WHERE "creadoPorId" = ${userId} AND "isDemo" = true
                `;
            }

            // If rejected, maybe create a notification?
            if (status === "RECHAZADO" || status === "VERIFICADO") {
                await tx.notificacion.create({
                    data: {
                        usuarioId: userId,
                        tipo: status === "VERIFICADO" ? "EXITO" : "ALERTA",
                        titulo: `KYC ${status}`,
                        mensaje: notas || `Tu verificación ha sido marcada como ${status}.`,
                        leido: false,
                    }
                });
            }
        });

        revalidatePath("/dashboard/kyc");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar KYC" };
    }
}

export async function uploadKYCDoc(userId: string, docUrl: string, docType: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.id !== userId) return { success: false, error: "No autorizado" };
        await prisma.$transaction(async (tx) => {
            // Delete existing docs of the same type for this user to "replace" them
            await tx.documentacion.deleteMany({
                where: {
                    usuarioId: userId,
                    tipo: docType
                }
            });

            // Create the new one
            await tx.documentacion.create({
                data: {
                    usuarioId: userId,
                    tipo: docType,
                    archivoUrl: docUrl,
                    estado: "PENDIENTE",
                }
            });

            // Always trigger re-evaluation status
            await tx.user.update({
                where: { id: userId },
                data: { kycStatus: "EN_REVISION" }
            });
        });

        revalidatePath("/dashboard/mi-perfil/kyc");
        return { success: true };
    } catch (error) {
        console.error("Error uploading KYC doc:", error);
        return { success: false, error: "Error al subir documento KYC" };
    }
}

export async function deleteKYCDoc(userId: string, docType: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.id !== userId) return { success: false, error: "No autorizado" };
        await prisma.documentacion.deleteMany({
            where: {
                usuarioId: userId,
                tipo: docType
            }
        });

        // re-fetch to see if any are left
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
        return { success: false, error: "Error al eliminar documento" };
    }
}

// Project Tech Documentation
export async function uploadProjectDoc(projectId: string, docUrl: string, docType: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: projectId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }
        await prisma.documentacion.create({
            data: {
                proyectoId: projectId,
                tipo: docType,
                archivoUrl: docUrl,
                estado: "PENDIENTE",
            }
        });

        // Auto-update project status if first doc? Or keep separate.
        const project = await prisma.proyecto.findUnique({ where: { id: projectId } });
        if (project && project.documentacionEstado === 'PENDIENTE') {
            await prisma.proyecto.update({
                where: { id: projectId },
                data: { documentacionEstado: "EN_REVISION" } // Trigger review
            });
        }

        revalidatePath(`/dashboard/proyectos/${projectId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al subir documento técnico" };
    }
}

export async function reviewProjectDocs(projectId: string, status: "APROBADO" | "RECHAZADO", notas?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
        await prisma.proyecto.update({
            where: { id: projectId },
            data: {
                documentacionEstado: status,
                // If approved, maybe move project state forward?
                // estado: status === "APROBADO" ? "PENDIENTE_PAGO" : "RECHAZADO" (Logic depends on specific flow)
            }
        });

        revalidatePath(`/dashboard/proyectos/${projectId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al revisar documentación técnica" };
    }
}

// Helper to check if user can perform sensitive actions (Verified OR in Demo)
export async function isKycVerifiedOrDemoActive() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return false;

        const user = session.user as any;

        // Admins are always allowed
        if (user.role === "ADMIN") return true;

        // Check KYC status
        if (user.kycStatus === "VERIFICADO") return true;

        // Check Demo status using raw SQL to bypass client issues
        const users: any[] = await prisma.$queryRaw`
            SELECT "demoEndsAt" FROM users WHERE id = ${session.user.id}
        `;
        const dbUser = users[0];

        if (dbUser?.demoEndsAt) {
            const now = new Date();
            const demoEndsAt = new Date(dbUser.demoEndsAt);
            if (now < demoEndsAt) return true;
        }

        return false;
    } catch (error) {
        console.error("Error checking KYC/Demo status:", error);
        return false;
    }
}
