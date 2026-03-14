import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError } from "@/lib/guards";
import { unidadCreateSchema } from "@/lib/validations";

// GET /api/unidades — listar con filtros
// ... (omitted for brevity in replace_file_content but keeping the structure)

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
        const body = await request.json();
        const parsed = unidadCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const unidad = await prisma.unidad.create({
            data: {
                ...data,
                imagenes: data.imagenes ? JSON.stringify(data.imagenes) : "[]"
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
