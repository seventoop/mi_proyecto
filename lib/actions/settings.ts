"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError } from "@/lib/guards";
import { z } from "zod";

// ─── Queries ───

export async function getSettings() {
    try {
        const user = await requireAuth();

        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { configuracion: true }
        });

        // Parse JSON or return default
        const config = userData?.configuracion ? JSON.parse(userData.configuracion) : {
            notifications: {
                emailLeads: true,
                emailReservas: true,
                pushSystem: true
            },
            appearance: {
                theme: "system",
                language: "es",
                fontSize: "base"
            },
            privacy: {
                showProfile: true
            }
        };

        return { success: true, data: config };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function updateSettings(newSettings: unknown) {
    try {
        const user = await requireAuth();

        // Validation for generic settings object
        if (typeof newSettings !== "object" || newSettings === null) {
            return { success: false, error: "Configuración inválida" };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                configuracion: JSON.stringify(newSettings),
                updatedAt: new Date()
            }
        });

        revalidatePath("/dashboard/developer/configuracion");
        revalidatePath("/dashboard/configuracion");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
