"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSettings() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { configuracion: true }
        });

        // Parse JSON or return default
        const config = user?.configuracion ? JSON.parse(user.configuracion) : {
            notifications: {
                emailLeads: true,
                emailReservas: true,
                pushSystem: true
            },
            appearance: {
                theme: "system",
                language: "es"
            },
            privacy: {
                showProfile: true
            }
        };

        return { success: true, data: config };
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { success: false, error: "Error al obtener configuración" };
    }
}

export async function updateSettings(newSettings: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                configuracion: JSON.stringify(newSettings),
                updatedAt: new Date()
            }
        });

        revalidatePath("/dashboard/developer/configuracion");
        return { success: true };
    } catch (error) {
        console.error("Error updating settings:", error);
        return { success: false, error: "Error al actualizar configuración" };
    }
}
