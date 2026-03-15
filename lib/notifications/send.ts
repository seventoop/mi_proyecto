import prisma from "@/lib/db";
import { getPusherServer, PUSHER_CHANNELS, EVENTS } from "@/lib/pusher";


/**
 * Centrally send real-time notifications via DB + Pusher.
 */
export async function sendNotification({
    userId,
    tipo,
    titulo,
    mensaje,
    linkAccion
}: {
    userId: string;
    tipo: 'INFO' | 'ALERTA' | 'EXITO' | 'ERROR';
    titulo: string;
    mensaje: string;
    linkAccion?: string;
}) {
    try {
        // 1. Create in Database
        const notification = await prisma.notificacion.create({
            data: {
                usuarioId: userId,
                tipo,
                titulo,
                mensaje,
                linkAccion,
                leido: false
            }
        });

        // 2. Trigger real-time event via Pusher (only if configured)
        const pusherServer = getPusherServer();
        if (pusherServer) {
            try {
                const channelName = PUSHER_CHANNELS.getUserChannel(userId);
                await pusherServer.trigger(
                    channelName,
                    EVENTS.NOTIFICATION_NEW,
                    {
                        id: notification.id,
                        titulo,
                        mensaje,
                        tipo,
                        createdAt: notification.createdAt,
                        linkAccion
                    }
                );
            } catch (err) {
                console.warn("[Pusher Trigger Error]:", err);
            }
        }

        return { success: true, data: notification };
    } catch (error) {
        console.error("[SendNotification Error]:", error);
        return { success: false, error };
    }
}
