import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const proyectoCreateSchema = z.object({
    nombre: z.string().min(3).max(100),
    descripcion: z.string().optional().nullable(),
    ubicacion: z.string().optional().nullable(),
    estado: z.string().optional().default("PLANIFICACION"),
    tipo: z.string().optional().default("URBANIZACION"),
    imagenPortada: z.string().url().optional().nullable(),
    galeria: z.array(z.string()).optional().default([]),
    documentos: z.array(z.string()).optional().default([]),
    masterplanSVG: z.string().optional().nullable(),
});

// GET /api/proyectos — listar con stats agregadas
// ... (omitted)

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = proyectoCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const proyecto = await prisma.proyecto.create({
            data: {
                ...data,
                galeria: JSON.stringify(data.galeria),
                documentos: JSON.stringify(data.documentos),
            },
        });

        return NextResponse.json(proyecto, { status: 201 });
    } catch (error) {
        console.error("Error creating proyecto:", error);
        return NextResponse.json(
            { error: "Error al crear proyecto" },
            { status: 500 }
        );
    }
}
