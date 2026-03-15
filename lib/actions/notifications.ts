"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireNotificationOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { getPusherServer, PUSHER_CHANNELS, EVENTS } from "@/lib/pusher";
import { idSchema } from "@/lib/validations";

// ─── Mutations ───

/**
 * STP-P1-6: Create notification with Real-Time trigger via Pusher.
 */
import { sendTransactionalEmail } from "@/lib/mail";

/**
 * STP-P1-6: Create notification with Real-Time trigger via Pusher and optional Email.
 */
export async function createNotification(
    userId: string,
    tipo: 'INFO' | 'ALERTA' | 'EXITO' | 'ERROR' | 'KYC_UPGRADE_REQUEST' | 'KYC_APPROVED' | 'KYC_REJECTED',
    titulo: string,
    mensaje: string,
    linkAccion?: string,
    sendEmail: boolean = false
) {
    try {
        const uParsed = idSchema.safeParse(userId);
        if (!uParsed.success) return { success: false, error: "ID de usuario inválido" };

        const notificacion = await prisma.notificacion.create({
            data: {
                usuarioId: userId,
                tipo,
                titulo,
                mensaje,
                linkAccion,
                leido: false
            }
        });

        // 🚀 1. Trigger Real-Time event on Private Channel
        try {
            const pusher = getPusherServer();
            if (pusher) {
                await pusher.trigger(
                    PUSHER_CHANNELS.getUserChannel(userId),
                    EVENTS.NOTIFICATION_NEW,
                    {
                        id: notificacion.id,
                        titulo: notificacion.titulo,
                        tipo: notificacion.tipo,
                        mensaje: notificacion.mensaje,
                        linkAccion: notificacion.linkAccion,
                        createdAt: notificacion.createdAt
                    }
                );
            }
        } catch (pusherError) {
            console.error("Error triggering Pusher notification:", pusherError);
        }

        // 📧 2. Optional: Send Email
        if (sendEmail) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, nombre: true }
            });

            if (user?.email) {
                await sendTransactionalEmail({
                    to: user.email,
                    subject: `SevenToop: ${titulo}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2>${titulo}</h2>
                            <p>${mensaje}</p>
                            ${linkAccion ? `<p><a href="${process.env.NEXTAUTH_URL}${linkAccion}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver más detalles</a></p>` : ''}
                        </div>
                    `
                });
            }
        }

        return { success: true, data: notificacion };
    } catch (error) {
        console.error("[CREATE_NOTIFICATION_ERROR]", error);
        return { success: false, error: "Error al crear notificación" };
    }
}

export async function getNotifications(userId?: string) {
    try {
        const user = await requireAuth();

        if (userId) {
            const uParsed = idSchema.safeParse(userId);
            if (!uParsed.success) return { success: false, error: "ID de usuario inválido" };

            if (user.id !== userId && user.role !== "ADMIN") {
                return { success: false, error: "No autorizado para ver estas notificaciones" };
            }
        }

        const where = userId ? { usuarioId: userId } : (user.role === "ADMIN" ? {} : { usuarioId: user.id });

        const notificaciones = await prisma.notificacion.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 20
        });
        return { success: true, data: notificaciones };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function markAsRead(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de notificación inválido" };

        await requireNotificationOwnership(id);
        await prisma.notificacion.update({
            where: { id },
            data: { leido: true }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteNotification(input: unknown) {
    try {
        const parsed = idSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "ID inválido" };
        const id = parsed.data;

        await requireNotificationOwnership(id);

        await prisma.notificacion.delete({
            where: { id }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function markAllAsRead() {
    try {
        const user = await requireAuth();

        await prisma.notificacion.updateMany({
            where: {
                usuarioId: user.id,
                leido: false
            },
            data: { leido: true }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
