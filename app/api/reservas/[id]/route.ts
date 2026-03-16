import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { requireAuth, requireRole, handleApiGuardError } from "@/lib/guards";

// ─── GET /api/reservas/[id] — Single reservation detail ───
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

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
                                                creadoPorId: true,
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

        // Authorization Check
        const isOwner = reserva.unidad.manzana.etapa.proyecto.creadoPorId === user.id;
        const isSeller = reserva.vendedorId === user.id;
        const isAdmin = user.role === "ADMIN";

        if (!isAdmin && !isOwner && !isSeller) {
            return NextResponse.json({ error: "No autorizado para ver esta reserva" }, { status: 403 });
        }

        return NextResponse.json(reserva);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// ─── PUT /api/reservas/[id] — Update reservation ───
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        const body = await req.json();
        const { action, ...data } = body;

        const reserva = await prisma.reserva.findUnique({
            where: { id: params.id },
            include: {
                unidad: { include: { manzana: { include: { etapa: { include: { proyecto: true } } } } } },
                vendedor: { select: { id: true, nombre: true } },
                lead: { select: { nombre: true } },
            },
        });

        if (!reserva) {
            return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
        }

        const isAdmin = user.role === "ADMIN";
        const isOwner = reserva.unidad.manzana.etapa.proyecto.creadoPorId === user.id;
        const isSeller = reserva.vendedorId === user.id;

        let updated;
        const pusher = getPusherServer();

        switch (action) {
            case "registrarPago": {
                if (!isAdmin && !isOwner) {
                    return NextResponse.json({ error: "No autorizado para registrar pagos" }, { status: 403 });
                }
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
                if (!isAdmin && !isOwner) {
                    return NextResponse.json({ error: "No autorizado para extender reservas" }, { status: 403 });
                }
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
                if (!isAdmin && !isOwner && !isSeller) {
                    return NextResponse.json({ error: "No autorizado para cancelar esta reserva" }, { status: 403 });
                }
                updated = await prisma.$transaction(async (tx) => {
                    const res = await tx.reserva.update({
                        where: { id: params.id },
                        data: { estado: "CANCELADA" },
                    });

                    await tx.unidad.update({
                        where: { id: reserva.unidadId },
                        data: { estado: "DISPONIBLE" },
                    });

                    await tx.historialUnidad.create({
                        data: {
                            unidadId: reserva.unidadId,
                            usuarioId: user.id,
                            estadoAnterior: "RESERVADO",
                            estadoNuevo: "DISPONIBLE",
                            motivo: `Reserva cancelada (${user.role}). Motivo: ${data.motivo || "No especificado"}`,
                        },
                    });

                    return res;
                });

                try {
                    if (pusher) {
                        await pusher.trigger(CHANNELS.RESERVAS, EVENTS.RESERVA_CANCELLED, {
                            reservaId: params.id,
                            unidadId: reserva.unidadId,
                        });
                        await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
                            unidadId: reserva.unidadId,
                            nuevoEstado: "DISPONIBLE",
                        });
                    }
                } catch { }
                break;
            }

            case "convertir": {
                // Hardening: Only ADMIN should confirm final sales usually, or owner.
                if (!isAdmin) {
                    return NextResponse.json({ error: "Solo administradores pueden confirmar ventas finales" }, { status: 403 });
                }
                updated = await prisma.$transaction(async (tx) => {
                    const res = await tx.reserva.update({
                        where: { id: params.id },
                        data: { estado: "CONVERTIDA" },
                    });

                    await tx.unidad.update({
                        where: { id: reserva.unidadId },
                        data: { estado: "VENDIDO" },
                    });

                    await tx.historialUnidad.create({
                        data: {
                            unidadId: reserva.unidadId,
                            usuarioId: user.id,
                            estadoAnterior: "RESERVADO",
                            estadoNuevo: "VENDIDO",
                            motivo: `Reserva convertida a venta por Admin`,
                        },
                    });

                    return res;
                });

                try {
                    if (pusher) {
                        await pusher.trigger(CHANNELS.RESERVAS, EVENTS.RESERVA_CONVERTED, {
                            reservaId: params.id,
                            unidadId: reserva.unidadId,
                        });
                        await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
                            unidadId: reserva.unidadId,
                            nuevoEstado: "VENDIDO",
                        });
                    }
                } catch { }
                break;
            }

            default:
                return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// ─── DELETE /api/reservas/[id] ───
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("ADMIN");

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
        return handleApiGuardError(error);
    }
}
