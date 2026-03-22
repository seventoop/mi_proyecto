import { NextResponse } from "next/server";
import prisma from "@/lib/db";

async function findProyecto(idOrSlug: string) {
    return prisma.proyecto.findFirst({
        where: {
            OR: [
                { id: idOrSlug },
                { slug: idOrSlug },
            ],
        },
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
}

// GET /api/developments/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const proyecto = await findProyecto(params.id);

        if (!proyecto) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(proyecto);
    } catch (error) {
        console.error("Error fetching project:", error);
        return NextResponse.json(
            { error: "Error al obtener proyecto" },
            { status: 500 }
        );
    }
}

// PUT /api/developments/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const proyecto = await findProyecto(params.id);

        if (!proyecto) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        const updatedProyecto = await prisma.proyecto.update({
            where: { id: proyecto.id },
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

        return NextResponse.json(updatedProyecto);
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json(
            { error: "Error al actualizar proyecto" },
            { status: 500 }
        );
    }
}

// DELETE /api/developments/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const proyecto = await findProyecto(params.id);

        if (!proyecto) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        await prisma.proyecto.delete({
            where: { id: proyecto.id },
        });

        return NextResponse.json({ message: "Proyecto eliminado" });
    } catch (error) {
        console.error("Error deleting project:", error);
        return NextResponse.json(
            { error: "Error al eliminar proyecto" },
            { status: 500 }
        );
    }
}
