"use server";

import { db } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { recordAiEvent } from "@/lib/logictoop/ai-events";
import { classifyNodeSafety, getRecommendationForClassification, ResumePreviewResult } from "@/lib/logictoop/ai-resume-preview";
import { evaluateConditionSet } from "@/lib/logictoop/conditions";

/**
 * Obtiene las ejecuciones de flujos que están pausadas por tareas de IA.
 * Filtra por los estados: WAITING_FOR_APPROVAL, AI_APPROVED_WAITING_RESUME, AI_REJECTED.
 */
export async function getAiPausedFlowExecutions(orgId: string) {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") throw new AuthError("No tienes permisos", 403);
    
    // Si no es SUPERADMIN, solo puede ver su propia org
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) {
        return { success: true, data: [] };
    }

    try {
        const executions = await db.logicToopExecution.findMany({
            where: {
                status: {
                    in: ["WAITING_FOR_APPROVAL", "AI_APPROVED_WAITING_RESUME", "AI_REJECTED"]
                },
                // Si pasamos orgId, filtramos por la org del flujo
                flow: orgId ? { orgId } : undefined
            },
            include: {
                flow: {
                    select: {
                        id: true,
                        nombre: true,
                        orgId: true
                    }
                },
                aiTasks: {
                    select: {
                        id: true,
                        status: true,
                        agent: true,
                        requestedBy: {
                            select: {
                                nombre: true,
                                rol: true
                            }
                        },
                        _count: {
                            select: { events: true }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1 // Tomamos la más reciente vinculada
                }
            },
            orderBy: {
                startedAt: "desc"
            }
        });

        return { success: true, data: executions };
    } catch (error) {
        console.error("[LogicToop AI Flow] Error fetching paused executions:", error);
        return { success: false, error: "Error al cargar flujos pausados" };
    }
}

/**
 * Marca un flujo pausado para un resume dry-run (solo auditoría).
 * No reanuda el dispatcher real.
 */
export async function markAiFlowResumeDryRun(executionId: string) {
    const user = await requireAuth();
    if (user.role !== "SUPERADMIN") {
        return { success: false, error: "Solo SUPERADMIN puede marcar resume dry-run" };
    }

    // Validar Feature Flags (simulado desde process.env)
    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";
    const isRealConnection = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

    if (!isCoreEnabled) {
        return { success: false, error: "El núcleo de IA está desactivado" };
    }
    if (isRealConnection) {
        return { success: false, error: "Conexión real activa. Bloqueando acción manual para seguridad." };
    }

    try {
        const execution = await db.logicToopExecution.findUnique({
            where: { id: executionId },
            include: {
                aiTasks: {
                    where: { status: "APPROVED" },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!execution) {
            return { success: false, error: "Ejecución no encontrada" };
        }

        if (execution.status === "WAITING_FOR_APPROVAL") {
            return { success: false, error: "La task aún no fue aprobada." };
        }
        if (execution.status === "AI_REJECTED") {
            return { success: false, error: "El flow fue rechazado por decisión IA." };
        }
        if (execution.status !== "AI_APPROVED_WAITING_RESUME") {
            return { success: false, error: "Estado no elegible para resume dry-run." };
        }

        const task = execution.aiTasks[0];
        if (!task) {
            return { success: false, error: "No se encontró una tarea aprobada vinculada a este flujo." };
        }

        // Verificar idempotencia: buscar si ya existe el evento de completado
        const existingEvent = await db.logicToopAiEvent.findFirst({
            where: {
                taskId: task.id,
                type: "FLOW_MANUAL_RESUME_DRY_RUN_COMPLETED"
            }
        });

        if (existingEvent) {
            return { success: true, alreadyExecuted: true, message: "Dry-run ya registrado previamente." };
        }

        // Registrar eventos enterprise
        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: "FLOW_MANUAL_RESUME_DRY_RUN_STARTED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: "Iniciando simulacro de reanudación manual (Dry-run)"
        });

        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: "FLOW_MANUAL_RESUME_DRY_RUN_COMPLETED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: "Simulacro de reanudación manual completado exitosamente",
            metadata: {
                mode: "manual_resume_dry_run",
                executionId,
                taskId: task.id,
                sideEffects: false,
                autoResume: false,
                dispatcherExecuted: false,
                paperclip: false
            }
        });

        revalidatePath("/dashboard/admin/logictoop/orchestrator/paused-flows");
        
        return { 
            success: true, 
            executionId, 
            taskId: task.id, 
            message: "Resume dry-run registrado con éxito." 
        };

    } catch (error) {
        console.error("[LogicToop AI Flow] Error in resume dry-run:", error);
        return { success: false, error: "Error interno al registrar dry-run" };
    }
}

