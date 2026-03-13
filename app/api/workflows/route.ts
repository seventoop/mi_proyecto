import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/guards";
import prisma from "@/lib/db";
import { z } from "zod";
import { checkPlanLimit } from "@/lib/saas/limits";

const nodoSchema = z.object({
    tipo: z.enum(["WAIT", "AI_ACTION", "SEND_EMAIL", "UPDATE_LEAD", "CONDITION", "WEBHOOK"]),
    orden: z.number().int().min(0),
    config: z.record(z.string(), z.unknown()).default({}),
});

const createWorkflowSchema = z.object({
    nombre: z.string().min(1),
    descripcion: z.string().optional(),
    trigger: z.enum(["NEW_LEAD", "LEAD_STATUS_CHANGE", "MANUAL", "SCHEDULED"]),
    nodos: z.array(nodoSchema).default([]),
});

// GET /api/workflows — list workflows for the caller's org
export async function GET() {
    try {
        const user = await requireAnyRole(["ADMIN", "DESARROLLADOR"]);
        const where = user.role === "ADMIN" ? {} : { orgId: user.orgId ?? "___NO_ORG___" };

        const workflows = await prisma.workflow.findMany({
            where,
            include: {
                _count: { select: { nodos: true, runs: true } },
                runs: {
                    orderBy: { startedAt: "desc" },
                    take: 1,
                    select: { estado: true, startedAt: true, finishedAt: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(workflows);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        const status = msg.includes("autorizado") || msg.includes("permiso") ? 403 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}

// POST /api/workflows — create a new workflow
export async function POST(request: Request) {
    try {
        const user = await requireAnyRole(["ADMIN", "DESARROLLADOR"]);

        if (!user.orgId && user.role !== "ADMIN") {
            return NextResponse.json({ error: "Usuario sin organización" }, { status: 400 });
        }

        // M5: Plan enforcement — check if org's plan includes workflows feature
        if (user.orgId) {
            const planCheck = await checkPlanLimit(user.orgId, "workflows");
            if (!planCheck.allowed) {
                return NextResponse.json({ error: planCheck.reason }, { status: 403 });
            }
        }

        const body = await request.json();
        const parsed = createWorkflowSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const { nombre, descripcion, trigger, nodos } = parsed.data;
        const orgId = user.orgId!;

        const workflow = await prisma.workflow.create({
            data: {
                orgId,
                nombre,
                descripcion,
                trigger,
                nodos: {
                    create: nodos.map((n) => ({
                        tipo: n.tipo,
                        orden: n.orden,
                        config: n.config as object,
                    })),
                },
            },
            include: { nodos: { orderBy: { orden: "asc" } } },
        });

        return NextResponse.json(workflow, { status: 201 });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        const status = msg.includes("autorizado") || msg.includes("permiso") ? 403 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
