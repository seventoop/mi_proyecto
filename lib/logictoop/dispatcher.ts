import { db } from "@/lib/db";
// Types are cast to any to avoid issues with potentially unaligned local Prisma client

/**
 * LogicToop V1 Dispatcher
 * Core engine for executing automation flows based on system triggers.
 */

export type LogicToopTrigger = 
    | "NEW_LEAD"
    | "LEAD_NO_RESPONSE"
    | "CUOTA_DUE_SOON"
    | "PROJECT_PUBLISHED"
    | "INVESTOR_INTERESTED";

/**
 * Entry point for system events to trigger LogicToop flows.
 */
import { evaluateConditionSet } from "./conditions";
import { performAction } from "./actions";

/**
 * Entry point for system events to trigger LogicToop flows.
 */
export async function dispatchTrigger(type: LogicToopTrigger, payload: any, orgId: string) {
    console.log(`[LogicToop] Dispatching trigger: ${type} for org: ${orgId}`);

    try {
        const flows = await (db as any).logicToopFlow.findMany({
            where: {
                orgId,
                triggerType: type,
                status: "ACTIVE"
            }
        });

        if (flows.length === 0) {
            console.log(`[LogicToop] No active flows found for trigger ${type}`);
            return;
        }

        for (const flow of flows) {
            await executeFlow(flow, payload);
        }
    } catch (error) {
        console.error(`[LogicToop] Fatal error in dispatcher:`, error);
    }
}

import { nodeRegistry } from "./nodes/nodeRegistry";
import { initNodeRegistry } from "./nodes";

// Initialize registry
initNodeRegistry();

/**
 * Handles execution, supporting branched graphs and linear flows.
 */
