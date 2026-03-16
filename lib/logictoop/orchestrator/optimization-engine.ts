import { db } from "@/lib/db";
import { AnalysisFinding } from "./crm-analyzer";

export async function analyzeFlowOptimizations(orgId: string): Promise<AnalysisFinding[]> {
  const findings: AnalysisFinding[] = [];

  // Find all active flows for this org
  const flows = await (db as any).logicToopFlow.findMany({
    where: { orgId, activo: true },
    include: { executions: { take: 20, orderBy: { startedAt: "desc" } } }
  });

  for (const flow of flows) {
    const nodes = flow.actions as any[];
    
    // 1. Retry Optimization
    const failedExecs = flow.executions.filter((e: any) => e.status === "FAILED");
    if (failedExecs.length > 3) {
      const nodesToOptimize = nodes.map((n: any) => ({
        ...n,
        config: { ...n.config, retry: 3 }
      }));
      findings.push({
        type: "RETRY_OPTIMIZATION",
        severity: "WARNING",
        confidence: 0.9,
        sourceFlowId: flow.id,
        title: `Optimización de Reintentos: ${flow.nombre}`,
        description: `Se detectaron fallos recientes en ${failedExecs.length} ejecuciones. Agregar reintentos mejoraría la fiabilidad.`,
        data: { 
          triggerType: flow.triggerType,
          currentRetries: 0, 
          suggestedRetries: 3,
          optimizedNodes: nodesToOptimize
        }
      });
    }

    // 2. Wait Optimization (Response Time)
    if (flow.triggerType === "NEW_LEAD") {
        const hasWait = nodes.some((n: any) => n.type === "WAIT");
        if (!hasWait) {
            const optimizedNodes = [
                { type: "WAIT", config: { duration: "5m" } },
                ...nodes
            ];
            findings.push({
                type: "WAIT_OPTIMIZATION",
                severity: "INFO",
                confidence: 0.8,
                sourceFlowId: flow.id,
                title: `Optimización de Tiempos: ${flow.nombre}`,
                description: "Las respuestas instantáneas pueden parecer robóticas. Considera agregar un breve retraso (WAIT).",
                data: {
                    triggerType: flow.triggerType,
                    currentWait: "0s",
                    suggestedWait: "5m",
                    optimizedNodes: optimizedNodes
                }
            });
        }
    }

    // 3. AI Usage Optimization
    const aiNodes = nodes.filter((n: any) => n.type.startsWith("AI_AGENT"));
    if (aiNodes.length > 2) {
        findings.push({
            type: "AI_COST_OPTIMIZATION",
            severity: "INFO",
            confidence: 0.75,
            sourceFlowId: flow.id,
            title: `Optimización de Costos AI: ${flow.nombre}`,
            description: "Múltiples agentes AI en secuencia aumentan latencia y costo. Considera consolidar pasos.",
            data: {
                aiNodesCount: aiNodes.length,
                suggestedAction: "CONSOLIDATE"
            }
        });
    }
  }

  return findings;
}
