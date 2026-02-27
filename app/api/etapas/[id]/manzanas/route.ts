import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/etapas/[id]/manzanas
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const manzana = await prisma.manzana.create({
            data: {
                etapaId: params.id,
                nombre: body.nombre,
                coordenadas: body.coordenadas || null,
            },
        });
        return NextResponse.json(manzana, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Error al crear manzana" },
            { status: 500 }
        );
    }
}
