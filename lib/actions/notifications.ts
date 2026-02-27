"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const idSchema = z.string().cuid();

export async function createNotification(userId: string, tipo: 'INFO' | 'ALERTA' | 'EXITO' | 'ERROR', titulo: string, mensaje: string, linkAccion?: string) {
    try {
        await prisma.notificacion.create({
            data: {
                usuarioId: userId,
                tipo,
                titulo,
                mensaje,
                linkAccion
            }
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al crear notificación" };
    }
}

export async function getNotifications(userId?: string) {
    try {
        const where = userId ? { usuarioId: userId } : {};
        const notificaciones = await prisma.notificacion.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 20
        });
        return { success: true, data: notificaciones };
    } catch (error) {
        return { success: false, error: "Error al obtener notificaciones" };
    }
}

export async function markAsRead(id: string) {
    try {
        await prisma.notificacion.update({
            where: { id },
            data: { leido: true }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function deleteNotification(input: unknown) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        const parsed = idSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "ID inválido" };
        const id = parsed.data;

        const notificacion = await prisma.notificacion.findUnique({ where: { id } });
        if (!notificacion) return { success: false, error: "Notificación no encontrada" };

        if (notificacion.usuarioId !== session.user.id) {
            return { success: false, error: "No tienes permisos" };
        }

        await prisma.notificacion.delete({
            where: { id }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        Sentry.captureException(error);
        console.error("[deleteNotification]", error);
        return { success: false, error: "Error interno" };
    }
}

export async function markAllAsRead() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        await prisma.notificacion.updateMany({
            where: {
                usuarioId: session.user.id,
                leido: false
            },
            data: { leido: true }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        Sentry.captureException(error);
        console.error("[markAllAsRead]", error);
        return { success: false, error: "Error interno" };
    }
}
