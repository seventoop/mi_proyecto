"use server";

import { db } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/guards";

/**
 * Obtiene los agentes de IA registrados para una organización.
 */
export async function getAiAgents(orgId: string) {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") throw new AuthError("No tienes permisos de administrador", 403);
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) throw new AuthError("No tienes acceso a esta organización", 403);

    if (process.env.FEATURE_FLAG_LOGICTOOP_AI_UI !== "true") {
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
 * Obtiene tareas que requieren aprobación humana.
 */
export async function getPendingApprovals(orgId: string) {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") throw new AuthError("No tienes permisos de administrador", 403);
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) throw new AuthError("No tienes acceso a esta organización", 403);

    const isUiEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_UI === "true";
    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";

    if (!isUiEnabled || !isCoreEnabled) {
        return { success: true, data: [] };
    }

    try {
        const tasks = await db.logicToopAiTask.findMany({
            where: { 
                orgId, 
                status: "NEEDS_APPROVAL" 
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
        console.error("[LogicToop AI] Error fetching pending approvals:", error);
        return { success: false, error: "Error al cargar aprobaciones" };
    }
}

/**
 * Rechaza una tarea de IA y registra el motivo.
 */
export async function rejectAiTask(taskId: string, comments: string) {
    const user = await requireAuth();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        throw new AuthError("Solo administradores pueden rechazar tareas", 403);
    }

    // 1. Validar Flag de Core
    if (process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE !== "true") {
        return { success: false, error: "El motor de IA está desactivado (CORE=false)" };
    }

    try {
        // 2. Validar que la tarea exista y pertenezca a la organización (Tenant Isolation)
        // SUPERADMIN puede saltarse la validación de orgId si fuera necesario, 
        // pero por consistencia validamos contra el orgId de la tarea.
        const existingTask = await db.logicToopAiTask.findFirst({
            where: {
                id: taskId,
                ...(user.role !== "SUPERADMIN" ? { orgId: user.orgId as string } : {})
            }
        });

        if (!existingTask) {
            return { success: false, error: "Tarea no encontrada o no pertenece a tu organización" };
        }

        return await db.$transaction(async (tx) => {
            // 3. Actualizar estado de la tarea
            const task = await tx.logicToopAiTask.update({
                where: { id: taskId },
                data: { status: "REJECTED" }
            });

            // 4. Registrar la aprobación como rechazo
            await tx.logicToopAiApproval.create({
                data: {
                    taskId,
                    approvedById: user.id,
                    comments,
                    actionTaken: "REJECTED"
                }
            });

            return { success: true, taskId: task.id };
        });
    } catch (error) {
        console.error("[LogicToop AI] Error rejecting task:", error);
        return { success: false, error: "Error al rechazar tarea" };
    }
}
