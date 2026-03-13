import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireProjectOwnership, handleApiGuardError } from "@/lib/guards";

// GET /api/proyectos/[id] — detalle completo
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
                                        historial: {
                                            orderBy: { createdAt: "desc" },
                                            take: 5,
                                            include: {
                                                usuario: {
                                                    select: { id: true, nombre: true },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { orden: "asc" },
                },
                leads: {
                    take: 10,
                    orderBy: { createdAt: "desc" },
                },
                oportunidades: {
                    take: 10,
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!proyecto) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        // Compute stats
        const allUnidades = proyecto.etapas.flatMap((e) =>
            e.manzanas.flatMap((m) => m.unidades)
        );
        const stats = {
            totalUnidades: allUnidades.length,
            disponibles: allUnidades.filter((u) => u.estado === "DISPONIBLE").length,
            reservadas: allUnidades.filter((u) => u.estado === "RESERVADO").length,
            vendidas: allUnidades.filter((u) => u.estado === "VENDIDO").length,
            bloqueadas: allUnidades.filter((u) => u.estado === "BLOQUEADO").length,
            valorTotal: allUnidades.reduce((s, u) => s + (u.precio || 0), 0),
            valorVendido: allUnidades
                .filter((u) => u.estado === "VENDIDO")
                .reduce((s, u) => s + (u.precio || 0), 0),
            valorReservado: allUnidades
                .filter((u) => u.estado === "RESERVADO")
                .reduce((s, u) => s + (u.precio || 0), 0),
        };

        return NextResponse.json({ ...proyecto, stats });
    } catch (error) {
        console.error("Error fetching proyecto:", error);
        return NextResponse.json(
            { error: "Error al obtener proyecto" },
            { status: 500 }
        );
    }
}

// PUT /api/proyectos/[id] — actualizar
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

// DELETE /api/proyectos/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    // Re-use server action logic for consistency and security
    const { deleteProyecto } = await import("@/lib/actions/proyectos");
    const result = await deleteProyecto(params.id);

    if (!result.success) {
        return NextResponse.json(
            { error: result.error },
            { status: 403 } // Forbidden/Unauthorized
        );
    }

    return NextResponse.json({ message: "Proyecto eliminado" });
}
