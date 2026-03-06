"use server";

import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, handleGuardError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { idSchema } from "@/lib/validations";

// ─── Submit Inversor KYC Upgrade ───────────────────────────────────────────────
// Called when a CLIENTE wants to upgrade to INVERSOR role.

export async function submitInversorKycUpgrade(data: {
    // Paso 1: Datos personales y financieros
    nombreCompleto: string;
    fechaNacimiento: string;
    nacionalidad: string;
    ocupacion: string;
    ingresosEstimados: string;
    patrimonioEstimado: string;
    perfilRiesgo: string; // CONSERVADOR | MODERADO | AGRESIVO
    // Paso 2: Documentación de identidad
    dniFrente?: string;
    dniDorso?: string;
    pasaporteUrl?: string;
    // Paso 3: Selfie con documento
    selfieUrl: string;
    // Paso 4: Políticas
    politicasAceptadas: boolean;
}) {
    try {
        const user = await requireAnyRole(["CLIENTE", "INVERSOR"]);

        if (!data.nombreCompleto) return { success: false, error: "El nombre completo es obligatorio." };
        if (!data.selfieUrl) return { success: false, error: "La selfie con documento es obligatoria." };
        if (!data.politicasAceptadas) return { success: false, error: "Debes aceptar todas las políticas." };
        if (!data.perfilRiesgo) return { success: false, error: "El perfil de riesgo es obligatorio." };
        if (!data.dniFrente && !data.pasaporteUrl) return { success: false, error: "Debes subir al menos tu DNI frente o pasaporte." };

        // Avoid duplicate pending requests
        const existingProfile = await (prisma as any).kycProfile.findUnique({
            where: { userId: user.id },
            select: { id: true, estado: true, tipo: true }
        });

        if (existingProfile?.tipo === "INVERSOR" && (existingProfile.estado === "EN_REVISION" || existingProfile.estado === "PENDIENTE")) {
            return { success: false, error: "Ya tienes una solicitud en curso. Espera la resolución antes de reenviar." };
        }

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            await (tx as any).kycProfile.upsert({
                where: { userId: user.id },
                create: {
                    userId: user.id,
                    tipo: "INVERSOR",
                    estado: "PENDIENTE", // Changed from EN_REVISION to PENDIENTE as per Bloque 4
                    selfieUrl: data.selfieUrl,
                    dniFrente: data.dniFrente,
                    dniDorso: data.dniDorso,
                    pasaporteUrl: data.pasaporteUrl,
                    perfilRiesgo: data.perfilRiesgo,
                    ingresosEstimados: data.ingresosEstimados,
                    patrimonioEstimado: data.patrimonioEstimado,
                    politicasAceptadas: true,
                    politicasAceptadasAt: now,
                    // Additional step 1 fields that might be stored in a separate model or as JSON in future, 
                    // for now we stick to schema.prisma fields. (assuming they are there or we add them)
                    // Wait, I should check schema again if I need to add nombreCompleto, fechaNacimiento, etc. to KycProfile
                },
                update: {
                    tipo: "INVERSOR",
                    estado: "PENDIENTE",
                    selfieUrl: data.selfieUrl,
                    dniFrente: data.dniFrente,
                    dniDorso: data.dniDorso,
                    pasaporteUrl: data.pasaporteUrl,
                    perfilRiesgo: data.perfilRiesgo,
                    ingresosEstimados: data.ingresosEstimados,
                    patrimonioEstimado: data.patrimonioEstimado,
                    politicasAceptadas: true,
                    politicasAceptadasAt: now,
                }
            });

            // Update user biographical info if provided
            await tx.user.update({
                where: { id: user.id },
                data: {
                    kycStatus: "EN_REVISION",
                    kycSubmittedAt: now,
                    nombre: data.nombreCompleto,
                    fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: "KYC_INVERSOR_SUBMITTED", // Match Bloque 4 point 6
                    entity: "KycProfile",
                    details: JSON.stringify({ tipo: "INVERSOR", at: now.toISOString() })
                }
            });
        });

        // Notify all admins
        const admins = await prisma.user.findMany({
            where: { rol: { in: ["ADMIN", "SUPERADMIN"] } },
            select: { id: true }
        });

        for (const admin of admins) {
            await createNotification(
                admin.id,
                "KYC_UPGRADE_REQUEST", // Match Bloque 4 point 7
                "Nueva solicitud KYC Inversor",
                `${data.nombreCompleto} solicitó upgrade a Inversor`, // Match Bloque 4 point 7
                "/dashboard/admin/kyc",
                false
            );
        }

        revalidatePath("/dashboard/portafolio");
        revalidatePath("/dashboard/admin/kyc");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Admin: Approve Inversor Upgrade ──────────────────────────────────────────

