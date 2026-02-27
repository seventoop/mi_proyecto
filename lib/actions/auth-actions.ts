"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function activateDemoMode() {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, error: "No autorizado" };
        }

        const users: any[] = await prisma.$queryRaw`
            SELECT "demoUsed", "demoEndsAt" FROM users WHERE id = ${userId}
        `;
        const user = users[0];

        if (!user) {
            return { success: false, error: "Usuario no encontrado" };
        }

        const now = new Date();
        const existingDemoEndsAt = user.demoEndsAt ? new Date(user.demoEndsAt as any) : null;

        if ((user as any).demoUsed) {
            // Check if they actually have an active date. If they have a project but the date is active, they can still create more.
            // But if the date is passed, they are truly used up.
            if (!existingDemoEndsAt || existingDemoEndsAt < now) {
                return { success: false, error: "Tu periodo de prueba de 48h ha finalizado." };
            }
        }

        if (existingDemoEndsAt && existingDemoEndsAt > now) {
            return { success: true, message: "Modo demo ya se encuentra activo." };
        }

        const demoEndsAt = new Date();
        demoEndsAt.setHours(demoEndsAt.getHours() + 48);

        await prisma.$executeRaw`
            UPDATE users 
            SET "demoEndsAt" = ${demoEndsAt}, "demoUsed" = false 
            WHERE id = ${userId}
        `;

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/developer");
        return { success: true };
    } catch (error: any) {
        console.error("Error activating demo mode:", error);
        return {
            success: false,
            error: `Error al activar modo demo: ${error.message || "Error desconocido"}`
        };
    }
}
