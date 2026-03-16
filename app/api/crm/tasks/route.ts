import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, handleApiGuardError } from "@/lib/guards";

import { createTaskSchema } from "@/lib/validations";

export async function POST(request: Request) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const validation = createTaskSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { errors: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { titulo, descripcion, fechaVencimiento, prioridad, leadId, proyectoId } = validation.data;

        // Create Task assigned to current user
        const task = await db.tarea.create({
            data: {
                titulo,
                descripcion,
                fechaVencimiento,
                prioridad,
                usuarioId: user.id,
                leadId: leadId || null,
                proyectoId: proyectoId || null,
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get("estado"); // PENDIENTE, COMPLETADA

        const where: any = {
            usuarioId: user.id
        };

        if (estado) {
            where.estado = estado;
        }

        // @security-waive: NO_ORG_FILTER - Query is scoped to current user
        const tasks = await db.tarea.findMany({
            where,
            orderBy: { fechaVencimiento: "asc" },
            include: {
                lead: { select: { nombre: true } },
                proyecto: { select: { nombre: true } }
            },
        });

        return NextResponse.json(tasks);
    } catch (error) {
        return handleApiGuardError(error);
    }
}
