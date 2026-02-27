"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function deleteUserAccount() {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, error: "No autorizado" };
        }

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

        return { success: true };
    } catch (error) {
        console.error("Error deleting user account:", error);
        return { success: false, error: "Error al eliminar la cuenta" };
    }
}
