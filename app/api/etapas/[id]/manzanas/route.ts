import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

const manzanaCreateBodySchema = z.object({
    nombre: z.string().min(1, "Nombre requerido").max(100),
    coordenadas: z.string().optional().nullable(),
});

// POST /api/etapas/[id]/manzanas
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);

        const etapaIdParsed = idSchema.safeParse(params.id);
        if (!etapaIdParsed.success) {
            return NextResponse.json({ error: "ID de etapa inválido" }, { status: 400 });
        }

        const body = await request.json();
        const parsed = manzanaCreateBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        // Tenant enforcement: etapa → proyecto → orgId
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const etapa = await prisma.etapa.findUnique({
                where: { id: params.id },
                select: { proyecto: { select: { orgId: true } } },
            });
            if (!etapa) {
                return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
            }
            const orgId = etapa.proyecto?.orgId ?? null;
            if (!user.orgId || !orgId || orgId !== user.orgId) {
                return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
            }
        } else {
            const etapa = await prisma.etapa.findUnique({ where: { id: params.id }, select: { id: true } });
            if (!etapa) {
                return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
            }
        }

        const manzana = await prisma.manzana.create({
            data: {
                etapaId: params.id,
                nombre: data.nombre,
                coordenadas: data.coordenadas ?? null,
            },
        });

        return NextResponse.json(manzana, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
