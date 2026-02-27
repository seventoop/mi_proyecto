import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

// ─── GET /api/reservas/[id] — Single reservation detail ───
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const reserva = await prisma.reserva.findUnique({
        where: { id: params.id },
        include: {
            unidad: {
                include: {
                    manzana: {
                        include: {
                            etapa: {
                                include: {
                                    proyecto: {
                                        select: {
                                            id: true,
                                            nombre: true,
                                            ubicacion: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    historial: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                        include: { usuario: { select: { nombre: true } } },
                    },
                },
            },
            lead: {
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    telefono: true,
                },
            },
            vendedor: {
                select: { id: true, nombre: true, email: true },
            },
        },
    });

    if (!reserva) {
        return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    return NextResponse.json(reserva);
}

// ─── PUT /api/reservas/[id] — Update reservation ───
// Actions: registrarPago, extender, cancelar, convertir
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const { action, ...data } = body;

        const reserva = await prisma.reserva.findUnique({
            where: { id: params.id },
            include: {
                unidad: true,
                vendedor: { select: { id: true, nombre: true } },
                lead: { select: { nombre: true } },
            },
        });

        if (!reserva) {
            return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
        }

        let updated;
        const pusher = getPusherServer();

        switch (action) {
            case "registrarPago": {
                updated = await prisma.reserva.update({
                    where: { id: params.id },
                    data: {
                        estadoPago: "PAGADO",
                        montoSena: data.montoSena || reserva.montoSena,
                    },
                });
                break;
            }

            case "extender": {
                if (!data.nuevaFechaVencimiento) {
                    return NextResponse.json({ error: "nuevaFechaVencimiento es requerida" }, { status: 400 });
                }
                updated = await prisma.reserva.update({
                    where: { id: params.id },
                    data: {
                        fechaVencimiento: new Date(data.nuevaFechaVencimiento),
                    },
                });
                break;
            }

            case "cancelar": {
                updated = await prisma.$transaction(async (tx) => {
                    const res = await tx.reserva.update({
                        where: { id: params.id },
                        data: { estado: "CANCELADA" },
                    });

                    // Release unit → DISPONIBLE
                    await tx.unidad.update({
                        where: { id: reserva.unidadId },
                        data: { estado: "DISPONIBLE" },
                    });

                    await tx.historialUnidad.create({
                        data: {
                            unidadId: reserva.unidadId,
                            usuarioId: reserva.vendedorId,
                            estadoAnterior: "RESERVADO",
                            estadoNuevo: "DISPONIBLE",
                            motivo: `Reserva cancelada. Motivo: ${data.motivo || "No especificado"}`,
                        },
                    });

                    return res;
                });

                try {
                    await pusher.trigger(CHANNELS.RESERVAS, EVENTS.RESERVA_CANCELLED, {
                        reservaId: params.id,
                        unidadId: reserva.unidadId,
                    });
                    await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
                        unidadId: reserva.unidadId,
                        nuevoEstado: "DISPONIBLE",
                    });
                } catch { }
                break;
            }

            case "convertir": {
                updated = await prisma.$transaction(async (tx) => {
                    const res = await tx.reserva.update({
                        where: { id: params.id },
                        data: { estado: "CONVERTIDA" },
                    });

                    // Unit → VENDIDO
                    await tx.unidad.update({
                        where: { id: reserva.unidadId },
                        data: { estado: "VENDIDO" },
                    });

                    await tx.historialUnidad.create({
                        data: {
                            unidadId: reserva.unidadId,
                            usuarioId: reserva.vendedorId,
                            estadoAnterior: "RESERVADO",
                            estadoNuevo: "VENDIDO",
                            motivo: `Reserva convertida a venta`,
                        },
                    });

                    return res;
                });

                try {
                    await pusher.trigger(CHANNELS.RESERVAS, EVENTS.RESERVA_CONVERTED, {
                        reservaId: params.id,
                        unidadId: reserva.unidadId,
                    });
                    await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
                        unidadId: reserva.unidadId,
                        nuevoEstado: "VENDIDO",
                    });
                } catch { }
                break;
            }

            default:
                return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating reserva:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// ─── DELETE /api/reservas/[id] ───
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const reserva = await prisma.reserva.findUnique({
            where: { id: params.id },
        });

        if (!reserva) {
            return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.reserva.delete({ where: { id: params.id } });
            if (reserva.estado === "ACTIVA") {
                await tx.unidad.update({
                    where: { id: reserva.unidadId },
                    data: { estado: "DISPONIBLE" },
                });
            }
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting reserva:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
