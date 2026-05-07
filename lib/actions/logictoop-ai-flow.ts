"use server";

import { db } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { recordAiEvent } from "@/lib/logictoop/ai-events";
import { classifyNodeSafety, getRecommendationForClassification, ResumePreviewResult } from "@/lib/logictoop/ai-resume-preview";

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

