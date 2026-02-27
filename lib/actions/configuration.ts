"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- System Configuration (Admin Only) ---

export async function getSystemConfig(key: string) {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key }
        });
        return { success: true, value: config?.value || null };
    } catch (error) {
        return { success: false, error: "Error al obtener configuración del sistema" };
    }
}

export async function getAllSystemConfig() {
    try {
        const configs = await prisma.systemConfig.findMany();
        const configMap: Record<string, string> = {};
        configs.forEach(c => {
            configMap[c.key] = c.value;
        });
        return { success: true, data: configMap };
    } catch (error) {
        return { success: false, error: "Error al obtener configuraciones" };
    }
}

export async function updateSystemConfig(key: string, value: string) {
    try {
        await prisma.systemConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        revalidatePath("/dashboard/configuracion");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar configuración" };
    }
}

// --- User Configuration (All Users) ---

export async function getUserConfig(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { configuracion: true, whatsappNumber: true, aiAgentTone: true, useAiCopilot: true }
        });

        let config = {};
        if (user?.configuracion) {
            try {
                config = JSON.parse(user.configuracion);
            } catch (e) {
                // Invalid JSON, return empty
            }
        }
        return {
            success: true,
            data: {
                ...config,
                whatsappNumber: user?.whatsappNumber || "",
                aiAgentTone: user?.aiAgentTone || "PROFESIONAL",
                useAiCopilot: user?.useAiCopilot ?? true,
            }
        };
    } catch (error) {
        return { success: false, error: "Error al obtener configuración de usuario" };
    }
}

export async function updateUserConfig(userId: string, newConfig: any) {
    try {
        const { whatsappNumber, aiAgentTone, useAiCopilot, ...otherConfig } = newConfig;

        // First get existing to merge
        const existing = await getUserConfig(userId);
        const merged = { ...(existing.data || {}), ...otherConfig };
        delete (merged as any).whatsappNumber; // Remove from JSON if present

        await prisma.user.update({
            where: { id: userId },
            data: {
                configuracion: JSON.stringify(merged),
                whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : undefined,
                aiAgentTone: aiAgentTone !== undefined ? aiAgentTone : undefined,
                useAiCopilot: useAiCopilot !== undefined ? useAiCopilot : undefined
            }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating user config:", error);
        return { success: false, error: "Error al actualizar configuración de usuario" };
    }
}
