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

// POST /api/proyectos/[id]/etapas
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

        // 🛡️ STRICT VALIDATION
        const validation = etapaCreateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        const data = validation.data;

        // Get max orden
        const maxOrden = await prisma.etapa.findFirst({
            where: { proyectoId: params.id },
            orderBy: { orden: "desc" },
            select: { orden: true },
        });

        const etapa = await prisma.etapa.create({
            data: {
                proyectoId: params.id,
                nombre: data.nombre,
                orden: (maxOrden?.orden || 0) + 1,
                estado: data.estado || "PENDIENTE",
            },
        });

        return NextResponse.json(etapa, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
