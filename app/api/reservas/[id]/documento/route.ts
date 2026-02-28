import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateReservaPDF } from "@/lib/pdf-generator";
import { requireAuth, handleApiGuardError } from "@/lib/guards";

// ─── GET /api/reservas/[id]/documento — Generate & download PDF ───
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

        // Authorization: Admin, Project Owner, or Seller
        const isAdmin = user.role === "ADMIN";
        const isOwner = reserva.unidad.manzana.etapa.proyecto.creadoPorId === user.id;
        const isSeller = reserva.vendedorId === user.id;

        if (!isAdmin && !isOwner && !isSeller) {
            return NextResponse.json({ error: "No autorizado para descargar este documento" }, { status: 403 });
        }

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

            clienteNombre: reserva.lead.nombre,
            clienteEmail: reserva.lead.email,
            clienteTelefono: reserva.lead.telefono,

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
