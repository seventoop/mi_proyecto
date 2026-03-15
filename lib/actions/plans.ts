"use server";

import prisma from "@/lib/db";
import { requireAnyRole, handleGuardError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const planCreateSchema = z.object({
    nombre: z.string().min(1, "Nombre requerido").max(100),
    precio: z.number().min(0).default(0),
    limites: z.object({
        maxLeads: z.number().int().min(0).default(50),
        maxProyectos: z.number().int().min(0).default(2),
        maxUsers: z.number().int().min(0).default(3),
        maxAutomations: z.number().int().min(0).default(1),
    }),
    features: z.object({
        crm: z.boolean().default(true),
        banners: z.boolean().default(false),
        tour360: z.boolean().default(false),
        masterplan: z.boolean().default(false),
        inventario: z.boolean().default(true),
        workflows: z.boolean().default(false),
    }),
});

const planUpdateSchema = planCreateSchema.partial();

// ─── Queries ───

export async function getPlans() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const plans = await prisma.plan.findMany({
            orderBy: { precio: "asc" },
            include: {
                _count: { select: { orgs: true } },
            },
        });
        return { success: true, data: plans };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getPlan(id: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const plan = await prisma.plan.findUnique({
            where: { id },
            include: { orgs: { select: { id: true, nombre: true, slug: true } } },
        });
        if (!plan) return { success: false, error: "Plan no encontrado" };
        return { success: true, data: plan };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function createPlan(input: unknown) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const parsed = planCreateSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };

        const plan = await prisma.plan.create({ data: parsed.data });
        revalidatePath("/dashboard/admin/planes");
        return { success: true, data: plan };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updatePlan(id: string, input: unknown) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const parsed = planUpdateSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };

        const plan = await prisma.plan.update({
            where: { id },
            data: parsed.data,
        });
        revalidatePath("/dashboard/admin/planes");
        return { success: true, data: plan };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deletePlan(id: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        // Unassign orgs from this plan before deleting
        await prisma.organization.updateMany({
            where: { planId: id },
            data: { planId: null },
        });

        await prisma.plan.delete({ where: { id } });
        revalidatePath("/dashboard/admin/planes");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function assignPlanToOrg(orgId: string, planId: string | null) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        await prisma.organization.update({
            where: { id: orgId },
            data: { planId: planId },
        });

        revalidatePath("/dashboard/admin/planes");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Feature Flags ───

export async function getProjectFeatureFlags(projectId: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const flags = await prisma.projectFeatureFlags.findUnique({
            where: { projectId },
        });
        return { success: true, data: flags };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateProjectFeatureFlags(projectId: string, flags: Record<string, boolean>) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const result = await prisma.projectFeatureFlags.upsert({
            where: { projectId },
            update: flags,
            create: { projectId, ...flags },
        });

        revalidatePath("/dashboard/admin/proyectos");
        return { success: true, data: result };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Orgs Admin ───

export async function getOrgsWithPlans() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const orgs = await prisma.organization.findMany({
            include: {
                planRef: { select: { id: true, nombre: true } },
                _count: { select: { users: true, proyectos: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return { success: true, data: orgs };
    } catch (error) {
        return handleGuardError(error);
    }
}
