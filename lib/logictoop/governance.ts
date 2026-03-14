import { db } from "@/lib/db";
import { LogicToopFlowStatus } from "@prisma/client";

export type LogicToopAction = "CREATE_FLOW" | "ACTIVATE_FLOW" | "EXECUTE_FLOW" | "INSTALL_TEMPLATE" | "ADD_AGENT";

export interface GovernanceResult {
    allowed: boolean;
    reason?: string;
    usage?: any;
}

/**
 * Parses limits from the Plan model.
 * Assumes limits is a JSON like: { maxLogicToopFlows: 5, maxExecutionsPerMonth: 1000, maxLogicToopAgents: 1, maxInstalledTemplates: 3 }
 */
function parseLimits(plan: any) {
    const limits = plan?.limites as Record<string, any> || {};
    return {
        maxFlows: typeof limits.maxLogicToopFlows === 'number' ? limits.maxLogicToopFlows : 3, // Default free tier
        maxExecutions: typeof limits.maxExecutionsPerMonth === 'number' ? limits.maxExecutionsPerMonth : 100, // Default free tier
        maxAgents: typeof limits.maxLogicToopAgents === 'number' ? limits.maxLogicToopAgents : 0, 
        maxTemplates: typeof limits.maxInstalledTemplates === 'number' ? limits.maxInstalledTemplates : 1,
    };
}

/**
 * Checks if a specific organization can perform a LogicToop action based on their active plan.
 */
export async function checkOrgLimits(orgId: string, action: LogicToopAction): Promise<GovernanceResult> {
    const org = await db.organization.findUnique({
        where: { id: orgId },
        include: { planRef: true }
    });

    if (!org) {
        return { allowed: false, reason: "Organización no encontrada" };
    }

    const limits = parseLimits(org.planRef);

    switch (action) {
        case "CREATE_FLOW":
        case "ACTIVATE_FLOW":
        case "INSTALL_TEMPLATE": {
            // Count total flows regardless of status to prevent clutter, 
            // or just count ACTIVE if that's the billing model. 
            // We'll count non-ARCHIVED flows.
            const flowCount = await db.logicToopFlow.count({
                where: { 
                    orgId,
                    status: { not: "ARCHIVED" } 
                }
            });

            // Note: If INSTALL_TEMPLATE has its own logic, we can also check template origins.
            // For now, tying MAX_FLOWS to both creation and installation.
            const limit = action === "INSTALL_TEMPLATE" ? limits.maxTemplates : limits.maxFlows;

            if (flowCount >= limit) {
                return { 
                    allowed: false, 
                    reason: `Límite alcanzado: Tu plan permite hasta ${limit} flujos activos o instalados. Actualiza tu plan para crear más.`,
                    usage: { current: flowCount, max: limit }
                };
            }
            break;
        }

        case "EXECUTE_FLOW": {
            // Get executions in the last 30 days or current calendar month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const execCount = await db.logicToopExecution.count({
                where: {
                    flow: { orgId },
                    startedAt: { gte: startOfMonth }
                }
            });

            if (execCount >= limits.maxExecutions) {
                return {
                    allowed: false,
                    reason: `Límite de ejecuciones alcanzado: Tu plan admite ${limits.maxExecutions} automatizaciones por mes.`,
                    usage: { current: execCount, max: limits.maxExecutions }
                };
            }
            break;
        }

        case "ADD_AGENT": {
            // To be accurate, we'd need to inspect the JSON actions for AI nodes.
            // For now, this is a placeholder if we enforce agent counts on node save.
            break;
        }
    }

    return { allowed: true };
}

/**
 * Evaluates chaos/safety rules for a flow configuration. Returns warnings (soft) or blocks (hard).
 */
export async function analyzeFlowSafety(orgId: string, triggerType: string, flowIdToExclude?: string): Promise<{
    warnings: string[];
    blocks: string[];
}> {
    const warnings: string[] = [];
    const blocks: string[] = [];

    // Duplicate active flow detection (soft warning)
    const duplicateTriggers = await db.logicToopFlow.count({
        where: {
            orgId,
            triggerType,
            status: "ACTIVE",
            id: flowIdToExclude ? { not: flowIdToExclude } : undefined
        }
    });

    if (duplicateTriggers > 0) {
        warnings.push(`Ya tienes otros flujos ACTIVOS escuchando el mismo evento (${triggerType}). Esto puede causar comportamiento duplicado o conflictivo.`);
    }

    // Additional rules (e.g. inspecting config structure for too many agents or loops)
    // can be added here when the actions array is passed as an argument.

    return { warnings, blocks };
}

/**
 * Checks if the organization is approaching or exceeding AI cost/token thresholds.
 * Soft warnings only, does not hard block execution.
 */
export async function checkAIOperationalSafety(orgId: string): Promise<string[]> {
    const warnings: string[] = [];
    
    const org = await db.organization.findUnique({
        where: { id: orgId },
        include: { planRef: true }
    });

    if (!org) return warnings;

    const limits = org.planRef?.limites as Record<string, any> || {};
    const maxAiCost = typeof limits.maxAiCost === 'number' ? limits.maxAiCost : 0; // 0 means no AI allowed on free tier typically, but lets use as threshold if > 0

    if (maxAiCost > 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const aiAgg = await (db as any).logicToopExecution.aggregate({
            where: {
                flow: { orgId },
                startedAt: { gte: startOfMonth }
            },
            _sum: { aiEstimatedCost: true }
        });

        const currentCost = aiAgg._sum.aiEstimatedCost || 0;

        if (currentCost > maxAiCost) {
            warnings.push(`Advertencia de Costos de IA: Has superado el presupuesto estimado de $${maxAiCost} USD este mes (Uso: $${currentCost.toFixed(2)} USD). Revisa tus automatizaciones.`);
        } else if (currentCost > maxAiCost * 0.8) {
            warnings.push(`Advertencia de Costos de IA: Has consumido el ${Math.round((currentCost/maxAiCost)*100)}% de tu presupuesto estimado mensual.`);
        }
    }

    return warnings;
}
