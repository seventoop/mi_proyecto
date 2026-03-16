import { db } from "@/lib/db";

/**
 * LogicToop Shared Actions
 * Extracted from dispatcher to be reused by the Worker.
 */

export async function performAction(type: string, config: any, payload: any, orgId: string) {
    switch (type) {
        case "ASSIGN_LEAD":
            return await actionAssignLead(config, payload, orgId);
        case "CREATE_TASK":
            return await actionCreateTask(config, payload, orgId);
        case "NOTIFY_INTERNAL":
            return await actionNotifyInternal(config, payload, orgId);
        case "SEND_WHATSAPP_TEMPLATE":
            return await actionSendWhatsAppTemplate(config, payload, orgId);
        case "SEND_EMAIL_TEMPLATE":
            return await actionSendEmailTemplate(config, payload, orgId);
        case "MOVE_LEAD_STAGE":
            return await actionMoveLeadStage(config, payload, orgId);
        case "ADD_AUDIT_LOG":
            return await actionAddAuditLog(config, payload, orgId);
        case "WAIT":
            return { status: "WAITING_SCHEDULED" }; // Handled specially by dispatcher
        default:
            throw new Error(`Acción desconocida: ${type}`);
    }
}

async function actionAssignLead(config: any, payload: any, orgId: string) {
    const leadId = payload.leadId;
    const userId = config.userId;
    if (!leadId) throw new Error("Payload no contiene leadId");
    if (!userId) throw new Error("Configuración no contiene userId");
    await db.lead.update({ where: { id: leadId }, data: { asignadoAId: userId } });
    return { assignedTo: userId };
}

async function actionCreateTask(config: any, payload: any, orgId: string) {
    const { userId, title, description, daysDiff } = config;
    if (!userId) throw new Error("Configuración no contiene userId");
    if (!title) throw new Error("Configuración no contiene título para la tarea");
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (daysDiff || 1));
    const task = await db.tarea.create({
        data: {
            titulo: title,
            descripcion: description || "Tarea generada automáticamente por LogicToop",
            fechaVencimiento: dueDate,
            prioridad: config.priority || "MEDIA",
            usuarioId: userId,
            leadId: payload.leadId || null,
            proyectoId: payload.proyectoId || null,
            estado: "PENDIENTE"
        }
    });
    return { taskId: task.id };
}

async function actionNotifyInternal(config: any, payload: any, orgId: string) {
    const { userId, title, message, link } = config;
    if (!userId) throw new Error("Configuración no contiene userId");
    const notification = await db.notificacion.create({
        data: {
            usuarioId: userId,
            tipo: "SISTEMA",
            titulo: title || "Alerta de LogicToop",
            mensaje: message || "Automatización ejecutada.",
            linkAccion: link || null
        }
    });
    return { notificationId: notification.id };
}

async function actionSendWhatsAppTemplate(config: any, payload: any, orgId: string) {
    const { templateName, phone, variables } = config;
    const targetPhone = phone || payload.telefono;
    if (!targetPhone) throw new Error("No hay teléfono de destino");
    console.log(`[LogicToop] [WhatsApp STUB] Sending ${templateName} to ${targetPhone}`, variables);
    return { status: "SENT_STUB", target: targetPhone, template: templateName };
}

async function actionSendEmailTemplate(config: any, payload: any, orgId: string) {
    const { subject, body, email } = config;
    const targetEmail = email || payload.email;
    if (!targetEmail) throw new Error("No hay email de destino");
    const { sendTransactionalEmail } = await import("../mail");
    await sendTransactionalEmail({
        to: targetEmail,
        subject: subject || "Notificación de SevenToop",
        text: body || "Hola, tienes una nueva actualización en SevenToop.",
        html: `<p>${body || "Hola, tienes una nueva actualización en SevenToop."}</p>`
    });
    return { status: "SENT", target: targetEmail };
}

async function actionMoveLeadStage(config: any, payload: any, orgId: string) {
    const { stageId } = config;
    const leadId = payload.leadId;
    if (!leadId) throw new Error("Payload no contiene leadId");
    if (!stageId) throw new Error("Configuración no contiene stageId");
    const stage = await db.pipelineEtapa.findFirst({ where: { id: stageId, orgId } });
    if (!stage) throw new Error("Etapa no encontrada o no pertenece a la organización");
    await db.lead.update({ where: { id: leadId, orgId }, data: { etapaId: stageId } });
    return { movedTo: stage.nombre };
}

async function actionAddAuditLog(config: any, payload: any, orgId: string) {
    const { action, details, userId } = config;
    const entityId = payload.leadId || payload.proyectoId || null;
    const entity = payload.leadId ? "Lead" : payload.proyectoId ? "Proyecto" : "LogicToop";
    await db.auditLog.create({
        data: {
            userId: userId || "SYSTEM",
            action: action || "LOGICTOOP_AUTO_ACTION",
            entity: entity,
            entityId: entityId,
            details: details || `Automatización ejecutada para org: ${orgId}. Payload: ${JSON.stringify(payload)}`,
            ip: "0.0.0.0"
        }
    });
    return { logged: true };
}
