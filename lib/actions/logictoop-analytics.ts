"use server";

import { requireAuth, requireAnyRole, handleGuardError } from "@/lib/guards";
import { getExecutionStats, getExecutionVolumeByDay, getTopFlows } from "@/lib/logictoop/analytics/executionAnalytics";
import { getAiUsageStats } from "@/lib/logictoop/analytics/aiUsage";
import { getAutomationPerformance } from "@/lib/logictoop/analytics/performance";
import { checkAIOperationalSafety } from "@/lib/logictoop/governance";

export async function getTenantAnalyticsData() {
    try {
        const user = await requireAuth();
        const orgId = user.orgId;
        
        if (!orgId) throw new Error("No tienes organización asignada");

        const [
            executionStats,
            volumeByDay,
            topFlows,
            aiStats,
            performanceStats,
            aiWarnings
        ] = await Promise.all([
            getExecutionStats(orgId),
            getExecutionVolumeByDay(orgId),
            getTopFlows(orgId),
            getAiUsageStats(orgId),
            getAutomationPerformance(orgId),
            checkAIOperationalSafety(orgId)
        ]);

        return {
            success: true,
            data: {
                executionStats,
                volumeByDay,
                topFlows,
                aiStats,
                performanceStats,
                warnings: aiWarnings
            }
        };

    } catch (error) {
        return handleGuardError(error);
    }
}
