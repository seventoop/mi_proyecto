"use server";

import { db } from "@/lib/db";
import { requireRole, requireAnyRole, handleGuardError } from "@/lib/guards";

export async function getObservabilityStats() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]); // Admin/Superadmin only since it sees all orgs

        // High-level Stats
        const totalExecutions = await (db as any).logicToopExecution.count();
        const successfulExecutions = await (db as any).logicToopExecution.count({ where: { status: "SUCCESS" } });
        const failedExecutions = await (db as any).logicToopExecution.count({ where: { status: "FAILED" } });
        
        const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

        // Recent Failures
        const recentFailures = await (db as any).logicToopExecution.findMany({
            where: { status: { in: ["FAILED", "RETRYING"] } },
            take: 20,
            orderBy: { startedAt: "desc" },
            include: { flow: { include: { org: true } } }
        });

        // Orgs usage
        const executionsByOrgRaw = await (db as any).logicToopExecution.groupBy({
            by: ['flowId'],
            _count: { id: true }
        });
        
        // This query requires a mapping since groupBy across relations is tricky in Prisma natively.
        // For standard monitoring, we aggregate by getting all active flows and their exec counts manually or using distinct:
        const flowsWithCounts = await (db as any).logicToopFlow.findMany({
            select: { 
                orgId: true, 
                org: { select: { nombre: true } }, 
                _count: { select: { executions: true } }
            }
        });

        const orgUsageMap = new Map();
        for (const f of flowsWithCounts) {
            const current = orgUsageMap.get(f.orgId) || { nombre: f.org.nombre, count: 0 };
            current.count += f._count.executions;
            orgUsageMap.set(f.orgId, current);
        }
        
        const executionsByOrg = Array.from(orgUsageMap.values()).sort((a,b) => b.count - a.count).slice(0, 10);

        // Slowest Flows
        const completedExecutions = await (db as any).logicToopExecution.findMany({
            where: { status: "SUCCESS", finishedAt: { not: null } },
            take: 200,
            select: { flow: { select: { nombre: true, org: { select: { nombre: true } } } }, startedAt: true, finishedAt: true },
            orderBy: { finishedAt: "desc" }
        });

        const flowTimingMap = new Map();
        for (const exec of completedExecutions) {
            const flowName = `${exec.flow.nombre} (${exec.flow.org.nombre})`;
            const duration = new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime();
            const current = flowTimingMap.get(flowName) || { durations: [], avg: 0 };
            current.durations.push(duration);
            flowTimingMap.set(flowName, current);
        }

        const slowestFlows = Array.from(flowTimingMap.entries())
            .map(([name, data]) => ({ name, avgMs: data.durations.reduce((a:number, b:number) => a + b, 0) / data.durations.length }))
            .sort((a, b) => b.avgMs - a.avgMs)
            .slice(0, 5);

        // Global AI Usage
        const globalAiAgg = await (db as any).logicToopExecution.aggregate({
            _sum: { aiTokensUsed: true, aiEstimatedCost: true }
        });

        return {
            success: true,
            data: {
                totalExecutions,
                successfulExecutions,
                failedExecutions,
                successRate,
                recentFailures,
                executionsByOrg,
                slowestFlows,
                globalAiCost: globalAiAgg._sum.aiEstimatedCost || 0,
                globalAiTokens: globalAiAgg._sum.aiTokensUsed || 0
            }
        };

    } catch (error) {
        return handleGuardError(error);
    }
}
