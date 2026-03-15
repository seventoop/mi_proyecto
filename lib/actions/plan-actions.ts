"use server";

import prisma from "@/lib/db";
import { requireAuth } from "@/lib/guards";
import { enforceLimit, checkPlanLimit } from "@/lib/saas/limits";

export async function getOrgPlanWithUsage(orgId: string) {
    try {
        const org = (await prisma.organization.findUnique({
            where: { id: orgId },
            include: { planRef: true }
        })) as any;

        if (!org) return { success: false, error: "Org not found" };

        const plan = org.planRef;
        const limits = (plan?.limites as any) || { maxLeads: 50, maxProyectos: 2, maxAutomations: 1 };
        const featuresMap = (plan?.features as any) || { crm: true, inventario: true, ai_scoring: false, importacion_leads: false };

        const [leadsCount, projectsCount] = await Promise.all([
            prisma.lead.count({ where: { proyecto: { orgId } } }),
            prisma.proyecto.count({ where: { orgId } })
        ]);

        return {
            success: true,
            data: {
                planName: plan?.nombre || org.plan || "FREE",
                usage: {
                    leads: { current: leadsCount, limit: limits.maxLeads },
                    proyectos: { current: projectsCount, limit: limits.maxProyectos },
                },
                features: Object.keys(featuresMap).filter(k => featuresMap[k])
            }
        };
    } catch (error) {
        return { success: false, error: "Internal Error" };
    }
}

export async function canCreateResource(orgId: string, resource: "leads" | "proyectos") {
    try {
        const count = await (resource === "leads"
            ? prisma.lead.count({ where: { OR: [{ asignadoAId: { not: null } }, { proyecto: { orgId } }] } })
            : prisma.proyecto.count({ where: { orgId } }));

        return await enforceLimit(orgId, resource, count);
    } catch (error) {
        return { allowed: false, reason: "Error de validación" };
    }
}

export async function getAvailablePlans() {
    try {
        const plans = await prisma.plan.findMany({
            orderBy: { precio: 'asc' }
        });
        return { success: true, data: plans };
    } catch (error) {
        return { success: false, error: "Error fetching plans" };
    }
}
