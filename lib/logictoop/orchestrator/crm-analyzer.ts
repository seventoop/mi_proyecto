import { db } from "@/lib/db";
import { getExecutionStats } from "../analytics/executionAnalytics";
import { getAiUsageStats } from "../analytics/aiUsage";

export interface AnalysisFinding {
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  confidence: number;
  data: any;
  title: string;
  description: string;
  sourceFlowId?: string; // Optinal link to an existing flow
}

export async function analyzeCrmSignals(orgId: string): Promise<AnalysisFinding[]> {
  const findings: AnalysisFinding[] = [];

  // 1. Detect delayed first response
  const delayedLeads = await db.lead.findMany({
    where: {
      orgId,
      estado: "NUEVO",
      createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // > 2 hours
      ultimoContacto: null
    },
    take: 10
  });

  if (delayedLeads.length > 0) {
    findings.push({
      type: "DELAYED_RESPONSE",
      severity: "WARNING",
      confidence: 0.9,
      title: "Delayed Lead Response",
      description: `${delayedLeads.length} new leads have not been contacted within 2 hours.`,
      data: { leadIds: delayedLeads.map(l => l.id) }
    });
  }

  // 2. Detect stale leads (no follow-up)
  const staleLeads = await db.lead.findMany({
    where: {
      orgId,
      estado: { notIn: ["NUEVO", "CERRADO", "PERDIDO"] },
      updatedAt: { lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } // > 5 days ago
    },
    take: 10
  });

  if (staleLeads.length > 0) {
    findings.push({
      type: "STALE_LEADS",
      severity: "INFO",
      confidence: 0.8,
      title: "Stale Leads Detected",
      description: `${staleLeads.length} leads have had no activity in over 5 days.`,
      data: { leadIds: staleLeads.map(l => l.id) }
    });
  }

  // 3. Automation Health - High Failure Rate
  const stats = await getExecutionStats(orgId);
  if (stats.successRate < 80 && stats.totalExecutions > 10) {
    findings.push({
      type: "HIGH_FAILURE_RATE",
      severity: "CRITICAL",
      confidence: 1.0,
      title: "High Automation Failure Rate",
      description: `Your automations have a success rate of only ${stats.successRate}%.`,
      data: { successRate: stats.successRate, failures: stats.failedExecutions }
    });
  }

  // 4. Excessive Token Usage
  const aiStats = await getAiUsageStats(orgId);
  const cost = parseFloat(aiStats.estimatedCost);
  if (cost > 50) { // Arbitrary threshold for demo
    findings.push({
      type: "EXCESSIVE_AI_COST",
      severity: "WARNING",
      confidence: 0.85,
      title: "High AI Tokens Usage",
      description: `Your AI costs are reaching $${aiStats.estimatedCost}.`,
      data: { cost: aiStats.estimatedCost, tokens: aiStats.tokensUsed }
    });
  }

  return findings;
}
