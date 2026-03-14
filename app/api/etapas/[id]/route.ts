import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError } from "@/lib/guards";

// PUT /api/etapas/[id]
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
        return handleApiGuardError(error);
    }
}

// DELETE /api/etapas/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
        await prisma.etapa.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Etapa eliminada" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
