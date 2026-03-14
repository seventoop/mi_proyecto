import { db } from "@/lib/db";

export async function getAiUsageStats(orgId: string) {
    // Use the normalized schema fields for fast aggregation
    const aggregations = await (db as any).logicToopExecution.aggregate({
        where: { flow: { orgId } },
        _sum: {
            aiTokensUsed: true,
            aiEstimatedCost: true
        },
        _count: {
            id: true
        }
    });

    const tokensUsed = aggregations._sum.aiTokensUsed || 0;
    const estimatedCost = aggregations._sum.aiEstimatedCost || 0;
    
    // Count AI specific executions by seeing if they used AI tokens
    const aiExecutions = await (db as any).logicToopExecution.count({
        where: { 
            flow: { orgId },
            aiTokensUsed: { gt: 0 }
        }
    });

    // To find the most used agent, we analyze flows that contain AI agent nodes
    const activeFlowsWithAI = await (db as any).logicToopFlow.findMany({
        where: { 
            orgId,
            actions: { path: ['$'], string_contains: 'AI_AGENT_' } 
        },
        select: { id: true, nombre: true }
    });

    return {
        aiExecutions,
        tokensUsed,
        estimatedCost: estimatedCost.toFixed(4),
        activeAgents: activeFlowsWithAI.length,
        topAiFlows: activeFlowsWithAI.slice(0, 3)
    };
}