export async function executeFlow(flow: any, payload: any, executionId?: string) {
    let execution: any;
    
    if (executionId) {
        execution = await (db as any).logicToopExecution.findUnique({ 
            where: { id: executionId },
            include: { flow: true }
        });
        if (!execution) return;
    } else {
        execution = await (db as any).logicToopExecution.create({
            data: {
                flowId: flow.id,
                triggerPayload: payload,
                status: "RUNNING",
                logs: [],
                currentStepIndex: 0 // In Phase 5, this can represent a Node Index or pointer
            }
        });
    }

    const stepLogs: any[] = Array.isArray(execution.logs) ? execution.logs : [];
    let finalStatus: string = "SUCCESS";
    let finalErrorMessage: string | null = null;
    let resumeAt: Date | null = null;
    let currentIndex = (execution as any).currentStepIndex || 0;
    let iterationGuard = 0; // Prevent infinite loops

    try {
        const actions = Array.isArray((flow as any).actions) ? (flow as any).actions : [];
        if (actions.length === 0) return;

        while (currentIndex < actions.length && iterationGuard < 100) {
            iterationGuard++;
            const node = actions[currentIndex];
            const { type, config, uid } = node;
            
            // 1. Logic for branching vs linear
            let nextIndex: number | null = null;

            // 2. WAIT handling (Stateful Pause)
            if (type === "WAIT") {
                const waitMinutes = Number(config.minutes) || 30;
                resumeAt = new Date();
                resumeAt.setMinutes(resumeAt.getMinutes() + waitMinutes);
                
                stepLogs.push({
                    action: "WAIT",
                    uid: uid,
                    status: "WAITING",
                    details: { resumeAt, minutes: waitMinutes },
                    timestamp: new Date().toISOString()
                });
                
                finalStatus = "WAITING";
                // Identify next step to run when resumed
                const candidateNext = node.next || null;
                currentIndex = candidateNext ? actions.findIndex((a: any) => a.uid === candidateNext) : currentIndex + 1;
                break;
            }

            // 3. CONDITION handling (Branching)
            if (type === "CONDITION") {
                const isTrue = evaluateConditionSet(node.conditions || [], payload);
                stepLogs.push({
                    action: "CONDITION",
                    uid: uid,
                    status: isTrue ? "TRUE" : "FALSE",
                    timestamp: new Date().toISOString()
                });

                const branchTarget = isTrue ? node.nextTrue : node.nextFalse;
                if (branchTarget) {
                    currentIndex = actions.findIndex((a: any) => a.uid === branchTarget);
                    if (currentIndex === -1) break; // End of path
                    continue; // Jump to next node immediately
                } else {
                    // Fallback to linear if no branches defined (Phase 4 compatibility)
                    currentIndex++;
                    continue;
                }
            }

            // 4. ACTION handling via Registry
            const stepLog = {
                action: type,
                uid: uid,
                startedAt: new Date().toISOString(),
                status: "RUNNING" as string,
                details: null as any
            };
            stepLogs.push(stepLog);

            try {
                // TRY REGISTRY FIRST
                const nodeDef = nodeRegistry.get(type);
                let result: any;

                if (nodeDef) {
                    result = await nodeDef.handler(config, payload, flow.orgId);
                } else {
                    // LEGACY FALLBACK
                    result = await performAction(type, config, payload, flow.orgId);
                }

                // AI Result Propagation: if node is an AI node, merge into payload.ai
                if (type.startsWith("AI_") && result) {
                    if (!payload.ai) payload.ai = {};
                    
                    // Specific mapping for well-known AI outputs
                    if (type === "AI_CLASSIFY_LEAD") payload.ai.classification = result;
                    if (type === "AI_SCORE_LEAD") payload.ai.score = result.score;
                    if (type === "AI_SUMMARIZE_LEAD_CONTEXT") payload.ai.summary = result.summary;
                    if (type === "AI_ROUTE_LEAD") payload.ai.route = result.routeTo;
                    
                    // Generic merge for other AI nodes
                    Object.assign(payload.ai, result);
                }

                stepLog.status = "SUCCESS";
                stepLog.details = result;
                
                // Determine next step
                if (node.next) {
                    currentIndex = actions.findIndex((a: any) => a.uid === node.next);
                } else {
                    currentIndex++;
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                const maxRetries = config.maxRetries || 0;

                if (maxRetries > 0) {
                    const { enqueueAction } = await import("./queue");
                    const retryDelay = config.retryDelay || 5;
                    const scheduledAt = new Date();
                    scheduledAt.setMinutes(scheduledAt.getMinutes() + retryDelay);

                    await enqueueAction(execution.id, flow.orgId, { type, config, uid } as any, payload, scheduledAt);
                    
                    stepLog.status = "RETRY_QUEUED";
                    stepLog.details = { error: msg, scheduledAt, maxRetries };
                    
                    finalStatus = "RETRYING";
                    // Point to the next step so worker resumes from there after retry success
                    const candidateNext = node.next || null;
                    currentIndex = candidateNext ? actions.findIndex((a: any) => a.uid === candidateNext) : currentIndex + 1;
                    break;
                } else {
                    stepLog.status = "FAILED";
                    stepLog.details = { error: msg };
                    throw error;
                }
            } finally {
                (stepLog as any).finishedAt = new Date().toISOString();
            }

            if (currentIndex === -1) break;
        }
    } catch (error) {
        if (finalStatus !== "RETRYING" && finalStatus !== "WAITING") {
            finalStatus = "FAILED";
            finalErrorMessage = error instanceof Error ? error.message : String(error);
        }
    } finally {
        await (db as any).logicToopExecution.update({
            where: { id: execution.id },
            data: {
                status: finalStatus,
                logs: stepLogs,
                errorMessage: finalErrorMessage,
                resumeAt: resumeAt,
                currentStepIndex: currentIndex,
                finishedAt: (finalStatus === "SUCCESS" || finalStatus === "FAILED") ? new Date() : null
            }
        });
    }
}

/**
 * ACTION: Assign Lead to a specific user.
 * Expected config: { userId: string }
 */
async function actionAssignLead(config: any, payload: any, orgId: string) {
    const leadId = payload.leadId;
    const userId = config.userId;

    if (!leadId) throw new Error("Payload no contiene leadId");
    if (!userId) throw new Error("Configuración no contiene userId");

    await db.lead.update({
        where: { id: leadId },
        data: { asignadoAId: userId }
    });

    return { assignedTo: userId };
}

/**
 * ACTION: Create a task for a user.
 * Expected config: { userId: string, title: string, description?: string, daysDiff?: number }
 */
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

/**
 * ACTION: Create an internal notification.
 * Expected config: { userId: string, title: string, message: string, link?: string }
 */
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

/**
 * ACTION: Send WhatsApp Template (Stub).
 */
async function actionSendWhatsAppTemplate(config: any, payload: any, orgId: string) {
    const { templateName, phone, variables } = config;
    const targetPhone = phone || payload.telefono;

    if (!targetPhone) throw new Error("No hay teléfono de destino");

    console.log(`[LogicToop] [WhatsApp STUB] Sending ${templateName} to ${targetPhone}`, variables);
    
    // Logic for provider integration would go here.
    return { status: "SENT_STUB", target: targetPhone, template: templateName };
}

/**
 * ACTION: Send Email Template.
 */
async function actionSendEmailTemplate(config: any, payload: any, orgId: string) {
    const { templateId, subject, body, email } = config;
    const targetEmail = email || payload.email;

    if (!targetEmail) throw new Error("No hay email de destino");

    const { sendTransactionalEmail } = await import("@/lib/mail");
    await sendTransactionalEmail({
        to: targetEmail,
        subject: subject || "Notificación de SevenToop",
        text: body || "Hola, tienes una nueva actualización en SevenToop.",
        html: `<p>${body || "Hola, tienes una nueva actualización en SevenToop."}</p>`
    });

    return { status: "SENT", target: targetEmail };
}

/**
 * ACTION: Change Lead Stage.
 */
async function actionMoveLeadStage(config: any, payload: any, orgId: string) {
    const { stageId } = config;
    const leadId = payload.leadId;

    if (!leadId) throw new Error("Payload no contiene leadId");
    if (!stageId) throw new Error("Configuración no contiene stageId");

    // Verify stage belongs to same org
    const stage = await db.pipelineEtapa.findFirst({
        where: { id: stageId, orgId }
    });
    if (!stage) throw new Error("Etapa no encontrada o no pertenece a la organización");

    await db.lead.update({
        where: { id: leadId, orgId },
        data: { etapaId: stageId }
    });

    return { movedTo: stage.nombre };
}

/**
 * ACTION: Add entry to system audit log.
 */
async function actionAddAuditLog(config: any, payload: any, orgId: string) {
    const { action, details, userId } = config;

    // Use entity attributes to store relationship context
    const entityId = payload.leadId || payload.proyectoId || null;
    const entity = payload.leadId ? "Lead" : payload.proyectoId ? "Proyecto" : "LogicToop";

    await db.auditLog.create({
        data: {
            userId: userId || "SYSTEM", // Note: System user must be handled or present
            action: action || "LOGICTOOP_AUTO_ACTION",
            entity: entity,
            entityId: entityId,
            details: details || `Automatización ejecutada para org: ${orgId}. Payload: ${JSON.stringify(payload)}`,
            ip: "0.0.0.0"
        }
    });

    return { logged: true };
}
