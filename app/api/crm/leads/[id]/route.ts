import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const updateLeadSchema = z.object({
    nombre: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal("")),
    telefono: z.string().optional(),
    origen: z.enum(["WEB", "WHATSAPP", "REFERIDO"]).optional(),
    nota: z.string().optional(), // If adding a new note
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

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

        return NextResponse.json(lead);
    } catch (error) {
        console.error("Error fetching lead:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const body = await request.json();
        const validation = updateLeadSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        const { nota, ...data } = validation.data;

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
                userId: session.user.id,
                userName: session.user.name || "Usuario"
            };

            updateData.notas = JSON.stringify([...currentNotas, newNota]);
        }

        const lead = await db.lead.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json(lead);
    } catch (error) {
        console.error("Error updating lead:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
