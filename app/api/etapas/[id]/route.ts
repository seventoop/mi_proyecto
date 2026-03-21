import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

const etapaUpdateBodySchema = z.object({
    nombre: z.string().min(1, "Nombre requerido").max(100).optional(),
    orden: z.number().int("El orden debe ser un entero").min(0).optional(),
    estado: z.string().min(1).max(50).optional(),
});

// PUT /api/etapas/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);

        const idParsed = idSchema.safeParse(params.id);
        if (!idParsed.success) {
            return NextResponse.json({ error: "ID de etapa inválido" }, { status: 400 });
        }

        const existing = await prisma.etapa.findUnique({
            where: { id: params.id },
            select: { proyectoId: true },
        });
        if (!existing) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });

        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: existing.proyectoId },
                select: { orgId: true },
            });
            if (!proyecto || !user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
                return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
            }
        }

        const body = await request.json();
        const parsed = etapaUpdateBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const etapa = await prisma.etapa.update({
            where: { id: params.id },
            data: {
                nombre: data.nombre,
                orden: data.orden,
                estado: data.estado,
            },
        });
        return NextResponse.json(etapa);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// DELETE /api/etapas/[id]
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);

        const idParsed = idSchema.safeParse(params.id);
        if (!idParsed.success) {
            return NextResponse.json({ error: "ID de etapa inválido" }, { status: 400 });
        }

        const existing = await prisma.etapa.findUnique({
            where: { id: params.id },
            select: { proyectoId: true },
        });
        if (!existing) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });

        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: existing.proyectoId },
                select: { orgId: true },
            });
            if (!proyecto || !user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
                return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
            }
        }

        await prisma.etapa.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Etapa eliminada" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
