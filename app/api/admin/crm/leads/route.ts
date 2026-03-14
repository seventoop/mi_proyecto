export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { leadAssignmentSchema } from "@/lib/validations";

// GET: Admin CRM leads with filters (bandeja admin)
export async function GET(req: NextRequest) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        // @security-waive: NO_ORG_FILTER - Admin dashboard sees all leads across the system

        const { searchParams } = new URL(req.url);
        const estado = searchParams.get("estado");
        const canal = searchParams.get("canal");
        const search = searchParams.get("search");
        const unassigned = searchParams.get("unassigned") === "true";
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "20");

        const where: any = {};
        if (estado) where.estado = estado;
        if (canal) where.canalOrigen = canal;
        if (unassigned) where.orgId = null;
        if (search) {
            where.OR = [
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { telefono: { contains: search, mode: "insensitive" } },
            ];
        }

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    proyecto: { select: { nombre: true } },
                    asignadoA: { select: { nombre: true, email: true } },
                },
                take: pageSize,
                skip: (page - 1) * pageSize,
            }),
            prisma.lead.count({ where }),
        ]);

        return NextResponse.json({ data: leads, total, page, pageSize });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// PATCH: Assign lead to org or user
export async function PATCH(req: NextRequest) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const body = await req.json();

        // 🛡️ STRICT VALIDATION
        const validation = leadAssignmentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }
        const { leadId, orgId, asignadoAId, score, estado } = validation.data;

        if (!leadId) return NextResponse.json({ error: "leadId requerido" }, { status: 400 });

        const data: any = {};
        if (orgId !== undefined) data.orgId = orgId;
        if (asignadoAId !== undefined) data.asignadoAId = asignadoAId;
        if (score !== undefined) data.score = score;
        if (estado !== undefined) data.estado = estado;

        const lead = await prisma.lead.update({ where: { id: leadId }, data });
        return NextResponse.json({ data: lead });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