/**
 * Genera una previsualización técnica del próximo nodo a ejecutar en un flujo pausado.
 * No ejecuta el flow ni altera estados.
 */
export async function getAiFlowResumePreview(executionId: string): Promise<{ success: boolean; data?: ResumePreviewResult; error?: string }> {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") throw new AuthError("No tienes permisos", 403);

    try {
        const execution = await db.logicToopExecution.findUnique({
            where: { id: executionId },
            include: {
                flow: true,
                aiTasks: {
                    where: { status: "APPROVED" },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!execution) {
            return { success: false, error: "Ejecución no encontrada" };
        }

        // Tenant Isolation
        if (user.role !== "SUPERADMIN" && user.orgId !== execution.flow.orgId) {
            return { success: false, error: "No tienes acceso a este flujo" };
        }

        if (execution.status !== "AI_APPROVED_WAITING_RESUME") {
            return { success: false, error: "El flujo no está en estado de espera para reanudación" };
        }

        const task = execution.aiTasks[0];
        if (!task) {
            return { success: false, error: "No se encontró tarea IA aprobada vinculada" };
        }

        // Registrar inicio de preview
        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: "FLOW_RESUME_PREVIEW_REQUESTED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: "Usuario solicitó previsualización de reanudación"
        });

        const actions = Array.isArray(execution.flow.actions) ? (execution.flow.actions as any[]) : [];
        const currentIndex = execution.currentStepIndex || 0;
        
        let nextNode = null;
        let classification: any = "NO_NEXT_NODE";
        let recommendation: any = "NO_NEXT_NODE";
        let message = "El flujo ha llegado al final de su definición.";

        if (currentIndex < actions.length) {
            const node = actions[currentIndex] as any;
            nextNode = {
                uid: node.uid,
                type: node.type,
                label: node.label || node.config?.label || node.type
            };
            classification = classifyNodeSafety(node.type);
            recommendation = getRecommendationForClassification(classification);
            
            if (classification === "SAFE_REVIEW_ONLY") {
                message = `El próximo nodo (${node.type}) es seguro para revisión técnica.`;
            } else if (classification === "UNSAFE_SIDE_EFFECT") {
                message = `ATENCIÓN: El próximo nodo (${node.type}) podría generar efectos secundarios comerciales. Reanudación bloqueada en esta fase.`;
            } else {
                message = `El próximo nodo (${node.type}) es desconocido. Se requiere revisión técnica manual del esquema.`;
            }
        }

        const result: ResumePreviewResult = {
            executionId,
            flowId: execution.flowId,
            status: execution.status,
            currentStepIndex: currentIndex,
            nextNode,
            classification,
            recommendation,
            message
        };

        // Registrar fin de preview con metadata técnica
        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: classification === "UNSAFE_SIDE_EFFECT" ? "FLOW_RESUME_PREVIEW_BLOCKED" : "FLOW_RESUME_PREVIEW_COMPLETED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: classification === "UNSAFE_SIDE_EFFECT" ? "Preview bloqueado por nodo inseguro" : "Preview de reanudación completado",
            metadata: {
                mode: "resume_preview",
                executionId,
                taskId: task.id,
                sideEffects: false,
                classification,
                recommendation,
                nextNodeType: nextNode?.type || null
            }
        });

        return { success: true, data: result };

    } catch (error) {
        console.error("[LogicToop AI Flow] Error in resume preview:", error);
        return { success: false, error: "Error interno al generar preview" };
    }
}

