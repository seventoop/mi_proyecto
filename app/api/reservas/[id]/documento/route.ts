import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateReservaPDF } from "@/lib/pdf-generator";
import { requireAuth, requireReservaPermission, handleApiGuardError } from "@/lib/guards";

// ─── GET /api/reservas/[id]/documento — Generate & download PDF ───
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireAuth();

        const reserva = await prisma.reserva.findUnique({
            where: { id: id },
            include: {
                unidad: {
                    include: {
                        manzana: {
                            include: {
                                etapa: {
                                    include: {
                                        proyecto: {
                                            select: { id: true, nombre: true, ubicacion: true, creadoPorId: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                lead: { select: { nombre: true, email: true, telefono: true } },
                vendedor: { select: { nombre: true } },
            },
        });

        if (!reserva) {
            return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
        }

        // Security: Use canonical guard for consistent bypass and tenant isolation
        await requireReservaPermission(id);

        const pdfBuffer = await generateReservaPDF({
            reservaId: reserva.id,
            fechaInicio: reserva.fechaInicio.toISOString(),
            fechaVencimiento: reserva.fechaVencimiento.toISOString(),
            montoSena: Number(reserva.montoSena),

            unidadNumero: reserva.unidad.numero,
            unidadTipo: reserva.unidad.tipo,
            unidadSuperficie: Number(reserva.unidad.superficie),
            unidadPrecio: Number(reserva.unidad.precio),
            unidadMoneda: reserva.unidad.moneda,

            proyectoNombre: reserva.unidad.manzana.etapa.proyecto.nombre,
            proyectoUbicacion: reserva.unidad.manzana.etapa.proyecto.ubicacion,

            clienteNombre: reserva.lead?.nombre ?? "",
            clienteEmail: reserva.lead?.email ?? "",
            clienteTelefono: reserva.lead?.telefono ?? "",

            vendedorNombre: reserva.vendedor.nombre,
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="reserva-${reserva.id.slice(-8)}.pdf"`,
            },
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
