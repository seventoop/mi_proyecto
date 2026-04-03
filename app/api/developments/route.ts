import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

// GET /api/developments — listar todos los proyectos
export async function GET() {
    try {
        const user = await requireAnyRole(["ADMIN", "DESARROLLADOR", "VENDEDOR"]);

        const proyectos = await prisma.proyecto.findMany({
            where: {
                ...(user.role === "ADMIN" || user.role === "SUPERADMIN"
                    ? {}
                    : { orgId: user.orgId ?? "__none__" }),
                deletedAt: null,
            },
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        leads: true,
                        oportunidades: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(proyectos);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// POST /api/developments — crear nuevo proyecto
export async function POST(request: Request) {
    try {
        const user = await requireAnyRole(["ADMIN", "DESARROLLADOR"]);
        const body = await request.json();

        const proyecto = await prisma.proyecto.create({
            data: {
                nombre: body.nombre,
                descripcion: body.descripcion,
                ubicacion: body.ubicacion,
                estado: body.estado || "PLANIFICACION",
                tipo: body.tipo || "URBANIZACION",
                imagenPortada: body.imagenPortada,
                galeria: JSON.stringify(body.galeria || []),
                documentos: JSON.stringify(body.documentos || []),
                masterplanSVG: body.masterplanSVG,
                orgId: user.orgId ?? undefined,
                creadoPorId: user.id,
            },
        });

        return NextResponse.json(proyecto, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
