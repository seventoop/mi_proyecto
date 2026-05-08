import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Tipos de eventos para LogicToop AI.
 */
export type AiEventType =
  | "TASK_CREATED"
  | "TASK_PROCESSED_LOCALLY"
  | "TASK_NEEDS_APPROVAL"
  | "TASK_APPROVED"
  | "TASK_REJECTED"
  | "WORKER_DRY_RUN_STARTED"
  | "WORKER_DRY_RUN_COMPLETED"
  | "WORKER_DRY_RUN_FAILED"
  | "FLOW_AI_TASK_CREATED"
  | "FLOW_WAITING_FOR_AI_APPROVAL"
  | "FLOW_AI_TASK_APPROVED"
  | "FLOW_AI_TASK_REJECTED"
  | "FLOW_WAITING_MANUAL_RESUME"
  | "FLOW_AI_RESUME_BLOCKED"
  | "FLOW_MANUAL_RESUME_DRY_RUN_STARTED"
  | "FLOW_MANUAL_RESUME_DRY_RUN_COMPLETED"
  | "FLOW_MANUAL_RESUME_DRY_RUN_BLOCKED"
  | "FLOW_RESUME_PREVIEW_REQUESTED"
  | "FLOW_RESUME_PREVIEW_COMPLETED"
  | "FLOW_RESUME_PREVIEW_BLOCKED"
  | "FLOW_MANUAL_RESUME_STARTED"
  | "FLOW_MANUAL_RESUME_COMPLETED"
  | "FLOW_MANUAL_RESUME_BLOCKED"
  | "ERROR";

/**
 * Fuentes de los eventos.
 */
export type AiEventSource =
  | "GATEWAY"
  | "SERVER_ACTION"
  | "INTERNAL_RUNNER"
  | "SYSTEM";

interface RecordAiEventParams {
  orgId: string;
  taskId: string;
  type: AiEventType;
  actorUserId?: string | null;
  source: AiEventSource;
  message?: string;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}

/**
 * Registra un evento de auditoría enterprise para una tarea de IA.
 * Puede ejecutarse dentro de una transacción Prisma existente.
 */
export async function recordAiEvent(params: RecordAiEventParams) {
  const { orgId, taskId, type, actorUserId, source, message, metadata, tx } = params;

  const client = tx || db;

  try {
    // Sanitización básica: evitar guardar objetos gigantes
    const sanitizedMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {};
    
    // Limitar tamaño de mensaje
    const limitedMessage = message ? message.substring(0, 500) : null;

    return await client.logicToopAiEvent.create({
      data: {
        orgId,
        taskId,
        type,
        actorUserId: actorUserId || null,
        source,
        message: limitedMessage,
        metadata: sanitizedMetadata
      }
    });
  } catch (error) {
    console.error(`[LogicToop AI] Error recording event ${type}:`, error);
    // En esta fase, si falla el evento pero estamos en transacción, 
    // dejamos que falle la transacción para asegurar consistencia.
    if (tx) throw error;
  }
}
