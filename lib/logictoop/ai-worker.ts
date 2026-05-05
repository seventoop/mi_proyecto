import { db } from "@/lib/db";
import { recordAiEvent } from "./ai-events";

interface DryRunParams {
    taskId: string;
    actorUserId: string;
    actorRole: string;
    actorOrgId: string | null;
}

/**
 * Worker Dry-Run Manual - Fase 4A
 * Simula el post-procesamiento de una tarea aprobada sin ejecutar side-effects reales.
 * Reservado para SUPERADMIN en esta fase de validación técnica.
 */
export async function runApprovedAiTaskDryRun(params: DryRunParams) {
    const { taskId, actorUserId, actorRole, actorOrgId } = params;

    // 1. Validación de Rol (Restricción Fase 4A: Solo SUPERADMIN)
    if (actorRole !== "SUPERADMIN") {
        throw new Error("Acción reservada exclusivamente para SUPERADMIN en esta fase.");
    }

    // 2. Feature Flags de Seguridad
    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";
    const isRealConnection = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

    if (!isCoreEnabled) {
        throw new Error("El core de IA está desactivado.");
    }

    if (isRealConnection) {
        throw new Error("Conexión real con Paperclip detectada. Bloqueando dry-run por seguridad.");
    }

    try {
        // 3. Buscar y Validar Tarea
        const task = await db.logicToopAiTask.findUnique({
            where: { id: taskId },
            include: { agent: true }
        });

        if (!task) {
            throw new Error("Tarea no encontrada.");
        }

        // 4. Tenant Isolation (SUPERADMIN es global, pero validamos existencia)
        // En el futuro, si se abre a ADMIN, se validaría (actorOrgId === task.orgId)

        // 5. Validar Estado Requerido
        if (task.status !== "APPROVED") {
            throw new Error(`La tarea debe estar en estado APPROVED para ejecutar el worker. Estado actual: ${task.status}`);
        }

        console.log(`[AI Worker] Iniciando Dry-Run para tarea: ${taskId}`);

        // 6. Registrar Evento de Inicio
        await recordAiEvent({
            orgId: task.orgId,
            taskId,
            type: "WORKER_DRY_RUN_STARTED",
            actorUserId,
            source: "SYSTEM",
            message: "Iniciando post-procesamiento simulado (Dry-Run)",
            metadata: {
                simulation: "started",
                actorRole
            }
        });

        // 7. Simulación de Lógica de Negocio (SIN SIDE-EFFECTS)
        // Aquí iría el código que en el futuro crea proyectos, envía emails, etc.
        // En Fase 4A, simplemente confirmamos que el flujo técnico es viable.

        // 8. Registrar Evento de Finalización
        await recordAiEvent({
            orgId: task.orgId,
            taskId,
            type: "WORKER_DRY_RUN_COMPLETED",
            actorUserId,
            source: "SYSTEM",
            message: "Dry-run completado exitosamente sin side-effects reales",
            metadata: {
                mode: "dry_run",
                simulation: "success",
                sideEffects: false,
                paperclip: false,
                preservedStatus: "APPROVED"
            }
        });

        console.log(`[AI Worker] Dry-Run completado exitosamente para tarea: ${taskId}`);

        return {
            success: true,
            taskId,
            status: task.status,
            message: "Dry-run completado sin side-effects"
        };

    } catch (error: any) {
        console.error(`[AI Worker] Error en Dry-Run para tarea ${taskId}:`, error);
        
        // Intentar registrar el fallo si tenemos datos mínimos
        if (taskId) {
            try {
                const taskFallback = await db.logicToopAiTask.findUnique({ where: { id: taskId }, select: { orgId: true } });
                if (taskFallback) {
                    await recordAiEvent({
                        orgId: taskFallback.orgId,
                        taskId,
                        type: "WORKER_DRY_RUN_FAILED",
                        actorUserId,
                        source: "SYSTEM",
                        message: `Fallo en dry-run: ${error.message}`,
                        metadata: { error: error.message }
                    });
                }
            } catch (e) {
                // Ignorar fallos en el log de fallos
            }
        }

        return {
            success: false,
            error: error.message || "Error interno en el worker dry-run"
        };
    }
}
