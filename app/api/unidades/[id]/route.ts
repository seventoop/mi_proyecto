import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/unidades/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const unidad = await prisma.unidad.findUnique({
            where: { id: params.id },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: {
                                proyecto: {
                                    select: { id: true, nombre: true },
                                },
                            },
                        },
                    },
                },
                responsable: {
                    select: { id: true, nombre: true, email: true },
                },
                historial: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        usuario: { select: { id: true, nombre: true } },
                    },
                },
                reservas: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
            },
        });

        if (!unidad) {
            return NextResponse.json(
                { error: "Unidad no encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(unidad);
    } catch (error) {
        return NextResponse.json(
            { error: "Error al obtener unidad" },
            { status: 500 }
        );
    }
}

// PUT /api/unidades/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        // If estado changed, create history entry
        if (body.estado && body.previousEstado && body.estado !== body.previousEstado) {
            await prisma.historialUnidad.create({
                data: {
                    unidadId: params.id,
                    usuarioId: body.userId || "system",
                    estadoAnterior: body.previousEstado,
                    estadoNuevo: body.estado,
                    motivo: body.motivo || null,
                },
            });
        }

        const unidad = await prisma.unidad.update({
            where: { id: params.id },
            data: {
                numero: body.numero,
                tipo: body.tipo,
                manzanaId: body.manzanaId,
                superficie: body.superficie != null ? parseFloat(body.superficie) : undefined,
                frente: body.frente != null ? parseFloat(body.frente) : undefined,
                fondo: body.fondo != null ? parseFloat(body.fondo) : undefined,
                esEsquina: body.esEsquina,
                orientacion: body.orientacion,
                precio: body.precio != null ? parseFloat(body.precio) : undefined,
                moneda: body.moneda,
                financiacion: body.financiacion,
                estado: body.estado,
                coordenadasMasterplan: body.coordenadasMasterplan,
                imagenes: body.imagenes,
                tour360Url: body.tour360Url,
                responsableId: body.responsableId,
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

        return NextResponse.json(unidad);
    } catch (error) {
        console.error("Error updating unidad:", error);
        return NextResponse.json(
            { error: "Error al actualizar unidad" },
            { status: 500 }
        );
    }
}

// DELETE /api/unidades/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.unidad.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Unidad eliminada" });
    } catch (error) {
        return NextResponse.json(
            { error: "Error al eliminar unidad" },
            { status: 500 }
        );
    }
}
