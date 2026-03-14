import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError } from "@/lib/guards";

// POST /api/etapas/[id]/manzanas
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
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
        return handleApiGuardError(error);
    }
}
