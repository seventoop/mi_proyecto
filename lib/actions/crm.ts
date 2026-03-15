"use server";

import prisma from "@/lib/db";
import { requireRole, handleGuardError } from "@/lib/guards";
import { revalidatePath } from "next/cache";

export async function getAdminLeads() {
    try {
        await requireRole("ADMIN");

        const [leads, orgs] = await Promise.all([
            prisma.lead.findMany({
                where: { orgId: null },
                orderBy: { createdAt: "desc" },
                take: 50
            }),
            prisma.organization.findMany({
                select: {
                    id: true,
                    nombre: true,
                    _count: { select: { proyectos: true } }
                },
                orderBy: { nombre: "asc" }
            })
        ]);

        return { success: true, data: { leads, orgs } };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function assignLeadToOrg(leadId: string, orgId: string) {
    try {
        await requireRole("ADMIN");

        await prisma.lead.update({
            where: { id: leadId },
            data: { orgId }
        });

        revalidatePath("/dashboard/admin/crm/leads");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
