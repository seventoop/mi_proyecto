import { db } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/guards";
import crypto from "crypto";

interface AiTaskPayload {
    agentId: string;
    flowExecutionId?: string;
    inputPayload: any;
}

/**
 * AI Gateway Interno - Fase 2C.2
 * Orquesta la creación y persistencia de tareas de IA en las tablas internas.
 */
export async function dispatchAiTask(orgId: string, payload: AiTaskPayload) {
    // 1. Obtener usuario de la sesión y validar autenticación
    const user = await requireAuth();

    // 2. Validación de Roles y Tenant
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        throw new AuthError("Solo administradores pueden orquestar procesos de IA", 403);
    }

    // Tenant Isolation: Asegurar que el orgId coincida con el usuario (salvo SUPERADMIN)
    const targetOrgId = user.role === "SUPERADMIN" ? orgId : (user.orgId as string);
    if (!targetOrgId || (user.role !== "SUPERADMIN" && user.orgId !== orgId)) {
        throw new AuthError("No tienes permisos para esta organización", 403);
    }

    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";
    const isRealConnection = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

    // 3. Validación de Payload y Seguridad
    if (!payload.agentId) throw new Error("agentId es requerido");
    if (!payload.inputPayload || typeof payload.inputPayload !== "object") {
        throw new Error("inputPayload debe ser un objeto válido");
    }

    // Payload Guard: Limitar tamaño a 50KB aproximadamente
    const payloadSize = JSON.stringify(payload.inputPayload).length;
    if (payloadSize > 51200) {
        throw new Error("El tamaño del payload excede el límite permitido (50KB)");
    }

    console.log("[AI Gateway] Procesando Tarea IA:", { targetOrgId, userId: user.id, agentId: payload.agentId });

    // 4. Modo Mock (si el CORE está apagado)
    if (!isCoreEnabled) {
        return {
            success: true,
            taskId: `mock_task_${crypto.randomUUID()}`,
            status: "DRAFT_MODE",
            message: "Tarea simulada correctamente (CORE desactivado)"
        };
    }

    // 5. Bloqueo de conexión real (Fase 2)
    if (isRealConnection) {
        throw new Error("Conexión real con Paperclip no permitida en esta fase del desarrollo.");
    }

    // 6. Persistencia Real en Base de Datos
    try {
        // A. Validar que el agente exista y pertenezca a la organización
        const agent = await db.logicToopAiAgent.findFirst({
            where: { id: payload.agentId, orgId: targetOrgId, status: "ACTIVE" }
        });

        if (!agent) {
            throw new Error("Agente no encontrado o no está activo para esta organización");
        }

        // B. Validar ejecución opcional (Tenant Isolation para ejecuciones)
        if (payload.flowExecutionId) {
            const execution = await db.logicToopExecution.findFirst({
                where: {
                    id: payload.flowExecutionId,
                    flow: {
                        orgId: targetOrgId
                    }
                },
                select: { id: true }
            });

            if (!execution) {
                throw new Error("La ejecución indicada no existe o no pertenece a la organización");
            }
        }

        // C. Crear la tarea
        const task = await db.logicToopAiTask.create({
            data: {
                orgId: targetOrgId,
                agentId: payload.agentId,
                requestedById: user.id,
                inputPayload: payload.inputPayload,
                executionId: payload.flowExecutionId,
                status: "PENDING",
                costTokens: 0,
                costEstimated: 0
            }
        });

        return {
            success: true,
            taskId: task.id,
            status: task.status,
            message: "Tarea registrada exitosamente en la base de datos interna"
        };
    } catch (error: any) {
        console.error("[AI Gateway] Error persistiendo tarea:", error);
        throw new Error(error.message || "Error interno al registrar la tarea de IA");
    }
}
