import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Schema validation for creating a task
const createTaskSchema = z.object({
    titulo: z.string().min(1, "El título es obligatorio"),
    descripcion: z.string().optional(),
    fechaVencimiento: z.string().transform((str) => new Date(str)),
    prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]).default("MEDIA"),
    leadId: z.string().optional(),
    proyectoId: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });
        }

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
                usuarioId: session.user.id,
                leadId: leadId || null,
                proyectoId: proyectoId || null,
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get("estado"); // PENDIENTE, COMPLETADA

        const where: any = {
            usuarioId: session.user.id
        };

        if (estado) {
            where.estado = estado;
        }

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
        console.error("Error fetching tasks:", error);
        return NextResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
