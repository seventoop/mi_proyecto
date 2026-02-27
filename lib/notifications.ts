import prisma from "@/lib/db";

export type NotificationType = "INFO" | "ALERTA" | "EXITO" | "ERROR";

interface CreateNotificationParams {
    usuarioId: string;
    tipo: NotificationType;
    titulo: string;
    mensaje: string;
    linkAccion?: string;
}

export async function createNotification({
    usuarioId,
    tipo,
    titulo,
    mensaje,
    linkAccion
}: CreateNotificationParams) {
    try {
        const notification = await prisma.notificacion.create({
            data: {
                usuarioId,
                tipo,
                titulo,
                mensaje,
                linkAccion,
                leido: false
            }
        });
        return notification;
    } catch (error) {
        console.error("[CREATE_NOTIFICATION_ERROR]", error);
        return null;
    }
}
