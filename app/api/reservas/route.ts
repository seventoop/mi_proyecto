import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { requireAuth, requireKYC, handleApiGuardError, orgFilter } from "@/lib/guards";
import { reservaCreateSchema } from "@/lib/validations";

// ─── GET /api/reservas — List with filters ───
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(req.url);
        const estado = searchParams.get("estado");
        const proyecto = searchParams.get("proyecto");
        const vendedor = searchParams.get("vendedor");
        const estadoPago = searchParams.get("estadoPago");
        const search = searchParams.get("search");

        // Authorization: Multi-tenant scoping
        const where: any = {
            ...orgFilter(user) as any
        };

        if (estado) where.estado = estado;
        if (estadoPago) where.estadoPago = estadoPago;
        if (vendedor) where.vendedorId = vendedor;
        if (proyecto) {
            where.unidad = {
                ...where.unidad,
                manzana: { etapa: { proyectoId: proyecto } }
            };
        }
        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { lead: { nombre: { contains: search, mode: "insensitive" } } },
                        { unidad: { numero: { contains: search, mode: "insensitive" } } },
                    ]
                }
            ];
        }

        // @security-waive: NO_ORG_FILTER - Legacy project-wide query, owner check handled earlier
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
            clienteNombre: (r as any).compradorNombre || r.lead?.nombre || "—",
            clienteEmail: (r as any).compradorEmail || r.lead?.email || null,
            clienteTelefono: r.lead?.telefono ?? null,
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
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// ─── POST /api/reservas — Create new reservation ───
// POST handler removed to eliminate split-brain over mutations. Calls must use `createReserva` Server Action.
