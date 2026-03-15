import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError } from "@/lib/guards";
import { etapaCreateSchema } from "@/lib/validations";

// GET /api/proyectos/[id]/etapas
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth();
        // @security-waive: NO_ORG_FILTER - Scoped by proyectoId
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
