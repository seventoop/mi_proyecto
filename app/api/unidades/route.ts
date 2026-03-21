import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

const unitCreateSchema = z.object({
    manzanaId: z.string().cuid(),
    numero: z.string().min(1),
    tipo: z.string().optional().default("LOTE"),
    superficie: z.number().optional().nullable(),
    frente: z.number().optional().nullable(),
    fondo: z.number().optional().nullable(),
    esEsquina: z.boolean().optional().default(false),
    orientacion: z.string().optional().nullable(),
    precio: z.number().optional().nullable(),
    moneda: z.string().optional().default("USD"),
    financiacion: z.string().optional().nullable(),
    estado: z.string().optional().default("DISPONIBLE"),
    coordenadasMasterplan: z.string().optional().nullable(),
    imagenes: z.array(z.string()).optional().default([]),
    tour360Url: z.string().optional().nullable(),
    responsableId: z.string().cuid().optional().nullable(),
});

// POST /api/unidades — crear unidad
export async function POST(request: NextRequest) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        const body = await request.json();
        const parsed = unitCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        // Fail-secure tenant check: manzana must belong to the user's org
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const manzana = await prisma.manzana.findUnique({
                where: { id: data.manzanaId },
                select: {
                    etapa: { select: { proyecto: { select: { orgId: true } } } },
                },
            });
            if (!manzana) {
                return NextResponse.json({ error: "Manzana no encontrada" }, { status: 404 });
            }
            const orgId = manzana.etapa?.proyecto?.orgId ?? null;
            if (!user.orgId || !orgId || orgId !== user.orgId) {
                return NextResponse.json({ error: "Manzana no encontrada" }, { status: 404 });
            }

            // If responsableId provided, ensure they belong to the same org
            if (data.responsableId) {
                const responsable = await prisma.user.findUnique({
                    where: { id: data.responsableId },
                    select: { orgId: true },
                });
                if (!responsable) {
                    return NextResponse.json({ error: "Responsable no encontrado" }, { status: 404 });
                }
                if (responsable.orgId && responsable.orgId !== user.orgId) {
                    return NextResponse.json({ error: "Responsable no encontrado" }, { status: 404 });
                }
            }
        }

        const unidad = await prisma.unidad.create({
            data: {
                ...data,
                imagenes: JSON.stringify(data.imagenes),
            },
            include: {
                manzana: {
                    include: {
                        etapa: { select: { id: true, nombre: true } },
                    },
                },
                responsable: {
                    select: { id: true, nombre: true },
                },
            },
        });

        return NextResponse.json(unidad, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
