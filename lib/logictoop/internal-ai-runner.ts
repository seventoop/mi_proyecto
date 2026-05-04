import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Motor de ejecución de agentes internos (MOCK) para la Fase 3A.
 * Procesa tareas locales sin llamar a APIs externas.
 */
class InternalAiRunner {
    /**
     * Procesa una tarea localmente basada en el rol del agente.
     */
    async processTaskInternal(taskId: string) {
        const task = await db.logicToopAiTask.findUnique({
            where: { id: taskId },
            include: { agent: true }
        });

        if (!task) throw new Error("Tarea no encontrada");
        if (task.status !== "PENDING") throw new Error("Solo se pueden procesar tareas en estado PENDING");
        if (!task.agent) throw new Error("La tarea no tiene un agente asignado");
        if (task.agent.status !== "ACTIVE") throw new Error("El agente asignado está inactivo");

        // Generar output mock basado en el rol del agente
        const outputResult = this.generateMockResult(task.agent.role, task.inputPayload);

        // Actualizar la tarea
        return await db.logicToopAiTask.update({
            where: { id: taskId },
            data: {
                status: "NEEDS_APPROVAL",
                outputResult: outputResult as Prisma.InputJsonValue,
                costTokens: 0,
                costEstimated: 0,
                errorLogs: Prisma.JsonNull
            }
        });
    }

    /**
     * Generador de resultados simulados.
     */
    private generateMockResult(role: string, inputPayload: any) {
        const timestamp = new Date().toLocaleString();

        switch (role) {
            case "QA_OPS":
            case "QA":
                return {
                    summary: "Auditoría local simulada completada",
                    findings: [
                        "Validación de campos obligatorios: OK",
                        "Revisión de consistencia de datos: OK",
                        "Detección de posibles optimizaciones: 2 encontradas"
                    ],
                    recommendation: "Proceder con la siguiente etapa del flujo",
                    mode: "internal_mock_agent",
                    processedAt: timestamp
                };

            case "SALES_ASSISTANT":
                return {
                    summary: "Análisis de oportunidad comercial simulado",
                    score: 85,
                    reasoning: "El lead presenta un perfil de inversión compatible con el proyecto actual",
                    nextSteps: "Contactar vía WhatsApp para coordinar visita",
                    mode: "internal_mock_agent",
                    processedAt: timestamp
                };

            default:
                return {
                    summary: `Procesamiento interno completado para el rol ${role}`,
                    inputReceived: inputPayload,
                    mode: "internal_mock_agent",
                    processedAt: timestamp,
                    note: "Este es un resultado genérico generado por el runner interno."
                };
        }
    }
}

export const internalAiRunner = new InternalAiRunner();
