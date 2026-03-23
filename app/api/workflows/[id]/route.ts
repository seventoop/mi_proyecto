import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/guards";
import prisma from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
    activo: z.boolean().optional(),
    nombre: z.string().min(1).optional(),
    descripcion: z.string().optional(),
});

// PATCH /api/workflows/[id] — update workflow fields (activo toggle, rename, etc.)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        const workflow = await prisma.workflow.findUnique({
            where: { id },
            select: { orgId: true },
        });

        if (!workflow) {
            return NextResponse.json({ error: "Workflow no encontrado" }, { status: 404 });
        }
        
        // Tenant boundary check
        if (!isAdmin && workflow.orgId !== user.orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const updated = await prisma.workflow.update({
            where: { id },
            data: parsed.data,
        });

        return NextResponse.json(updated);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        const status = msg.includes("autorizado") || msg.includes("permiso") ? 403 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}

// GET /api/workflows/[id] — get a single workflow with full run history
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        const workflow = await prisma.workflow.findUnique({
            where: { id },
            include: {
                nodos: { orderBy: { orden: "asc" } },
                runs: {
                    orderBy: { startedAt: "desc" },
                    take: 20,
                    include: { pasos: { orderBy: { createdAt: "asc" } } },
                },
                _count: { select: { nodos: true, runs: true } },
            },
        });

        if (!workflow) {
            return NextResponse.json({ error: "Workflow no encontrado" }, { status: 404 });
        }

        // Tenant boundary check
        if (!isAdmin && workflow.orgId !== user.orgId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        return NextResponse.json(workflow);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        const status = msg.includes("autorizado") || msg.includes("permiso") ? 403 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
