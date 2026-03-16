import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/proyectos/[id]/etapas
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const etapas = await prisma.etapa.findMany({
            where: { proyectoId: params.id },
            include: {
                manzanas: {
                    include: {
                        _count: { select: { unidades: true } },
                    },
                },
            },
            orderBy: { orden: "asc" },
        });

        return NextResponse.json(etapas);
    } catch (error) {
        return NextResponse.json(
            { error: "Error al obtener etapas" },
            { status: 500 }
        );
    }
}

// POST /api/proyectos/[id]/etapas
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        // Get max orden
        const maxOrden = await prisma.etapa.findFirst({
            where: { proyectoId: params.id },
            orderBy: { orden: "desc" },
            select: { orden: true },
        });

        const etapa = await prisma.etapa.create({
            data: {
                proyectoId: params.id,
                nombre: body.nombre,
                orden: (maxOrden?.orden || 0) + 1,
                estado: body.estado || "PENDIENTE",
            },
        });

        return NextResponse.json(etapa, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Error al crear etapa" },
            { status: 500 }
        );
    }
}
