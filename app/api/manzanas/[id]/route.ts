import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// PUT /api/manzanas/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const manzana = await prisma.manzana.update({
            where: { id: params.id },
            data: {
                nombre: body.nombre,
                coordenadas: body.coordenadas,
            },
        });
        return NextResponse.json(manzana);
    } catch (error) {
        return NextResponse.json(
            { error: "Error al actualizar manzana" },
            { status: 500 }
        );
    }
}

// DELETE /api/manzanas/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.manzana.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Manzana eliminada" });
    } catch (error) {
        return NextResponse.json(
            { error: "Error al eliminar manzana" },
            { status: 500 }
        );
    }
}
