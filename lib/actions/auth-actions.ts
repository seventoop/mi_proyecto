"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError } from "@/lib/guards";

export async function activateDemoMode() {
    try {
        const user = await requireAuth();
        const userId = user.id;

        const userData = await prisma.user.findUnique({
            where: { id: userId },
            select: { demoUsed: true, demoEndsAt: true }
        });

        if (!userData) {
            return { success: false, error: "Usuario no encontrado" };
        }

        const now = new Date();
        const existingDemoEndsAt = userData.demoEndsAt ? new Date(userData.demoEndsAt as any) : null;

        if (userData.demoUsed) {
            if (!existingDemoEndsAt || existingDemoEndsAt < now) {
                return { success: false, error: "Tu periodo de prueba de 48h ha finalizado." };
            }
        }

        if (existingDemoEndsAt && existingDemoEndsAt > now) {
            return { success: true, message: "Modo demo ya se encuentra activo." };
        }

        const demoEndsAt = new Date();
        demoEndsAt.setHours(demoEndsAt.getHours() + 48);

        await prisma.user.update({
            where: { id: userId },
            data: {
                demoEndsAt,
                demoUsed: false
            }
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/developer");
        return { success: true };
    } catch (error: any) {
        return handleGuardError(error);
    }
}
