"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProfile(userId: string, data: any) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                nombre: data.nombre,
                apellido: data.apellido,
                apodo: data.apodo,
                telefono: data.telefono,
                direccion: data.direccion,
                bio: data.bio,
                avatar: data.avatar,
                whatsappNumber: data.whatsappNumber,
            },
        });

        revalidatePath("/dashboard/developer/mi-perfil");
        return { success: true };
    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Error al actualizar el perfil" };
    }
}
