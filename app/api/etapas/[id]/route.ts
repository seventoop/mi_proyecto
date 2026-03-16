import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// PUT /api/etapas/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const etapa = await prisma.etapa.update({
            where: { id: params.id },
            data: {
                nombre: body.nombre,
                orden: body.orden,
                estado: body.estado,
            },
        });
        return NextResponse.json(etapa);
    } catch (error) {
        return NextResponse.json(
            { error: "Error al actualizar etapa" },
            { status: 500 }
        );
    }
}

// DELETE /api/etapas/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.etapa.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Etapa eliminada" });
    } catch (error) {
        return NextResponse.json(
            { error: "Error al eliminar etapa" },
            { status: 500 }
        );
    }
}
