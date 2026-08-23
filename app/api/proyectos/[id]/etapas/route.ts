import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { handleApiGuardError, requireProjectOwnership } from "@/lib/guards";
import { idSchema } from "@/lib/validations";
import { z } from "zod";

const etapaCreateBodySchema = z.object({
    nombre: z.string().min(1, "Nombre de etapa requerido").max(100),
    estado: z.string().min(1).max(50).optional(),
});

// GET /api/proyectos/[id]/etapas
export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const idParsed = idSchema.safeParse(params.id);
        if (!idParsed.success) {
            return NextResponse.json({ error: "ID de proyecto inválido" }, { status: 400 });
        }

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

// POST /api/proyectos/[id]/etapas
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const idParsed = idSchema.safeParse(params.id);
        if (!idParsed.success) {
            return NextResponse.json({ error: "ID de proyecto inválido" }, { status: 400 });
        }

        await requireProjectOwnership(params.id);

        const body = await request.json();
        const parsed = etapaCreateBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

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
