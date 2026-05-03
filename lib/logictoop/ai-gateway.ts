import { requireAuth, AuthError } from "@/lib/guards";
import crypto from "crypto";

interface AiTaskPayload {
    agentId: string;
    flowExecutionId?: string;
    inputPayload: any;
}

/**
 * AI Gateway Interno - Fase 2C
 * Orquesta la creación de tareas de IA. En esta fase, valida sesión y tenant, 
 * pero mantiene la persistencia real desactivada hasta la Subfase 2C.2.
 */
export async function dispatchAiTask(orgId: string, payload: AiTaskPayload) {
    // 1. Obtener usuario de la sesión y validar autenticación
    const user = await requireAuth();

    // 2. Validación de Roles (Solo ADMIN y SUPERADMIN por ahora)
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        throw new AuthError("Solo administradores pueden orquestar procesos de IA", 403);
    }

    // 3. Validación de Tenant (Fail-secure)
    if (user.role !== "SUPERADMIN" && user.orgId !== orgId) {
        throw new AuthError("No tienes permisos para esta organización", 403);
    }

    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";
    const isRealConnection = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

    console.log("[AI Gateway] Solicitud de Tarea IA:", { orgId, userId: user.id, agentId: payload.agentId });

    // 4. Lógica de Persistencia (Subfase 2C.2)
    if (!isCoreEnabled) {
        // Modo Mock Seguro (Inerte)
        return {
            success: true,
            taskId: `mock_task_${crypto.randomUUID()}`,
            status: "DRAFT_MODE",
            message: "Tarea simulada correctamente (CORE desactivado)"
        };
    }

    // TODO: En Subfase 2C.2 implementaremos la escritura real en db.logicToopAiTask
    if (isRealConnection) {
        throw new Error("Conexión real con Paperclip no permitida en esta fase del desarrollo.");
    }

    return {
        success: true,
        taskId: `pending_db_${crypto.randomUUID()}`,
        status: "PENDING",
        message: "Tarea validada pero persistencia real pendiente de Subfase 2C.2"
    };
}
