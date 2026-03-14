import { db } from "@/lib/db";

export async function getExecutionStats(orgId: string) {
    const totalExecutions = await (db as any).logicToopExecution.count({
        where: { flow: { orgId } }
    });

    const successfulExecutions = await (db as any).logicToopExecution.count({
        where: { flow: { orgId }, status: "SUCCESS" }
    });

    const failedExecutions = await (db as any).logicToopExecution.count({
        where: { flow: { orgId }, status: "FAILED" }
    });

    const retryCount = await (db as any).logicToopExecution.count({
        where: { flow: { orgId }, status: "RETRYING" }
    });

    const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

    // Average execution time approximation (only for successful or failed completed runs)
    // Using Prisma aggregation is tough for time differences across DBMs, so we'll do a simple raw approximation
    // or fetch recent 100 and average them to avoid large memory footprint
    const recentCompleted = await (db as any).logicToopExecution.findMany({
        where: { 
            flow: { orgId },
            status: { in: ["SUCCESS", "FAILED"] },
            finishedAt: { not: null }
        },
        select: { startedAt: true, finishedAt: true },
        take: 100,
        orderBy: { finishedAt: "desc" }
    });

    let averageExecutionTime = 0;
    if (recentCompleted.length > 0) {
        const totalMs = recentCompleted.reduce((acc: number, exec: any) => {
            return acc + (new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime());
        }, 0);
        averageExecutionTime = Math.round(totalMs / recentCompleted.length);
    }

    return {
        totalExecutions,
        successRate,
        failedExecutions,
        retryCount,
        averageExecutionTimeMs: averageExecutionTime
    };
}

export async function getExecutionVolumeByDay(orgId: string) {
    // Return last 14 days volume
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const executions = await (db as any).logicToopExecution.findMany({
        where: {
            flow: { orgId },
            startedAt: { gte: fourteenDaysAgo }
        },
        select: { startedAt: true }
    });

    const volumeMap = new Map<string, number>();
    for (const exec of executions) {
        const dateStr = new Date(exec.startedAt).toISOString().split('T')[0];
        volumeMap.set(dateStr, (volumeMap.get(dateStr) || 0) + 1);
    }

    // Sort chronologically
    return Array.from(volumeMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopFlows(orgId: string) {
    // Find flows with highest execution counts
    const topFlows = await (db as any).logicToopFlow.findMany({
        where: { orgId },
        select: {
            id: true,
            nombre: true,
            _count: { select: { executions: true } }
        },
        orderBy: { executions: { _count: 'desc' } },
        take: 5
    });

    return topFlows.map((f: any) => ({
        id: f.id,
        nombre: f.nombre,
        executions: f._count.executions
    }));
}
