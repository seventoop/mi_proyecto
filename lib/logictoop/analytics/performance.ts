import { db } from "@/lib/db";

export async function getAutomationPerformance(orgId: string) {
    // Calculates commercial/business impact metrics based on LogicToop Audit Logs or Execution patterns

    // 1. Leads Processed By Automation
    // E.g., Executions that triggered off "NEW_LEAD"
    const leadsProcessed = await (db as any).logicToopExecution.count({
        where: {
            flow: { orgId, triggerType: "NEW_LEAD" },
            status: "SUCCESS"
        }
    });

    // 2. Leads Assigned By Automation
    // Requires searching executions where the payload/log confirms ASSIGN_LEAD
    // Alternatively, look at AuditLogs generated via LogicToop system user.
    const leadsAssigned = await db.auditLog.count({
        where: {
            action: "LOGICTOOP_AUTO_ACTION",
            details: { contains: "ASSIGN_LEAD" } // Approx search if details are JSON or text
        }
    });

    // 3. Average Lead Response Time
    // Can be inferred from automation execution latency on NEW_LEAD
    const newLeadExecutions = await (db as any).logicToopExecution.findMany({
        where: { 
            flow: { orgId, triggerType: "NEW_LEAD" },
            status: "SUCCESS",
            finishedAt: { not: null }
        },
        select: { startedAt: true, finishedAt: true },
        take: 50,
        orderBy: { finishedAt: 'desc' }
    });

    let avgResponseMs = 0;
    if (newLeadExecutions.length > 0) {
        const sum = newLeadExecutions.reduce((acc: number, exec: any) => 
            acc + (new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()), 0);
        avgResponseMs = Math.round(sum / newLeadExecutions.length);
    }

    return {
        leadsProcessedByAutomation: leadsProcessed,
        leadsAssignedByAutomation: leadsAssigned,
        averageLeadResponseTimeSeconds: avgResponseMs > 0 ? (avgResponseMs / 1000).toFixed(2) : "0.00"
    };
}
