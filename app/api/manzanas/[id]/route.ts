import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

const manzanaUpdateBodySchema = z.object({
    nombre: z.string().min(1, "Nombre requerido").max(100).optional(),
    coordenadas: z.string().optional().nullable(),
});

// PUT /api/manzanas/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) {
            return NextResponse.json({ error: "ID de manzana inválido" }, { status: 400 });
        }

        const existing = await prisma.manzana.findUnique({
            where: { id },
            select: {
                etapa: {
                    select: { proyecto: { select: { orgId: true } } },
                },
            },
        });
        if (!existing) return NextResponse.json({ error: "Manzana no encontrada" }, { status: 404 });

        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const orgId = existing.etapa?.proyecto?.orgId ?? null;
            if (!user.orgId || !orgId || orgId !== user.orgId) {
                return NextResponse.json({ error: "Manzana no encontrada" }, { status: 404 });
            }
        }

        const body = await request.json();
        const parsed = manzanaUpdateBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const manzana = await prisma.manzana.update({
            where: { id },
            data: {
                nombre: data.nombre,
                coordenadas: data.coordenadas,
            },
        });
        return NextResponse.json(manzana);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// DELETE /api/manzanas/[id]
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) {
            return NextResponse.json({ error: "ID de manzana inválido" }, { status: 400 });
        }

        const existing = await prisma.manzana.findUnique({
            where: { id },
            select: {
                etapa: {
                    select: { proyecto: { select: { orgId: true } } },
                },
            },
        });
        if (!existing) return NextResponse.json({ error: "Manzana no encontrada" }, { status: 404 });

        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const orgId = existing.etapa?.proyecto?.orgId ?? null;
            if (!user.orgId || !orgId || orgId !== user.orgId) {
                return NextResponse.json({ error: "Manzana no encontrada" }, { status: 404 });
            }
        }

        await prisma.manzana.delete({ where: { id } });
        return NextResponse.json({ message: "Manzana eliminada" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