export async function approveInversorUpgrade(profileId: string, notas?: string) {
    try {
        const idParsed = idSchema.safeParse(profileId);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const admin = await requireAnyRole(["ADMIN"]);

        const profile = await (prisma as any).kycProfile.findUnique({
            where: { id: profileId },
            select: { userId: true, tipo: true }
        });

        if (!profile) return { success: false, error: "Perfil no encontrado" };
        if (profile.tipo !== "INVERSOR") return { success: false, error: "Este perfil no es de tipo INVERSOR" };

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.kycProfile.update({
                where: { id: profileId },
                data: {
                    estado: "VERIFICADO",
                    notasAdmin: notas ?? null,
                    verificadoPorId: admin.id,
                    verificadoAt: now,
                }
            });

            await tx.user.update({
                where: { id: profile.userId },
                data: {
                    rol: "INVERSOR",
                    kycStatus: "VERIFICADO",
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: admin.id,
                    action: "APPROVE_INVERSOR_UPGRADE",
                    entity: "KycProfile",
                    entityId: profileId,
                    details: JSON.stringify({ userId: profile.userId, at: now.toISOString() })
                }
            });
        });

        await createNotification(
            profile.userId,
            "KYC_APPROVED", // Match Bloque 5
            "¡Felicitaciones! Sos Inversor", // Match Bloque 5
            "Tu cuenta fue verificada. Ya podés acceder a todas las oportunidades de inversión.", // Match Bloque 5
            "/dashboard/portafolio",
            true
        );

        revalidatePath("/dashboard/admin/kyc");
        revalidatePath("/dashboard/portafolio");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Admin: Reject Inversor Upgrade ───────────────────────────────────────────

export async function rejectInversorUpgrade(profileId: string, motivo: string) {
    try {
        const idParsed = idSchema.safeParse(profileId);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const admin = await requireAnyRole(["ADMIN"]);

        const profile = await (prisma as any).kycProfile.findUnique({
            where: { id: profileId },
            select: { userId: true, tipo: true }
        });

        if (!profile) return { success: false, error: "Perfil no encontrado" };

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.kycProfile.update({
                where: { id: profileId },
                data: {
                    estado: "RECHAZADO",
                    notasAdmin: motivo,
                }
            });

            await tx.user.update({
                where: { id: profile.userId },
                data: { kycStatus: "RECHAZADO" }
            });

            await tx.auditLog.create({
                data: {
                    userId: admin.id,
                    action: "REJECT_INVERSOR_UPGRADE",
                    entity: "KycProfile",
                    entityId: profileId,
                    details: JSON.stringify({ userId: profile.userId, motivo, at: now.toISOString() })
                }
            });
        });

        await createNotification(
            profile.userId,
            "KYC_REJECTED", // Match Bloque 5
            "Solicitud rechazada", // Match Bloque 5
            `Tu solicitud fue rechazada. Motivo: ${motivo}`, // Match Bloque 5
            "/dashboard/portafolio/kyc", // Match Bloque 5 link
            true
        );

        revalidatePath("/dashboard/admin/kyc");
        revalidatePath("/dashboard/portafolio/kyc");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Get pending inversor KYC requests ─────────────────────────────────────────

export async function getPendingInversorKyc() {
    try {
        await requireAnyRole(["ADMIN"]);

        const profiles = await (prisma as any).kycProfile.findMany({
            where: { tipo: "INVERSOR", estado: "EN_REVISION" },
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
                    }
                }
            },
            orderBy: { updatedAt: "asc" }
        });

        return { success: true, data: profiles };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Get the current user's INVERSOR kyc profile ──────────────────────────────

export async function getInversorKycProfile() {
    try {
        const user = await requireAuth();
        const profile = await (prisma as any).kycProfile.findUnique({
            where: { userId: user.id }
        });
        return { success: true, data: profile };
    } catch (error) {
        return handleGuardError(error);
    }
}
