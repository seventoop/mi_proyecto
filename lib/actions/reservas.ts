"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

const idSchema = z.string().cuid();
const confirmVentaSchema = z.object({
    reservaId: z.string().cuid(),
    precioFinal: z.number().optional(),
});

export async function getReservas(
    page: number = 1,
    limit: number = 10,
    filters: {
        search?: string;
        estado?: string;
        proyecto?: string;
        vendedor?: string;
        estadoPago?: string;
    } = {}
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        const userId = session.user.id;
        const userRole = session.user.role;

        const where: any = {};

        // Role based access
        if (userRole !== "ADMIN") {
            where.OR = [
                { vendedorId: userId },
                { unidad: { manzana: { etapa: { proyecto: { creadoPorId: userId } } } } }
            ];
        }

        // Apply filters
        if (filters.estado && filters.estado !== "ALL") where.estado = filters.estado;
        if (filters.estadoPago) where.estadoPago = filters.estadoPago;
        if (filters.search) {
            where.OR = [
                { lead: { nombre: { contains: filters.search, mode: "insensitive" } } },
                { unidad: { numero: { contains: filters.search, mode: "insensitive" } } }
            ];
        }
        if (filters.proyecto) {
            where.unidad = {
                manzana: { etapa: { proyecto: { nombre: { contains: filters.proyecto, mode: "insensitive" } } } }
            };
        }
        if (filters.vendedor) {
            where.vendedor = { nombre: { contains: filters.vendedor, mode: "insensitive" } };
        }

        const [reservas, total] = await Promise.all([
            prisma.reserva.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    estado: true,
                    estadoPago: true,
                    montoSena: true,
                    fechaInicio: true,
                    fechaVencimiento: true,
                    unidad: {
                        select: {
                            numero: true,
                            manzana: {
                                select: {
                                    etapa: {
                                        select: {
                                            proyecto: { select: { nombre: true } }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    lead: { select: { id: true, nombre: true, email: true } },
                    vendedor: { select: { nombre: true } }
                }
            }),
            prisma.reserva.count({ where })
        ]);

        const formattedReservas = reservas.map(r => ({
            id: r.id,
            unidadNumero: r.unidad.numero,
            proyectoNombre: r.unidad.manzana.etapa.proyecto.nombre,
            clienteNombre: r.lead.nombre,
            leadId: r.lead.id,
            vendedorNombre: r.vendedor.nombre,
            fechaInicio: r.fechaInicio.toISOString(),
            fechaVencimiento: r.fechaVencimiento.toISOString(),
            estado: r.estado,
            estadoPago: r.estadoPago,
            montoSena: r.montoSena
        }));

        return {
            success: true,
            data: {
                reservas: formattedReservas,
                metadata: {
                    total,
                    page,
                    pageSize: limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error) {
        console.error("Error fetching reservas:", error);
        return { success: false, error: "Error al obtener reservas" };
    }
}

export async function createReserva(data: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        // 1. Validate Unit Availability
        const unidad = await prisma.unidad.findUnique({
            where: { id: data.unidadId }
        });

        if (!unidad || unidad.estado !== "DISPONIBLE") {
            return { success: false, error: "La unidad no está disponible" };
        }

        // 2. Create Reservation
        const newReserva = await prisma.reserva.create({
            data: {
                unidadId: data.unidadId,
                leadId: data.leadId,
                vendedorId: session.user.id,
                fechaInicio: new Date(),
                fechaVencimiento: new Date(data.fechaVencimiento), // Should be future date
                montoSena: parseFloat(data.montoSena) || 0,
                estado: "PENDIENTE_APROBACION",
                estadoPago: "PENDIENTE"
            }
        });

        // Optional: Block unit temporarily? For now we wait for approval.

        revalidatePath("/dashboard/developer/reservas");
        return { success: true, data: newReserva };
    } catch (error) {
        console.error("Error creating reserva:", error);
        return { success: false, error: "Error al crear reserva" };
    }
}

export async function approveReserva(reservaId: string) {
    try {
        // Transaction to update Reservation AND Unit
        await prisma.$transaction(async (tx) => {
            const reserva = await tx.reserva.findUnique({ where: { id: reservaId } });
            if (!reserva) throw new Error("Reserva no encontrada");

            // Update Reservation
            await tx.reserva.update({
                where: { id: reservaId },
                data: { estado: "ACTIVA" }
            });

            // Update Unit
            await tx.unidad.update({
                where: { id: reserva.unidadId },
                data: { estado: "RESERVADA" }
            });
        });

        revalidatePath("/dashboard/developer/reservas");
        revalidatePath("/dashboard/developer"); // Update dashboard stats
        return { success: true };
    } catch (error) {
        console.error("Error approving reserva:", error);
        return { success: false, error: "Error al aprobar reserva" };
    }
}

export async function cancelReserva(input: unknown) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        const parsed = idSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "ID de reserva inválido" };
        const reservaId = parsed.data;

        const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
        if (!reserva) return { success: false, error: "Reserva no encontrada" };

        // Autorización: ADMIN o el Vendedor que creó la reserva
        if (session.user.role !== "ADMIN" && reserva.vendedorId !== session.user.id) {
            return { success: false, error: "No tienes permisos para cancelar esta reserva" };
        }

        await prisma.$transaction(async (tx) => {
            // Update Reservation
            await tx.reserva.update({
                where: { id: reservaId },
                data: { estado: "CANCELADA" }
            });

            // Update Unit (Release it back)
            await tx.unidad.update({
                where: { id: reserva.unidadId },
                data: { estado: "DISPONIBLE" }
            });
        });

        revalidatePath("/dashboard/developer/reservas");
        revalidatePath("/dashboard/developer");
        return { success: true };
    } catch (error) {
        Sentry.captureException(error);
        console.error("[cancelReserva]", error);
        return { success: false, error: "Error interno al cancelar reserva" };
    }
}

// Alias used by reservas-list.tsx
export async function cancelarReserva(reservaId: string) {
    return cancelReserva(reservaId);
}

export async function confirmarVenta(input: unknown) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        if (session.user.role !== "ADMIN") return { success: false, error: "Sin permisos" };

        const parsed = confirmVentaSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "Datos de venta inválidos" };
        const { reservaId } = parsed.data;

        await prisma.$transaction(async (tx) => {
            const reserva = await tx.reserva.findUnique({ where: { id: reservaId } });
            if (!reserva) throw new Error("Reserva no encontrada");

            await tx.reserva.update({
                where: { id: reservaId },
                data: {
                    estado: "VENDIDA",
                    estadoPago: "PAGADO",
                }
            });

            await tx.unidad.update({
                where: { id: reserva.unidadId },
                data: { estado: "VENDIDA" }
            });
        });

        revalidatePath("/dashboard/developer/reservas");
        revalidatePath("/dashboard/developer");
        return { success: true };
    } catch (error) {
        Sentry.captureException(error);
        console.error("[confirmarVenta]", error);
        return { success: false, error: "Error interno al confirmar venta" };
    }
}

export async function getReservasProyecto(proyectoId: string) {
    try {
        const reservas = await prisma.reserva.findMany({
            where: {
                unidad: {
                    manzana: {
                        etapa: {
                            proyectoId
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            include: {
                unidad: { select: { numero: true } },
                lead: { select: { nombre: true, email: true } },
                vendedor: { select: { nombre: true } }
            }
        });

        return { success: true, data: reservas };
    } catch (error) {
        return { success: false, error: "Error al obtener reservas del proyecto" };
    }
}