/**
 * Reanudación manual controlada (Phase 7B).
 * Solo avanza si el próximo nodo es seguro (SAFE_REVIEW_ONLY o NO_NEXT_NODE).
 * Bloquea cualquier intento si el próximo nodo tiene efectos secundarios (UNSAFE_SIDE_EFFECT) o es desconocido (UNKNOWN).
 * NO ejecuta `executeFlow` ni `dispatcher`.
 */
export async function controlledManualResumeFlow(executionId: string) {
    const user = await requireAuth();
    if (user.role !== "SUPERADMIN") {
        return { success: false, error: "Solo SUPERADMIN puede ejecutar una reanudación controlada" };
    }

    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";
    const isRealConnection = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

    if (!isCoreEnabled) {
        return { success: false, error: "El núcleo de IA está desactivado" };
    }
    if (isRealConnection) {
        return { success: false, error: "Conexión real activa. Bloqueando acción manual por seguridad." };
    }

    try {
        const execution = await db.logicToopExecution.findUnique({
            where: { id: executionId },
            include: {
                aiTasks: {
                    where: { status: "APPROVED" },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!execution) {
            return { success: false, error: "Ejecución no encontrada" };
        }

        if (execution.status !== "AI_APPROVED_WAITING_RESUME") {
            return { success: false, error: "El flujo no está en estado de espera para reanudación" };
        }

        const task = execution.aiTasks[0];
        if (!task) {
            return { success: false, error: "No se encontró tarea IA aprobada vinculada" };
        }

        // Idempotencia: Verificar si ya se completó una reanudación manual para esta tarea
        const existingEvent = await db.logicToopAiEvent.findFirst({
            where: {
                taskId: task.id,
                type: "FLOW_MANUAL_RESUME_COMPLETED"
            }
        });

        if (existingEvent) {
            return { success: true, alreadyExecuted: true, message: "La reanudación controlada ya fue ejecutada." };
        }

        // Reutilizar el cálculo de preview existente
        const previewRes = await getAiFlowResumePreview(executionId);
        if (!previewRes.success || !previewRes.data) {
            return { success: false, error: previewRes.error || "No se pudo obtener el preview" };
        }

        const { classification } = previewRes.data;

        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: "FLOW_MANUAL_RESUME_STARTED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: "Iniciando reanudación manual controlada",
            metadata: { classification }
        });

        // Validar seguridad
        if (classification === "UNSAFE_SIDE_EFFECT" || classification === "UNKNOWN") {
            await recordAiEvent({
                orgId: task.orgId,
                taskId: task.id,
                type: "FLOW_MANUAL_RESUME_BLOCKED",
                actorUserId: user.id,
                source: "SERVER_ACTION",
                message: `Reanudación bloqueada: El próximo nodo está clasificado como ${classification}.`,
                metadata: {
                    mode: "controlled_resume",
                    classification,
                    blocked: true
                }
            });
            return { success: false, error: `Reanudación bloqueada por nodo inseguro (${classification})` };
        }

        // Si es seguro, actualizar el estado
        let newStatus = "MANUALLY_RESUMED_SAFE_REVIEW";
        if (classification === "NO_NEXT_NODE") {
            newStatus = "COMPLETED_SAFE";
        }

        await db.logicToopExecution.update({
            where: { id: execution.id },
            data: { status: newStatus }
        });

        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: "FLOW_MANUAL_RESUME_COMPLETED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: "Reanudación manual controlada completada exitosamente",
            metadata: {
                mode: "controlled_resume",
                executionId,
                taskId: task.id,
                sideEffects: false,
                classification,
                newStatus,
                dispatcherExecuted: false
            }
        });

        revalidatePath("/dashboard/admin/logictoop/orchestrator/paused-flows");
        return { success: true, message: "Reanudación controlada completada exitosamente." };

    } catch (error) {
        console.error("[LogicToop AI Flow] Error in controlled manual resume:", error);
        return { success: false, error: "Error interno al procesar reanudación controlada" };
    }
}

