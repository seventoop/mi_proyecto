import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireProjectOwnership, handleApiGuardError } from "@/lib/guards";

// GET /api/developments/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: params.id },
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: {
                                    include: {
                                        responsable: {
                                            select: { id: true, nombre: true, email: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { orden: "asc" },
                },
                leads: true,
                oportunidades: true,
            },
        });

        if (!proyecto) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(proyecto);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// PUT /api/developments/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);
        const body = await request.json();

        const proyecto = await prisma.proyecto.update({
            where: { id: params.id },
            data: {
                nombre: body.nombre,
                descripcion: body.descripcion,
                ubicacion: body.ubicacion,
                estado: body.estado,
                tipo: body.tipo,
                imagenPortada: body.imagenPortada,
                galeria: body.galeria,
                documentos: body.documentos,
                masterplanSVG: body.masterplanSVG,
                // masterplanConfig: body.masterplanConfig,
            },
        });

        return NextResponse.json(proyecto);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// DELETE /api/developments/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);
        await prisma.proyecto.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Proyecto eliminado" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
