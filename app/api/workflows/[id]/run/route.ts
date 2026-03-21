import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/guards";
import prisma from "@/lib/db";
import { runWorkflow } from "@/lib/workflow-engine";

// POST /api/workflows/[id]/run — manually trigger a workflow run
export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        const workflow = await prisma.workflow.findUnique({
            where: { id: params.id },
            select: { id: true, orgId: true, activo: true, nombre: true },
        });

        if (!workflow) {
            return NextResponse.json({ error: "Workflow no encontrado" }, { status: 404 });
        }

        // ADMIN/SUPERADMIN can run any workflow; DESARROLLADOR only their org's
        if (!isAdmin && workflow.orgId !== user.orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const entityId: string | undefined = typeof body.entityId === "string" ? body.entityId : undefined;

        const result = await runWorkflow(workflow.id, "MANUAL", entityId);

        const run = await prisma.workflowRun.findUnique({
            where: { id: result.runId },
            include: { pasos: { orderBy: { createdAt: "asc" } } },
        });

        return NextResponse.json(run);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        const status = msg.includes("autorizado") || msg.includes("permiso") ? 403 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
