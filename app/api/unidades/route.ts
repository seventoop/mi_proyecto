import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const unitCreateSchema = z.object({
    manzanaId: z.string().cuid(),
    numero: z.string().min(1),
    tipo: z.string().optional().default("LOTE"),
    superficie: z.number().optional().nullable(),
    frente: z.number().optional().nullable(),
    fondo: z.number().optional().nullable(),
    esEsquina: z.boolean().optional().default(false),
    orientacion: z.string().optional().nullable(),
    precio: z.number().optional().nullable(),
    moneda: z.string().optional().default("USD"),
    financiacion: z.string().optional().nullable(),
    estado: z.string().optional().default("DISPONIBLE"),
    coordenadasMasterplan: z.string().optional().nullable(),
    imagenes: z.array(z.string()).optional().default([]),
    tour360Url: z.string().optional().nullable(),
    responsableId: z.string().cuid().optional().nullable(),
});

// GET /api/unidades — listar con filtros
// ... (omitted for brevity in replace_file_content but keeping the structure)

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = unitCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const unidad = await prisma.unidad.create({
            data: {
                ...data,
                imagenes: JSON.stringify(data.imagenes)
            },
            include: {
                manzana: {
                    include: {
                        etapa: { select: { id: true, nombre: true } },
                    },
                },
                responsable: {
                    select: { id: true, nombre: true },
                },
            },
        });

        return NextResponse.json(unidad, { status: 201 });
    } catch (error) {
        console.error("Error creating unidad:", error);
        return NextResponse.json(
            { error: "Error al crear unidad" },
            { status: 500 }
        );
    }
}
