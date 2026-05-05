import { db } from "@/lib/db";
import { recordAiEvent } from "./ai-events";
import { Prisma } from "@prisma/client";

interface CreateAiTaskFromFlowParams {
  executionId: string;
  orgId: string;
  agentId: string;
  requestedById?: string; // Opcional, el bridge buscará fallback si falta
  inputPayload: any;
}

/**
 * LogicToop Flow -> AI Bridge (Fase 5A - Refactoreado para Seguridad de FK)
 * Permite que una ejecución de flujo cree una tarea de IA para revisión humana.
 */
export async function createAiTaskFromFlow(params: CreateAiTaskFromFlowParams) {
  const { executionId, orgId, agentId, requestedById, inputPayload } = params;

  console.log(`[AI Bridge] Creando tarea de IA desde flujo: ${executionId}`);

  try {
    // 1. Validar Ejecución (Tenant Isolation)
    const execution = await db.logicToopExecution.findFirst({
      where: {
        id: executionId,
        flow: { orgId }
      },
      select: { id: true, flowId: true }
    });

    if (!execution) {
      throw new Error("La ejecución de flujo no existe o no pertenece a la organización");
    }

    // 2. Validar Agente
    const agent = await db.logicToopAiAgent.findFirst({
      where: { id: agentId, orgId, status: "ACTIVE" }
    });

    if (!agent) {
      throw new Error("Agente de IA no encontrado o inactivo para esta organización");
    }

    // 3. Resolución de Usuario Solicitante (Evitar "SYSTEM" por FK Constraint)
    let finalRequestedById: string | null = null;
    let fallbackUsed = false;

    if (requestedById) {
        const user = await db.user.findFirst({
            where: { id: requestedById, orgId }
        });
        if (user) {
            finalRequestedById = user.id;
        }
    }

    // Fallback: Buscar Administrador de la organización
    if (!finalRequestedById) {
        const adminFallback = await db.user.findFirst({
            where: {
                orgId,
                rol: { in: ["SUPERADMIN", "ADMIN"] }
            },
            orderBy: [
                { rol: 'asc' }, // SUPERADMIN antes que ADMIN (alfabético: ADMIN, SUPERADMIN... espera, SUPERADMIN es S, ADMIN es A)
                // En realidad SUPERADMIN es más prioritario pero ADMIN viene antes por orden asc.
                // Usemos orden específico: rol: 'desc' (S > A)
            ]
        });

        // Corregimos prioridad: SUPERADMIN > ADMIN
        const admins = await db.user.findMany({
            where: { orgId, rol: { in: ["SUPERADMIN", "ADMIN"] } },
            select: { id: true, rol: true }
        });
        
        const superAdmin = admins.find(u => u.rol === "SUPERADMIN");
        const anyAdmin = admins.find(u => u.rol === "ADMIN");
        
        finalRequestedById = superAdmin?.id || anyAdmin?.id || null;
        fallbackUsed = true;
    }

    if (!finalRequestedById) {
        throw new Error("No se encontró usuario administrador válido para asignar la tarea IA en esta organización.");
    }

    // 4. Crear Tarea
    const task = await db.logicToopAiTask.create({
      data: {
        orgId,
        agentId,
        executionId,
        requestedById: finalRequestedById,
        inputPayload: inputPayload as Prisma.InputJsonValue,
        status: "PENDING",
        costTokens: 0,
        costEstimated: 0
      }
    });

    // 5. Registrar Eventos Enterprise
    await recordAiEvent({
      orgId,
      taskId: task.id,
      type: "FLOW_AI_TASK_CREATED",
      actorUserId: fallbackUsed ? null : finalRequestedById,
      source: "SYSTEM",
      message: `Tarea IA creada desde ejecución de flujo: ${executionId}`,
      metadata: {
        flowId: execution.flowId,
        executionId,
        agentId,
        mode: "flow_bridge",
        requestedBySource: fallbackUsed ? "org_admin_fallback" : "flow_user"
      }
    });

    await recordAiEvent({
      orgId,
      taskId: task.id,
      type: "FLOW_WAITING_FOR_AI_APPROVAL",
      actorUserId: null,
      source: "SYSTEM",
      message: "Flujo pausado esperando aprobación humana de la tarea IA",
      metadata: {
        status: "PENDING",
        humanApprovalRequired: true
      }
    });

    return {
      success: true,
      taskId: task.id,
      status: task.status
    };

  } catch (error: any) {
    console.error("[AI Bridge] Error creando tarea desde flujo:", error);
    return {
      success: false,
      error: error.message || "Error interno en el bridge de IA"
    };
  }
}
