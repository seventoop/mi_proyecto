"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema, phoneSchema } from "@/lib/validations";

// ─── Schemas ───

const profileUpdateSchema = z.object({
    nombre: z.string().min(1, "Nombre requerido").max(100).optional(),
    apellido: z.string().max(100).optional(),
    apodo: z.string().max(50).optional(),
    telefono: phoneSchema.optional().or(z.literal("")),
    direccion: z.string().max(200).optional(),
    bio: z.string().max(1000).optional(),
    avatar: z.string().url("URL de avatar inválida").optional().or(z.literal("")),
    whatsappNumber: phoneSchema.optional().or(z.literal("")),
});

// ─── Mutations ───

export async function updateProfile(userId: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        const parsed = profileUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        await prisma.user.update({
            where: { id: userId },
            data,
        });

        revalidatePath("/dashboard/mi-perfil");
        revalidatePath("/dashboard/developer/mi-perfil");
        return { success: true };
    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Error al actualizar el perfil" };
    }
}
