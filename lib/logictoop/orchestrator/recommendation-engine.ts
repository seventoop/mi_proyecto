import { db } from "@/lib/db";
import { AnalysisFinding } from "./crm-analyzer";

export async function generateRecommendations(orgId: string, findings: AnalysisFinding[]) {
  const recommendations = [];

  for (const finding of findings) {
    // Check if a similar recommendation already exists for this org in the last 24h
    const existing = await (db as any).logicToopRecommendation.findFirst({
      where: {
        orgId,
        type: finding.type,
        status: "NEW",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    if (existing) continue;

    const recommendationData = mapFindingToRecommendation(finding, orgId);
    
    const created = await (db as any).logicToopRecommendation.create({
      data: recommendationData
    });

    recommendations.push(created);
  }

  return recommendations;
}

function mapFindingToRecommendation(finding: AnalysisFinding, orgId: string) {
  const base = {
    orgId,
    type: finding.type,
    title: finding.title,
    description: finding.description,
    confidence: finding.confidence,
    severity: finding.severity,
    status: "NEW",
    signals: finding.data,
    sourceFlowId: finding.sourceFlowId, // Link to existing flow
    sourceMetrics: { analyzedAt: new Date().toISOString() },
    explanation: {
      reason: finding.description,
      benefit: "Improves operational efficiency and lead conversion."
    }
  };

  switch (finding.type) {
    case "DELAYED_RESPONSE":
      return {
        ...base,
        problemDetected: "Leads waiting too long for first contact.",
        proposedSolution: "Implement an automated instant response flow.",
        expectedImpact: "High - Faster response times correlate with higher conversion.",
        suggestedTrigger: "NEW_LEAD",
        suggestedNodes: [
          { type: "SEND_WHATSAPP", config: { message: "Hola {{lead.nombre}}, gracias por tu interés..." } },
          { type: "ASSIGN_LEAD", config: { mode: "ROUND_ROBIN" } }
        ]
      };
    case "STALE_LEADS":
      return {
        ...base,
        problemDetected: "Leads stuck in pipeline without follow-up.",
        proposedSolution: "Create a re-engagement flow for inactive leads.",
        expectedImpact: "Medium - Recovers potentially lost opportunities.",
        suggestedTrigger: "SCHEDULED",
        suggestedNodes: [
          { type: "AI_AGENT", config: { agentId: "RE_ENGAGEMENT", objective: "Revive interest" } }
        ]
      };
    case "HIGH_FAILURE_RATE":
      return {
        ...base,
        problemDetected: "Workflows are failing consistently.",
        proposedSolution: "Review node configurations and add retry logic.",
        expectedImpact: "Critical - Restores system reliability.",
        explanation: {
            ...base.explanation,
            benefit: "Prevents loss of lead data and ensures automation reliability."
        }
      };
    case "EXCESSIVE_AI_COST":
      return {
        ...base,
        problemDetected: "AI token consumption is higher than average.",
        proposedSolution: "Optimize AI prompts and use more efficient models.",
        expectedImpact: "Medium - Reduces operational costs.",
        explanation: {
            ...base.explanation,
            benefit: "Lowers monthly expenses without sacrificing intelligence."
        }
      };
    case "RETRY_OPTIMIZATION":
      return {
        ...base,
        problemDetected: finding.description,
        proposedSolution: "Add retry logic to failing nodes.",
        expectedImpact: "High - Improves reliability of critical flows.",
        suggestedTrigger: finding.data.triggerType,
        suggestedNodes: finding.data.optimizedNodes
      };
    case "WAIT_OPTIMIZATION":
      return {
        ...base,
        problemDetected: finding.description,
        proposedSolution: "Add a delay to avoid robotic perception.",
        expectedImpact: "Medium - Improves lead experience.",
        suggestedTrigger: finding.data.triggerType,
        suggestedNodes: finding.data.optimizedNodes
      };
    case "AI_COST_OPTIMIZATION":
      return {
        ...base,
        problemDetected: finding.description,
        proposedSolution: "Consolidate AI agents into single prompts.",
        expectedImpact: "Medium - Reduces operational costs.",
        suggestedTrigger: finding.data.triggerType,
        suggestedNodes: finding.data.optimizedNodes
      };
    default:
      return base;
  }
}
