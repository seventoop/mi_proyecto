import { requireAnyRole } from "@/lib/guards";
interface AiTaskPayload {
    agentId: string;
    flowExecutionId?: string;
    inputPayload: any;
}

/**
 * AI Gateway Interno - Módulo MOCK para la Fase 1
 * Si la feature flag FEATURE_FLAG_PAPERCLIP es 'false', solo simula la creación de tarea
 * y no persiste nada en la base de datos (incluso si estuviera en true, en Fase 1 no está implementado).
 */
export async function dispatchAiTask(orgId: string, payload: AiTaskPayload) {
    // 1. Validación de Roles y Seguridad
    await requireAnyRole(["ADMIN", "SUPERADMIN"]);

    const isPaperclipEnabled = process.env.FEATURE_FLAG_PAPERCLIP === "true";

    // 2. Mocking AI Task local (Pendiente)
    // Asumiremos que el requester es el usuario actual. Por simplicidad en esta fase mock, 
    // pasaremos un ID genérico o fallaremos graciosamente si se requiere sesión.
    // Esto se adaptará en Fase 2.
    
    console.log("[AI Gateway] Dispatching AI Task:", { orgId, payload });

    if (!isPaperclipEnabled) {
        console.log("[AI Gateway] Paperclip está desactivado. Simulando creación de tarea.");
        return {
            success: true,
            taskId: `mock_task_${crypto.randomUUID()}`,
            status: "draft_mode",
            message: "La tarea se registró como borrador (Feature Flag desactivada)"
        };
    }

    // Lógica futura de conexión a Paperclip:
    // const response = await fetch(`${process.env.PAPERCLIP_API_URL}/api/v1/tasks`, { ... })

    throw new Error("Conexión a Paperclip no implementada en Fase 1.");
}
