import { NodeDefinition } from "../types";
import { db } from "@/lib/db";

export const notifyInternalNode: NodeDefinition = {
    type: "NOTIFY_INTERNAL",
    label: "Notificación Interna",
    category: "Automation",
    icon: "bell",
    description: "Envía una notificación al dashboard de un usuario.",
    configSchema: [
        { id: "userId", label: "Usuario", type: "select", required: true },
        { id: "title", label: "Título", type: "text", required: true },
        { id: "message", label: "Mensaje", type: "textarea", required: true }
    ],
    handler: async (config, payload, orgId) => {
        const { userId, title, message } = config;
        if (!userId) throw new Error("Falta userId");

        const notification = await db.notificacion.create({
            data: {
                usuarioId: userId,
                tipo: "SISTEMA",
                titulo: title || "Alerta de LogicToop",
                mensaje: message || "Automatización ejecutada."
            }
        });

        return { notificationId: notification.id };
    }
};

export const addAuditLogNode: NodeDefinition = {
    type: "ADD_AUDIT_LOG",
    label: "Log Auditoría",
    category: "Automation",
    icon: "file-text",
    description: "Registra una entrada en el log de auditoría del sistema.",
    configSchema: [
        { id: "action", label: "Acción", type: "text", required: true },
        { id: "details", label: "Detalles", type: "textarea" }
    ],
    handler: async (config, payload, orgId) => {
        const { action, details } = config;
        const entityId = payload.leadId || payload.proyectoId || null;
        const entity = payload.leadId ? "Lead" : payload.proyectoId ? "Proyecto" : "LogicToop";

        await db.auditLog.create({
            data: {
                userId: "SYSTEM",
                action: action || "LOGICTOOP_AUTO_ACTION",
                entity: entity,
                entityId: entityId,
                details: details || `Automatización ejecutada para org: ${orgId}.`,
                ip: "0.0.0.0"
            }
        });

        return { logged: true };
    }
};

export const waitNode: NodeDefinition = {
    type: "WAIT",
    label: "Esperar",
    category: "Wait",
    icon: "clock",
    description: "Pausa el flujo durante un tiempo determinado.",
    configSchema: [
        { id: "minutes", label: "Minutos", type: "number", defaultValue: 30, required: true }
    ],
    handler: async () => {
        // Handled by dispatcher specifically to pause execution
        return { waiting: true };
    }
};
