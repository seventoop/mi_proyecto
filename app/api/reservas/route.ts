import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

// ─── GET /api/reservas — List with filters ───
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const proyecto = searchParams.get("proyecto");
    const vendedor = searchParams.get("vendedor");
    const estadoPago = searchParams.get("estadoPago");
    const search = searchParams.get("search");

    const where: any = {};
    if (estado) where.estado = estado;
    if (estadoPago) where.estadoPago = estadoPago;
    if (vendedor) where.vendedorId = vendedor;
    if (proyecto) {
        where.unidad = { manzana: { etapa: { proyectoId: proyecto } } };
    }
    if (search) {
        where.OR = [
            { lead: { nombre: { contains: search, mode: "insensitive" } } },
            { unidad: { numero: { contains: search, mode: "insensitive" } } },
        ];
    }

    const reservas = await prisma.reserva.findMany({
        where,
        include: {
            unidad: {
                include: {
                    manzana: {
                        include: {
                            etapa: {
                                include: { proyecto: { select: { id: true, nombre: true } } },
                            },
                        },
                    },
                },
            },
            lead: { select: { id: true, nombre: true, email: true, telefono: true } },
            vendedor: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Map for table consumption
    const rows = reservas.map((r) => ({
        id: r.id,
        unidadId: r.unidadId,
        unidadNumero: r.unidad.numero,
        proyectoNombre: r.unidad.manzana.etapa.proyecto.nombre,
        proyectoId: r.unidad.manzana.etapa.proyecto.id,
        clienteNombre: r.lead.nombre,
        clienteEmail: r.lead.email,
        clienteTelefono: r.lead.telefono,
        vendedorNombre: r.vendedor.nombre,
        vendedorId: r.vendedorId,
        leadId: r.leadId,
        fechaInicio: r.fechaInicio.toISOString(),
        fechaVencimiento: r.fechaVencimiento.toISOString(),
        montoSena: r.montoSena,
        estadoPago: r.estadoPago,
        estado: r.estado,
        documentoGenerado: r.documentoGenerado,
        createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(rows);
}

// ─── POST /api/reservas — Create new reservation ───
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { unidadId, leadId, vendedorId, plazo, montoSena, observaciones } = body;

        if (!unidadId || !leadId || !vendedorId) {
            return NextResponse.json({ error: "unidadId, leadId, vendedorId son requeridos" }, { status: 400 });
        }

        // 1. Check unit availability (optimistic locking)
        const unidad = await prisma.unidad.findUnique({
            where: { id: unidadId },
            include: {
                manzana: {
                    include: {
                        etapa: { include: { proyecto: { select: { nombre: true, ubicacion: true } } } },
                    },
                },
            },
        });

        if (!unidad) {
            return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
        }
        if (unidad.estado !== "DISPONIBLE") {
            return NextResponse.json(
                { error: `La unidad no está disponible (estado actual: ${unidad.estado})` },
                { status: 409 }
            );
        }

        // 2. Calculate deadline
        const now = new Date();
        const plazoHoras = plazo === "24hs" ? 24 : plazo === "48hs" ? 48 : plazo === "72hs" ? 72 : parseInt(plazo) || 48;
        const fechaVencimiento = new Date(now.getTime() + plazoHoras * 60 * 60 * 1000);

        // 3. Transaction: create reserva + update unit status
        const reserva = await prisma.$transaction(async (tx) => {
            // Double-check availability inside transaction
            const unitCheck = await tx.unidad.findUnique({ where: { id: unidadId } });
            if (unitCheck?.estado !== "DISPONIBLE") {
                throw new Error("CONFLICT: Unidad ya no está disponible");
            }

            // Update unit → RESERVADO
            await tx.unidad.update({
                where: { id: unidadId },
                data: { estado: "RESERVADO" },
            });

            // Create historial entry
            await tx.historialUnidad.create({
                data: {
                    unidadId,
                    usuarioId: vendedorId,
                    estadoAnterior: "DISPONIBLE",
                    estadoNuevo: "RESERVADO",
                    motivo: `Reserva creada para lead ${leadId}`,
                },
            });

            // Create reserva
            return tx.reserva.create({
                data: {
                    unidadId,
                    leadId,
                    vendedorId,
                    fechaVencimiento,
                    montoSena: montoSena || null,
                    estadoPago: "PENDIENTE",
                    estado: "ACTIVA",
                },
                include: {
                    lead: { select: { nombre: true } },
                    vendedor: { select: { nombre: true } },
                },
            });
        });

        // 4. Broadcast real-time event
        try {
            const pusher = getPusherServer();
            await pusher.trigger(CHANNELS.RESERVAS, EVENTS.RESERVA_CREATED, {
                reservaId: reserva.id,
                unidadId,
                estado: "RESERVADO",
            });
            await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
                unidadId,
                nuevoEstado: "RESERVADO",
            });
        } catch {
            // Non-blocking: Pusher may not be configured
        }

        return NextResponse.json(reserva, { status: 201 });
    } catch (error: any) {
        if (error.message?.includes("CONFLICT")) {
            return NextResponse.json({ error: "La unidad ya no está disponible" }, { status: 409 });
        }
        console.error("Error creating reserva:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
