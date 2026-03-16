"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole, requireAnyRole, handleGuardError, requireAuth } from "@/lib/guards";
import { checkOrgLimits, analyzeFlowSafety } from "@/lib/logictoop/governance";
import { LogicToopFlowStatus } from "@prisma/client";

export async function getLogicToopDashboardData() {
    try {
        const user = await requireAuth();
        const orgId = user.orgId;
        
        // ADMIN/SUPERADMIN bypasses orgId filter if needed, but the dashboard is usually tenant-focused.
        // Assuming this is used by tenant admins:
        if (!orgId && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
             throw new Error("No tienes organización asignada");
        }

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        const whereClause = isAdmin ? {} : { orgId };

        const flows = await (db as any).logicToopFlow.findMany({
            where: { ...whereClause, status: { not: "ARCHIVED" } },
            include: {
                org: { select: { nombre: true } },
                _count: { select: { executions: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        const templates = await (db as any).logicToopTemplate.findMany();

        const latestExecutions = await (db as any).logicToopExecution.findMany({
            where: { flow: whereClause },
            take: 10,
            include: {
                flow: { select: { nombre: true } }
            },
            orderBy: { startedAt: "desc" }
        });

        return {
            success: true,
            data: { flows, templates, latestExecutions }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function createFlowFromTemplate(templateId: string, orgId: string, nombre?: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const limitCheck = await checkOrgLimits(orgId, "CREATE_FLOW");
        if (!limitCheck.allowed) {
            throw new Error(limitCheck.reason);
        }

        const template = await (db as any).logicToopTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) throw new Error("Template no encontrado");

        const flow = await (db as any).logicToopFlow.create({
            data: {
                orgId,
                nombre: nombre || `Flow: ${template.nombre}`,
                descripcion: template.descripcion,
                triggerType: template.triggerType,
                actions: template.defaultActions || template.flowConfig || [],
                status: "DRAFT",
                activo: false // legacy fallback
            }
        });

        revalidatePath("/dashboard/admin/logictoop");
        return { success: true, data: flow };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function changeFlowStatus(flowId: string, status: LogicToopFlowStatus) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const existingFlow = await (db as any).logicToopFlow.findUnique({
            where: { id: flowId }
        });

        if (!existingFlow) throw new Error("Flow no encontrado");

        if (status === "ACTIVE") {
            const limitCheck = await checkOrgLimits(existingFlow.orgId, "ACTIVATE_FLOW");
            if (!limitCheck.allowed) throw new Error(limitCheck.reason);
        }

        await (db as any).logicToopFlow.update({
            where: { id: flowId },
            data: { 
                status, 
                activo: status === "ACTIVE" 
            }
        });

        revalidatePath("/dashboard/admin/logictoop");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getFlowExecutions(flowId: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const executions = await (db as any).logicToopExecution.findMany({
            where: { flowId },
            orderBy: { startedAt: "desc" },
            take: 50
        });

        return { success: true, data: executions };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getFlowById(flowId: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const flow = await (db as any).logicToopFlow.findUnique({
            where: { id: flowId },
            include: { org: { select: { nombre: true } } }
        });

        return { success: true, data: flow };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateFlowConfig(flowId: string, actions: any[]) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        // Simple validation: Ensure it's an array
        if (!Array.isArray(actions)) throw new Error("Acciones inválidas");

        const flow = await (db as any).logicToopFlow.update({
            where: { id: flowId },
            data: { actions }
        });

        revalidatePath("/dashboard/admin/logictoop");
        revalidatePath(`/dashboard/admin/logictoop/builder/${flowId}`);
        return { success: true, data: flow };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function cloneFlow(flowId: string) {
    try {
        const user = await requireAuth();

        const sourceFlow = await (db as any).logicToopFlow.findUnique({
            where: { id: flowId }
        });

        if (!sourceFlow) throw new Error("Flow fuente no encontrado");

        // Simple RBAC check - Admin or matching orgId
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && sourceFlow.orgId !== user.orgId) {
            throw new Error("No tienes acceso a este flow");
        }

        const limitCheck = await checkOrgLimits(sourceFlow.orgId, "CREATE_FLOW");
        if (!limitCheck.allowed) throw new Error(limitCheck.reason);

        const newFlow = await (db as any).logicToopFlow.create({
            data: {
                orgId: sourceFlow.orgId,
                nombre: `${sourceFlow.nombre} (Copia)`,
                descripcion: sourceFlow.descripcion,
                triggerType: sourceFlow.triggerType,
                actions: sourceFlow.actions || [],
                status: "DRAFT",
                activo: false 
            }
        });

        revalidatePath("/dashboard/admin/logictoop");
        return { success: true, data: newFlow };
    } catch (error) {
        return handleGuardError(error);
    }
}

/**
 * Retrieves all registered node definitions (metadata only) for the UI.
 */
export async function getNodeDefinitions() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const { nodeRegistry } = await import("@/lib/logictoop/nodes/nodeRegistry");
        const { initNodeRegistry } = await import("@/lib/logictoop/nodes");
        
        initNodeRegistry();
        
        const definitions = nodeRegistry.list().map(node => ({
            type: node.type,
            label: node.label,
            category: node.category,
            icon: node.icon,
            description: node.description,
            configSchema: node.configSchema
        }));
        
        return { success: true, data: definitions };
    } catch (error) {
        return { success: false, error: "Error al cargar definiciones de nodos" };
    }
}
