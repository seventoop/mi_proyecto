import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { requireAuth, requireRole, handleApiGuardError, orgFilter } from "@/lib/guards";
import { reservaUpdateActionSchema } from "@/lib/validations";

// ─── GET /api/reservas/[id] — Single reservation detail ───
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        const reserva = await prisma.reserva.findUnique({
            where: { 
                id: params.id,
                ...orgFilter(user) as any
            },
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

// PUT handler removed to eliminate split-brain over mutations. Calls must use `gestionarReserva` Server Action.
