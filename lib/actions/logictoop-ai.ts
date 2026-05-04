"use server";

import { db } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { internalAiRunner } from "@/lib/logictoop/internal-ai-runner";

/**
 * Obtiene la lista de agentes de IA activos para la organización.
 */
export async function getAiAgents(orgId: string) {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") throw new AuthError("No tienes permisos", 403);
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) {
        return { success: true, data: [] };
    }

    try {
        const agents = await db.logicToopAiAgent.findMany({
            where: { orgId, status: "ACTIVE" },
            orderBy: { name: "asc" }
        });
        return { success: true, data: agents };
    } catch (error) {
        console.error("[LogicToop AI] Error fetching agents:", error);
        return { success: false, error: "Error al cargar agentes" };
    }
}

/**
 * Obtiene tareas de IA registradas para una organización (Fase 2D).
 * Incluye estados diversos para visualización en el dashboard.
 */
export async function getAiTasks(orgId: string) {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") throw new AuthError("No tienes permisos", 403);
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) throw new AuthError("Acceso denegado", 403);

    const isUiEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_UI === "true";
    if (!isUiEnabled) return { success: true, data: [] };

    try {
        const tasks = await db.logicToopAiTask.findMany({
            where: { 
                orgId,
                status: { in: ["PENDING", "NEEDS_APPROVAL", "APPROVED", "REJECTED"] }
            },
            include: {
                agent: true,
                requestedBy: {
                    select: { nombre: true, email: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: tasks };
    } catch (error) {
        console.error("[LogicToop AI] Error fetching tasks:", error);
        return { success: false, error: "Error al cargar tareas" };
    }
}

/**
 * Rechaza una tarea de IA y registra el motivo.
 */
export async function rejectAiTask(taskId: string, comments: string): Promise<{ success: boolean; error?: string; taskId?: string }> {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        throw new AuthError("Solo administradores pueden rechazar tareas", 403);
    }

    if (process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE !== "true") {
        return { success: false, error: "El motor de IA está desactivado (CORE=false)" };
    }

    try {
        const existingTask = await db.logicToopAiTask.findFirst({
            where: {
                id: taskId,
                ...(user.role !== "SUPERADMIN" ? { orgId: user.orgId as string } : {})
            }
        });

        if (!existingTask) {
            return { success: false, error: "Tarea no encontrada o no pertenece a tu organización" };
        }

        const result = await db.$transaction(async (tx) => {
            const task = await tx.logicToopAiTask.update({
                where: { id: taskId },
                data: { status: "REJECTED" }
            });

            await tx.logicToopAiApproval.create({
                data: {
                    taskId,
                    approvedById: user.id,
                    approvedAt: new Date(),
                    comments,
                    actionTaken: "REJECTED"
                }
            });

            return { success: true, taskId: task.id };
        });

        revalidatePath("/dashboard/admin/logictoop/orchestrator/approvals");
        return result;
    } catch (error) {
        console.error("[LogicToop AI] Error rejecting task:", error);
        return { success: false, error: "Error al rechazar tarea" };
    }
}

/**
 * Aprueba una tarea de IA y registra la decisión (Fase 2E.1).
 * IMPORTANTE: En esta fase no se ejecutan side-effects reales.
 */
export async function approveAiTask(taskId: string, comments?: string): Promise<{ success: boolean; error?: string; taskId?: string }> {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        throw new AuthError("Solo administradores pueden aprobar tareas", 403);
    }

    if (process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE !== "true") {
        return { success: false, error: "El motor de IA está desactivado (CORE=false)" };
    }

    try {
        const existingTask = await db.logicToopAiTask.findFirst({
            where: {
                id: taskId,
                ...(user.role !== "SUPERADMIN" ? { orgId: user.orgId as string } : {})
            }
        });

        if (!existingTask) {
            return { success: false, error: "Tarea no encontrada o no pertenece a tu organización" };
        }

        // Validar estados permitidos
        const allowedStatuses = ["PENDING", "NEEDS_APPROVAL"];
        if (!allowedStatuses.includes(existingTask.status)) {
            return { success: false, error: `No se puede aprobar una tarea en estado ${existingTask.status}` };
        }

        const result = await db.$transaction(async (tx) => {
            const task = await tx.logicToopAiTask.update({
                where: { id: taskId },
                data: { status: "APPROVED" }
            });

            await tx.logicToopAiApproval.create({
                data: {
                    taskId,
                    approvedById: user.id,
                    approvedAt: new Date(),
                    comments: comments || "Aprobado sin side-effects (Fase 2E.1)",
                    actionTaken: "APPROVED_NO_SIDE_EFFECTS"
                }
            });

            return { success: true, taskId: task.id };
        });

        revalidatePath("/dashboard/admin/logictoop/orchestrator/approvals");
        return result;
    } catch (error) {
        console.error("[LogicToop AI] Error approving task:", error);
        return { success: false, error: "Error al aprobar tarea" };
    }
}

/**
 * Procesa una tarea localmente (Fase 3A) usando el runner interno.
 * Solo disponible si FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION !== "true".
 */
export async function processAiTaskLocally(taskId: string): Promise<{ success: boolean; error?: string; taskId?: string; status?: string }> {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        throw new AuthError("Solo administradores pueden procesar tareas", 403);
    }

    if (process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE !== "true") {
        return { success: false, error: "El motor de IA está desactivado (CORE=false)" };
    }

    if (process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true") {
        return { success: false, error: "No se puede procesar localmente con la conexión real a Paperclip activa" };
    }

    try {
        // Aislamiento multi-tenant
        const existingTask = await db.logicToopAiTask.findFirst({
            where: {
                id: taskId,
                ...(user.role !== "SUPERADMIN" ? { orgId: user.orgId as string } : {})
            }
        });

        if (!existingTask) {
            return { success: false, error: "Tarea no encontrada o no pertenece a tu organización" };
        }

        if (existingTask.status !== "PENDING") {
            return { success: false, error: `No se puede procesar una tarea en estado ${existingTask.status}` };
        }

        const task = await internalAiRunner.processTaskInternal(taskId);

        revalidatePath("/dashboard/admin/logictoop/orchestrator/approvals");
        return { success: true, taskId: task.id, status: task.status };
    } catch (error) {
        console.error("[LogicToop AI] Error processing task locally:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error al procesar tarea localmente" };
    }
}
