"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, handleGuardError } from "@/lib/guards";
import { z } from "zod";

// ─── Schemas ───

const configKeySchema = z.string().min(1).max(100).regex(/^[A-Z0-9_a-zA-Z]+$/, "Clave debe ser alfanumérica");
const configValueSchema = z.string().max(10000);

const bulkUpdateSchema = z.record(configKeySchema, configValueSchema);

// ─── System Configuration (Admin Only) ───

export async function getSystemConfig(key: string) {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key },
        });
        return { success: true, value: config?.value || null };
    } catch (error) {
        return { success: false, error: "Error al obtener configuración del sistema" };
    }
}

export async function getAllSystemConfig() {
    try {
        await requireRole("ADMIN");

        const configs = await prisma.systemConfig.findMany();
        const configMap: Record<string, string> = {};
        configs.forEach((c) => {
            configMap[c.key] = c.value;
        });
        return { success: true, data: configMap };
    } catch (error) {
        return handleGuardError(error);
    }
}

/**
 * Updates multiple system configuration keys in a transaction with audit logging.
 */
export async function updateBulkSystemConfig(updates: unknown) {
    try {
        const user = await requireRole("ADMIN");

        const parsed = bulkUpdateSchema.safeParse(updates);
        if (!parsed.success) {
            return { success: false, error: "Datos de configuración inválidos: " + parsed.error.issues[0].message };
        }

        const data = parsed.data;

        await prisma.$transaction(async (tx) => {
            for (const [key, value] of Object.entries(data)) {
                // Upsert each config
                await tx.systemConfig.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value },
                });

                // Audit logging
                await (tx as any).auditLog.create({
                    data: {
                        userId: user.id,
                        action: "UPDATE_CONFIG",
                        entity: "SystemConfig",
                        entityId: key,
                        details: JSON.stringify({ newValue: value }),
                    }
                });
            }
        });

        revalidatePath("/dashboard/configuracion");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateSystemConfig(key: string, value: string) {
    return updateBulkSystemConfig({ [key]: value });
}

// ─── User Configuration (Own user only) ───

export async function getUserConfig() {
    try {
        const user = await requireAuth();

        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { configuracion: true, whatsappNumber: true, aiAgentTone: true, useAiCopilot: true },
        });

        let config = {};
        if (userData?.configuracion) {
            try {
                config = JSON.parse(userData.configuracion);
            } catch (e) {
                // Invalid JSON
            }
        }
        return {
            success: true,
            data: {
                ...config,
                whatsappNumber: userData?.whatsappNumber || "",
                aiAgentTone: userData?.aiAgentTone || "PROFESIONAL",
                useAiCopilot: userData?.useAiCopilot ?? true,
            },
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateUserConfig(newConfig: any) {
    try {
        const user = await requireAuth();

        if (typeof newConfig !== 'object' || newConfig === null) {
            return { success: false, error: "Configuración inválida" };
        }

        const { whatsappNumber, aiAgentTone, useAiCopilot, ...otherConfig } = newConfig;

        // First get existing to merge
        const existing = await getUserConfig();
        const existingData = existing.success && 'data' in existing ? (existing.data as any) : {};
        const merged = { ...(existingData || {}), ...otherConfig };
        delete (merged as any).whatsappNumber;

        await prisma.user.update({
            where: { id: user.id },
            data: {
                configuracion: JSON.stringify(merged),
                whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : undefined,
                aiAgentTone: aiAgentTone !== undefined ? aiAgentTone : undefined,
                useAiCopilot: useAiCopilot !== undefined ? useAiCopilot : undefined,
            },
        });

        revalidatePath("/dashboard/configuracion");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
