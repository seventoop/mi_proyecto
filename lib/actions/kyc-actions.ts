"use server";

import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, requireRole, handleGuardError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

// ─── Developer-only: fetch current user's KycProfile ───

export async function getKycProfile() {
    try {
        const user = await requireAnyRole(["DESARROLLADOR", "VENDEDOR"]);
        const profile = await prisma.kycProfile.findUnique({
            where: { userId: user.id },
        });
        return { success: true, data: profile };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Developer-only: upsert KycProfile fields ───

export async function saveKycProfile(data: {
    selfieUrl?: string;
    nombrePublico?: string;
    tipoDeveloper?: string;
    yearsExperience?: number;
    proyectosRealizados?: number;
    descripcionProfesional?: string;
    especialidad?: string;
    razonSocial?: string;
    nombreComercial?: string;
    cuitEmpresa?: string;
    direccionOficina?: string;
    ciudad?: string;
    provincia?: string;
    pais?: string;
    telefonoComercial?: string;
    sitioWeb?: string;
    linkedinEmpresa?: string;
    estatutoUrl?: string;
    matriculaUrl?: string;
    constanciaBancariaUrl?: string;
}) {
    try {
        const user = await requireAnyRole(["DESARROLLADOR", "VENDEDOR"]);

        const profile = await prisma.kycProfile.upsert({
            where: { userId: user.id },
            create: { userId: user.id, ...data },
            update: data,
        });

        revalidatePath("/dashboard/developer/mi-perfil/kyc");
        return { success: true, data: profile };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Developer-only: submit for admin review ───

export async function submitKycForReview() {
    try {
        const user = await requireAnyRole(["DESARROLLADOR", "VENDEDOR"]);

        const profile = await prisma.kycProfile.findUnique({
            where: { userId: user.id },
        });

        if (!profile) {
            return { success: false, error: "Perfil KYC no encontrado. Completa los pasos anteriores." };
        }

        if (profile.estado === "EN_REVISION" || profile.estado === "VERIFICADO") {
            return { success: false, error: "Tu solicitud ya está en proceso." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.kycProfile.update({
                where: { userId: user.id },
                data: { estado: "EN_REVISION" },
            });

            await tx.user.update({
                where: { id: user.id },
                data: {
                    kycStatus: "EN_REVISION",
                    kycSubmittedAt: new Date(),
                },
            });
        });

        revalidatePath("/dashboard/developer/mi-perfil/kyc");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Admin-only: fetch pending developer KYC profiles ───

export async function getPendingDeveloperKyc() {
    try {
        await requireRole("ADMIN");

        const profiles = await prisma.kycProfile.findMany({
            where: { estado: "EN_REVISION" },
            include: {
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        rol: true,
                        kycStatus: true,
                        createdAt: true,
                        documentacion: true,
                    },
                },
            },
            orderBy: { updatedAt: "asc" },
            take: 50,
        });

        // Only developer roles
        const developerProfiles = profiles.filter(
            (p) => p.user.rol === "DESARROLLADOR" || p.user.rol === "VENDEDOR"
        );

        return { success: true, data: developerProfiles };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Admin-only: approve or reject a developer KYC profile ───

export async function reviewDeveloperKyc(
    profileId: string,
    action: "APROBAR" | "RECHAZAR",
    notas?: string
) {
    try {
        const admin = await requireRole("ADMIN");

        const profile = await prisma.kycProfile.findUnique({
            where: { id: profileId },
            select: { userId: true, estado: true },
        });

        if (!profile) return { success: false, error: "Perfil no encontrado" };

        const now = new Date();

        if (action === "APROBAR") {
            await prisma.$transaction(async (tx) => {
                await tx.kycProfile.update({
                    where: { id: profileId },
                    data: {
                        estado: "VERIFICADO",
                        notasAdmin: notas || null,
                        verificadoPorId: admin.id,
                        verificadoAt: now,
                    },
                });

                await tx.user.update({
                    where: { id: profile.userId },
                    data: {
                        kycStatus: "APROBADO",
                        developerVerified: true,
                    },
                });

                // Upgrade demo projects to real projects
                await tx.proyecto.updateMany({
                    where: { creadoPorId: profile.userId, isDemo: true },
                    data: { isDemo: false, demoExpiresAt: null },
                });
                // Audit Log
                await tx.auditLog.create({
                    data: {
                        userId: admin.id,
                        action: "APPROVE_KYC",
                        entity: "KycProfile",
                        entityId: profileId,
                        details: JSON.stringify({ userId: profile.userId, status: "VERIFICADO", at: now }),
                    }
                });
            });

            await createNotification(
                profile.userId,
                "EXITO",
                "¡KYC Aprobado! Desarrollador Verificado",
                "Tu verificación como desarrollador ha sido aprobada. Ya puedes publicar proyectos sin restricciones.",
                "/dashboard/developer/mi-perfil/kyc",
                true
            );
        } else {
            await prisma.$transaction(async (tx) => {
                await tx.kycProfile.update({
                    where: { id: profileId },
                    data: {
                        estado: "RECHAZADO",
                        notasAdmin: notas || null,
                    },
                });

                await tx.user.update({
                    where: { id: profile.userId },
                    data: { kycStatus: "RECHAZADO" },
                });

                // Audit Log
                await tx.auditLog.create({
                    data: {
                        userId: admin.id,
                        action: "REJECT_KYC",
                        entity: "KycProfile",
                        entityId: profileId,
                        details: JSON.stringify({ userId: profile.userId, status: "RECHAZADO", reason: notas, at: now }),
                    }
                });
            });

            await createNotification(
                profile.userId,
                "ALERTA",
                "KYC Rechazado",
                notas || "Tu solicitud de verificación ha sido rechazada. Revisa tu documentación y vuelve a intentarlo.",
                "/dashboard/developer/mi-perfil/kyc",
                true
            );
        }

        revalidatePath("/dashboard/admin/kyc");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
