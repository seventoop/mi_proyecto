import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { requireCronSecret } from "@/lib/guards";

// ─── POST /api/cron/check-reservas — Auto-expire overdue reservations ───
// Called by Vercel Cron every hour via POST
// Vercel cron config in vercel.json:
// { "crons": [{ "path": "/api/cron/check-reservas", "schedule": "0 * * * *" }] }
export async function POST(req: NextRequest) {
    try {
        requireCronSecret(req);
        const now = new Date();

        // Find active reservas past their deadline without paid deposit
        const expiredReservas = await prisma.reserva.findMany({
            where: {
                estado: "ACTIVA",
                fechaVencimiento: { lt: now },
                estadoPago: "PENDIENTE",
            },
            include: {
                vendedor: { select: { id: true, nombre: true } },
                unidad: { select: { id: true, numero: true } },
                lead: { select: { nombre: true } },
            },
        });

        if (expiredReservas.length === 0) {
            return NextResponse.json({ expired: 0, message: "No hay reservas vencidas" });
        }

        // Batch update all expired reservas in a transaction
        const results = await prisma.$transaction(async (tx) => {
            const processed: string[] = [];

            for (const reserva of expiredReservas) {
                // Update reserva → VENCIDA
                await tx.reserva.update({
                    where: { id: reserva.id },
                    data: { estado: "VENCIDA" },
                });

                // Release unit → DISPONIBLE
                await tx.unidad.update({
                    where: { id: reserva.unidadId },
                    data: { estado: "DISPONIBLE" },
                });

                // Create historial entry
                await tx.historialUnidad.create({
                    data: {
                        unidadId: reserva.unidadId,
                        usuarioId: reserva.vendedorId,
                        estadoAnterior: "RESERVADO",
                        estadoNuevo: "DISPONIBLE",
                        motivo: `Reserva vencida automáticamente (sin seña pagada)`,
                    },
                });

                processed.push(reserva.id);
            }

            return processed;
        });

        // Broadcast events (non-blocking)
        try {
            const pusher = getPusherServer();
            for (const reserva of expiredReservas) {
                await pusher.trigger(CHANNELS.RESERVAS, EVENTS.RESERVA_EXPIRED, {
                    reservaId: reserva.id,
                    unidadId: reserva.unidadId,
                    unidadNumero: reserva.unidad.numero,
                    vendedorId: reserva.vendedorId,
                });
                await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
                    unidadId: reserva.unidadId,
                    nuevoEstado: "DISPONIBLE",
                });
            }
        } catch {
            // Pusher may not be configured
        }

        return NextResponse.json({
            expired: results.length,
            reservaIds: results,
            message: `${results.length} reservas vencidas procesadas`,
        });
    } catch (error) {
        console.error("Error in cron check-reservas:", error);
        return NextResponse.json({ error: "Error procesando reservas" }, { status: 500 });
    }
}
