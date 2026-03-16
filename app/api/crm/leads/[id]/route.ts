import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, handleApiGuardError } from "@/lib/guards";

function hasLeadAccess(sessionUser: any, leadOrgId: string | null): boolean {
    if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPERADMIN") return true;
    // A2: Leads without orgId are ADMIN-only after hardening.
    // If legacy leads exist without orgId, run scripts/backfill-lead-orgid.ts first.
    if (!leadOrgId) return false;
    return (sessionUser as any).orgId === leadOrgId;
}

import { leadUpdateSchema } from "@/lib/validations";

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const user = await requireAuth();

        const lead = await db.lead.findUnique({
            where: { id: params.id },
            include: {
                oportunidades: true,
                reservas: true,
                tareas: {
                    orderBy: { fechaVencimiento: "asc" }
                },
                proyecto: true,
                asignadoA: {
                    select: { id: true, nombre: true, email: true }
                }
            },
        });

        if (!lead) {
            return NextResponse.json({ message: "Lead no encontrado" }, { status: 404 });
        }

        if (!hasLeadAccess(user, lead.orgId)) {
            return NextResponse.json({ message: "Lead no encontrado" }, { status: 404 });
        }

        return NextResponse.json(lead);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const user = await requireAuth();

        // IDOR check: verify the lead belongs to the user's org before mutating
        const existingLead = await db.lead.findUnique({
            where: { id: params.id },
            select: { orgId: true },
        });
        if (!existingLead) {
            return NextResponse.json({ message: "Lead no encontrado" }, { status: 404 });
        }
        if (!hasLeadAccess(user, existingLead.orgId)) {
            return NextResponse.json({ message: "Lead no encontrado" }, { status: 404 });
        }

        const body = await request.json();
        const validation = leadUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        const { nota, ...data } = validation.data as typeof validation.data & { nota?: string };

        const updateData: any = { ...data };

        if (nota) {
            // For SQLite compatibility, we must fetch, modify, and set the array
            // instead of using atomic push operations.
            const currentLead = await db.lead.findUnique({
                where: { id: params.id },
                select: { notas: true }
            });

            // Parse existing JSON string
            let currentNotas = [];
            try {
                currentNotas = JSON.parse((currentLead?.notas as string) || "[]");
                if (!Array.isArray(currentNotas)) currentNotas = [];
            } catch (e) {
                currentNotas = [];
            }

            const newNota = {
                fecha: new Date(),
                texto: nota,
                userId: user.id,
                userName: user.name || "Usuario"
            };

            updateData.notas = JSON.stringify([...currentNotas, newNota]);
        }

        const lead = await db.lead.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json(lead);
    } catch (error) {
        return handleApiGuardError(error);
    }
}
