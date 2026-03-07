import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/developments — listar todos los proyectos
export async function GET() {
    try {
        const proyectos = await prisma.proyecto.findMany({
            where: {
                visibilityStatus: "PUBLICADO",
                estado: { not: "SUSPENDIDO" },
                deletedAt: null,
                OR: [
                    { isDemo: false },
                    {
                        isDemo: true,
                        demoExpiresAt: { gt: new Date() }
                    }
                ]
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
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { error: "Error al obtener proyectos" },
            { status: 500 }
        );
    }
}

// POST /api/developments — crear nuevo proyecto
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const proyecto = await prisma.proyecto.create({
            data: {
                nombre: body.nombre,
                descripcion: body.descripcion,
                ubicacion: body.ubicacion,
                estado: body.estado || "PLANIFICACION",
                tipo: body.tipo || "URBANIZACION",
                imagenPortada: body.imagenPortada,
                galeria: body.galeria || [],
                documentos: body.documentos || [],
                masterplanSVG: body.masterplanSVG,
                // masterplanConfig: body.masterplanConfig,
            },
        });

        return NextResponse.json(proyecto, { status: 201 });
    } catch (error) {
        console.error("Error creating project:", error);
        return NextResponse.json(
            { error: "Error al crear proyecto" },
            { status: 500 }
        );
    }
}
