"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAnyRole, handleGuardError, requireAuth } from "@/lib/guards";
import { analyzeCrmSignals } from "@/lib/logictoop/orchestrator/crm-analyzer";
import { generateRecommendations } from "@/lib/logictoop/orchestrator/recommendation-engine";
import { createDraftFromRecommendation, createDraftFromIntent } from "@/lib/logictoop/orchestrator/workflow-generator";
import { analyzeFlowOptimizations } from "@/lib/logictoop/orchestrator/optimization-engine";
import { parseIntent } from "@/lib/logictoop/orchestrator/intent-parser";

export async function getOrchestratorData(orgId: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const recommendations = await (db as any).logicToopRecommendation.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" }
        });

        const optimizations = await analyzeFlowOptimizations(orgId);

        return {
            success: true,
            data: { recommendations, optimizations }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function parseIntentAction(orgId: string, rawIntent: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const proposal = await parseIntent(orgId, rawIntent);
        return { success: true, proposal };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function generateDraftFromIntentAction(proposal: any) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const flow = await createDraftFromIntent(proposal);
        revalidatePath("/dashboard/admin/logictoop");
        return { success: true, flowId: flow.id };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function triggerOrchestratorAnalysis(orgId: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const findings = await analyzeCrmSignals(orgId);
        const optimizations = await analyzeFlowOptimizations(orgId);
        
        const allFindings = [...findings, ...optimizations];
        const recommendations = await generateRecommendations(orgId, allFindings);

        revalidatePath("/dashboard/admin/logictoop/orchestrator");
        return { success: true, count: recommendations.length };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function generateDraftAction(recommendationId: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const flow = await createDraftFromRecommendation(recommendationId);

        revalidatePath("/dashboard/admin/logictoop/orchestrator");
        revalidatePath("/dashboard/admin/logictoop");
        
        return { success: true, flowId: flow.id };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateRecommendationStatusAction(recommendationId: string, status: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        await (db as any).logicToopRecommendation.update({
            where: { id: recommendationId },
            data: { status }
        });

        revalidatePath("/dashboard/admin/logictoop/orchestrator");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
