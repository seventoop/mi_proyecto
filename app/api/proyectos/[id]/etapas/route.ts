import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError, requireProjectOwnership } from "@/lib/guards";

// GET /api/proyectos/[id]/etapas
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        await requireProjectOwnership(params.id);
        
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
        return handleApiGuardError(error);
    }
}

// POST handler removed to eliminate split-brain over mutations. Calls must use `createEtapa` Server Action.
