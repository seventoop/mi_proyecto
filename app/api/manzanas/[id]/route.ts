import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError } from "@/lib/guards";

// PUT /api/manzanas/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
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
        return handleApiGuardError(error);
    }
}

// DELETE /api/manzanas/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
        await prisma.manzana.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Manzana eliminada" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
