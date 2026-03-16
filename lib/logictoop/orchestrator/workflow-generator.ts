import { db } from "@/lib/db";
import { LogicToopFlowStatus } from "@prisma/client";

export async function createDraftFromRecommendation(recommendationId: string) {
  const recommendation = await (db as any).logicToopRecommendation.findUnique({
    where: { id: recommendationId }
  });

  if (!recommendation) {
    throw new Error("Recommendation not found");
  }

  if (!recommendation.suggestedTrigger || !recommendation.suggestedNodes) {
    throw new Error("Recommendation lacks workflow definition");
  }

  const flow = await (db as any).logicToopFlow.create({
    data: {
      orgId: recommendation.orgId,
      nombre: `AI Draft: ${recommendation.title}`,
      descripcion: recommendation.description,
      triggerType: recommendation.suggestedTrigger,
      actions: recommendation.suggestedNodes,
      status: "DRAFT",
      activo: false,
      recommendationId: recommendation.id,
      metadata: {
        generationSource: recommendation.type === "RETRY_OPTIMIZATION" || recommendation.type === "WAIT_OPTIMIZATION" || recommendation.type === "AI_COST_OPTIMIZATION" ? "OPTIMIZATION_ENGINE" : "ORCHESTRATOR",
        recommendationId: recommendation.id,
        sourceFlowId: recommendation.sourceFlowId,
        createdBySystem: true,
        generatedAt: new Date().toISOString()
      }
    }
  });

  // Mark recommendation as reviewed or applied
  await (db as any).logicToopRecommendation.update({
    where: { id: recommendationId },
    data: { status: "APPLIED" }
  });

  return flow;
}

export async function previewGeneratedFlow(recommendationId: string) {
  const recommendation = await (db as any).logicToopRecommendation.findUnique({
    where: { id: recommendationId }
  });

  if (!recommendation) return null;

  return {
    nombre: `AI Draft: ${recommendation.title}`,
    triggerType: recommendation.suggestedTrigger,
    actions: recommendation.suggestedNodes,
    metadata: {
      generationSource: "ORCHESTRATOR",
      createdBySystem: true
    }
  };
}

export async function createDraftFromIntent(proposal: any) {
    if (proposal.confidence < 0.5) {
        throw new Error("Confidence too low to generate draft without review.");
    }

    const flow = await (db as any).logicToopFlow.create({
        data: {
            orgId: proposal.orgId,
            nombre: `AI Intent: ${proposal.businessGoal}`,
            descripcion: proposal.rawIntent,
            triggerType: proposal.inferredTrigger,
            actions: proposal.inferredActions,
            status: "DRAFT",
            activo: false,
            metadata: {
                generationSource: "INTENT_TO_WORKFLOW",
                rawIntent: proposal.rawIntent,
                createdBySystem: true,
                generatedAt: new Date().toISOString()
            }
        }
    });

    return flow;
}