/**
 * Ejecuta un único paso seguro de forma controlada (Fase 7C).
 * Solo permite nodos clasificados como SAFE_EXECUTABLE_NO_SIDE_EFFECT.
 * NO llama al dispatcher. NO ejecuta una cadena de nodos.
 */
export async function executeSafeOneStepResume(executionId: string) {
    const user = await requireAuth();
    if (user.role !== "SUPERADMIN") {
        return { success: false, error: "Solo SUPERADMIN puede ejecutar un paso seguro manual" };
    }

    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";
    const isRealConnection = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

    if (!isCoreEnabled) {
        return { success: false, error: "El núcleo de IA está desactivado" };
    }
    if (isRealConnection) {
        return { success: false, error: "Conexión real activa. Bloqueando acción manual por seguridad." };
    }

    try {
        const execution = await db.logicToopExecution.findUnique({
            where: { id: executionId },
            include: {
                flow: true,
                aiTasks: {
                    where: { status: "APPROVED" },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!execution) return { success: false, error: "Ejecución no encontrada" };

        if (execution.status !== "MANUALLY_RESUMED_SAFE_REVIEW" && execution.status !== "AI_APPROVED_WAITING_RESUME") {
            return { success: false, error: "Estado no elegible para ejecución de paso seguro" };
        }

        const task = execution.aiTasks[0];
        if (!task) return { success: false, error: "No se encontró tarea IA aprobada" };

        const previewRes = await getAiFlowResumePreview(executionId);
        if (!previewRes.success || !previewRes.data) {
            return { success: false, error: previewRes.error || "Error al obtener preview" };
        }

        const { classification, nextNode } = previewRes.data;

        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: "FLOW_SAFE_STEP_STARTED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: "Iniciando ejecución de un paso seguro",
            metadata: { classification, nodeType: nextNode?.type }
        });

        if (classification === "UNSAFE_SIDE_EFFECT" || classification === "UNKNOWN") {
            await recordAiEvent({
                orgId: task.orgId,
                taskId: task.id,
                type: "FLOW_SAFE_STEP_BLOCKED",
                actorUserId: user.id,
                source: "SERVER_ACTION",
                message: `Paso bloqueado: El nodo es ${classification}.`,
                metadata: { blocked: true }
            });
            return { success: false, error: `Bloqueado por nodo inseguro (${classification})` };
        }

        if (classification === "SAFE_REVIEW_ONLY") {
            await recordAiEvent({
                orgId: task.orgId,
                taskId: task.id,
                type: "FLOW_SAFE_STEP_BLOCKED",
                actorUserId: user.id,
                source: "SERVER_ACTION",
                message: "Paso bloqueado: El nodo es solo de revisión y no debe re-ejecutarse activamente aquí.",
                metadata: { blocked: true }
            });
            return { success: false, error: "El nodo actual es solo de revisión técnica" };
        }

        if (classification === "NO_NEXT_NODE") {
            await db.logicToopExecution.update({
                where: { id: execution.id },
                data: { status: "COMPLETED_SAFE" }
            });
            await recordAiEvent({
                orgId: task.orgId,
                taskId: task.id,
                type: "FLOW_SAFE_STEP_COMPLETED",
                actorUserId: user.id,
                source: "SERVER_ACTION",
                message: "Flujo cerrado de forma segura (sin más nodos)",
                metadata: { newStatus: "COMPLETED_SAFE", nodeHandlerExecuted: false }
            });
            revalidatePath("/dashboard/admin/logictoop/orchestrator/paused-flows");
            return { success: true, message: "Flujo completado sin más nodos." };
        }

        // --- SAFE_EXECUTABLE_NO_SIDE_EFFECT ---
        const actions = Array.isArray(execution.flow.actions) ? (execution.flow.actions as any[]) : [];
        const currentIndex = execution.currentStepIndex || 0;
        const node = actions[currentIndex];
        const payload = typeof execution.triggerPayload === 'object' ? execution.triggerPayload : {};
        
        let nextIndex = currentIndex + 1;
        let stepStatus = "SUCCESS";
        let newExecutionStatus = "PAUSED_AFTER_SAFE_STEP";
        let resumeAt = execution.resumeAt;
        let handlerExecuted = false;

        const stepLog: any = {
            action: node.type,
            uid: node.uid,
            startedAt: new Date().toISOString(),
            status: "RUNNING",
            details: {}
        };

        // Procesamiento específico sin llamar a handler completos de DB
        if (node.type === "WAIT" || node.type === "DELAY") {
            const waitMinutes = Number(node.config?.minutes) || 30;
            resumeAt = new Date();
            resumeAt.setMinutes(resumeAt.getMinutes() + waitMinutes);
            stepLog.status = "WAITING";
            stepLog.details = { resumeAt, minutes: waitMinutes };
            newExecutionStatus = "WAITING"; // Compatibilidad con dispatcher
            handlerExecuted = false; // Emulamos sin llamar al node handler real
            const candidateNext = node.next || null;
            nextIndex = candidateNext ? actions.findIndex((a: any) => a.uid === candidateNext) : currentIndex + 1;
        } 
        else if (node.type === "CONDITION") {
            const isTrue = evaluateConditionSet(node.conditions || [], payload);
            stepLog.status = isTrue ? "TRUE" : "FALSE";
            handlerExecuted = true; // El evaluador es determinista y no muta DB
            const branchTarget = isTrue ? node.nextTrue : node.nextFalse;
            if (branchTarget) {
                const targetIndex = actions.findIndex((a: any) => a.uid === branchTarget);
                nextIndex = targetIndex !== -1 ? targetIndex : actions.length;
            } else {
                nextIndex = currentIndex + 1;
            }
        }
        else if (node.type === "INTERNAL_NOTE") {
            stepLog.status = "SUCCESS";
            stepLog.details = { note: node.config?.note || "Nota interna registrada" };
            const candidateNext = node.next || null;
            nextIndex = candidateNext ? actions.findIndex((a: any) => a.uid === candidateNext) : currentIndex + 1;
        }
        else {
            // Default safe advance (sin ejecutar nada)
            stepLog.status = "SKIPPED_SAFE";
            stepLog.details = { message: "Avanzado de forma segura sin ejecutar handler" };
            const candidateNext = node.next || null;
            nextIndex = candidateNext ? actions.findIndex((a: any) => a.uid === candidateNext) : currentIndex + 1;
        }

        stepLog.finishedAt = new Date().toISOString();

        if (nextIndex >= actions.length || nextIndex === -1) {
            newExecutionStatus = "COMPLETED_SAFE";
            nextIndex = actions.length; // Final
        }

        const currentLogs = Array.isArray(execution.logs) ? execution.logs : [];
        const newLogs = [...currentLogs, stepLog];

        await db.logicToopExecution.update({
            where: { id: execution.id },
            data: { 
                currentStepIndex: nextIndex,
                logs: newLogs,
                status: newExecutionStatus,
                resumeAt: resumeAt
            }
        });

        await recordAiEvent({
            orgId: task.orgId,
            taskId: task.id,
            type: "FLOW_SAFE_STEP_COMPLETED",
            actorUserId: user.id,
            source: "SERVER_ACTION",
            message: `Paso seguro ejecutado: ${node.type}`,
            metadata: {
                mode: "safe_one_step_resume",
                executionId,
                taskId: task.id,
                sideEffects: false,
                dispatcherExecuted: false,
                nodeHandlerExecuted: handlerExecuted,
                nodeType: node.type,
                nodeUid: node.uid,
                previousStepIndex: currentIndex,
                nextStepIndex: nextIndex,
                previousStatus: execution.status,
                nextStatus: newExecutionStatus,
                paperclip: false
            }
        });

        revalidatePath("/dashboard/admin/logictoop/orchestrator/paused-flows");
        return { success: true, message: `Paso ${node.type} ejecutado exitosamente.` };

    } catch (error) {
        console.error("[LogicToop AI Flow] Error in safe step:", error);
        return { success: false, error: "Error interno al procesar paso seguro" };
    }
}


