"use server";

import prisma from "@/lib/db";

/**
 * SaaS Plan Limits Checker.
 * Queries the Plan assigned to an org and verifies feature access + quotas.
 */

interface PlanLimits {
    maxLeads: number;
    maxProyectos: number;
    maxUsers: number;
    maxAutomations: number;
}

interface PlanFeatures {
    crm: boolean;
    banners: boolean;
    tour360: boolean;
    masterplan: boolean;
    inventario: boolean;
    workflows: boolean;
    blog: boolean;
    [key: string]: boolean;
}

// Default limits for orgs without a plan (FREE tier)
const FREE_LIMITS: PlanLimits = {
    maxLeads: 50,
    maxProyectos: 2,
    maxUsers: 3,
    maxAutomations: 1,
};

const FREE_FEATURES: PlanFeatures = {
    crm: true,
    banners: false,
    tour360: false,
    masterplan: false,
    inventario: true,
    workflows: false,
    blog: true,
};

async function getOrgPlan(orgId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { planRef: true },
    });

    if (!org) return null;

    if (org.planRef) {
        return {
            limits: org.planRef.limites as unknown as PlanLimits,
            features: org.planRef.features as unknown as PlanFeatures,
        };
    }

    // Fallback to FREE tier defaults
    return { limits: FREE_LIMITS, features: FREE_FEATURES };
}

/**
 * Check if an org's plan has a specific feature enabled.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkPlanLimit(
    orgId: string,
    feature: string
): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getOrgPlan(orgId);
    if (!plan) return { allowed: false, reason: "Organización no encontrada" };

    const featureEnabled = plan.features[feature];
    if (featureEnabled === undefined) {
        // Unknown feature — allow by default (conservative)
        return { allowed: true };
    }

    if (!featureEnabled) {
        return { allowed: false, reason: `La función "${feature}" no está incluida en tu plan actual` };
    }

    return { allowed: true };
}

/**
 * Enforce a numerical limit for a resource within an org's plan.
 * Throws if the current count >= the plan limit.
 */
export async function enforceLimit(
    orgId: string,
    resource: "leads" | "proyectos" | "users" | "automations",
    currentCount: number
): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await getOrgPlan(orgId);
    if (!plan) return { allowed: false, reason: "Organización no encontrada" };

    const limitMap: Record<string, keyof PlanLimits> = {
        leads: "maxLeads",
        proyectos: "maxProyectos",
        users: "maxUsers",
        automations: "maxAutomations",
    };

    const limitKey = limitMap[resource];
    if (!limitKey) return { allowed: true };

    const max = plan.limits[limitKey] ?? Infinity;
    if (currentCount >= max) {
        return {
            allowed: false,
            reason: `Has alcanzado el límite de ${max} ${resource} en tu plan actual`,
        };
    }

    return { allowed: true };
}
