"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError } from "@/lib/guards";

export async function deleteUserAccount() {
    try {
        const user = await requireAuth();
        const userId = user.id;

        // Delete the user. Cascades handle associated data:
        // - documentacion (onDelete: Cascade)
        // - tareas (onDelete: Cascade)
        // - reservas (onDelete: Cascade)
        // - historial (onDelete: Cascade)
        // - pagos (onDelete: Cascade)
        // - notificaciones (onDelete: Cascade)

        // Projects are NOT deleted (onDelete: SetNull), so project data remains 
        // but owner becomes anonymous/deleted.

        await prisma.user.delete({
            where: { id: userId }
        });

        // Optional: sign out logic usually handled in frontend after this returns success
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
