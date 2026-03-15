"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireKYC, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { generateReservaPDF } from "@/lib/pdf-generator";
import { uploadFile } from "@/lib/storage";
import { createNotification } from "@/lib/actions/notifications";
import { idSchema } from "@/lib/validations";

// ─── Scemas ───

const confirmVentaSchema = z.object({
    reservaId: idSchema,
    precioFinal: z.number().optional(),
});

const reservaCreateSchema = z.object({
    unidadId: idSchema,
    leadId: idSchema,
    fechaVencimiento: z.string().or(z.date()),
    montoSena: z.number().positive("El monto de la seña debe ser positivo"),
});

// ─── Queries ───

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
        const user = await requireAuth();

        const where: any = {};

        // Role based access: Admins see all. Developers see their projects. Sellers see their sales.
        if (user.role !== "ADMIN") {
            where.OR = [
                { vendedorId: user.id },
                { unidad: { manzana: { etapa: { proyecto: { creadoPorId: user.id } } } } }
            ];
        }

        // Apply filters
        if (filters.estado && filters.estado !== "ALL") where.estado = filters.estado;
        if (filters.estadoPago) where.estadoPago = filters.estadoPago;
        if (filters.search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { lead: { nombre: { contains: filters.search, mode: "insensitive" } } },
                        { unidad: { numero: { contains: filters.search, mode: "insensitive" } } }
                    ]
                }
            ];
        }
        if (filters.proyecto) {
            where.unidad = {
                ...where.unidad,
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
                include: {
                    unidad: {
                        include: {
                            manzana: {
                                include: {
                                    etapa: {
                                        include: { proyecto: { select: { nombre: true } } }
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
            clienteNombre: (r as any).compradorNombre || r.lead?.nombre || "—",
            leadId: r.lead?.id ?? null,
            vendedorNombre: r.vendedor.nombre,
            fechaInicio: r.fechaInicio.toISOString(),
            fechaVencimiento: r.fechaVencimiento.toISOString(),
            estado: r.estado,
            estadoPago: r.estadoPago,
            montoSena: r.montoSena,
            documentoGenerado: r.documentoGenerado
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
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function createReserva(input: unknown) {
    try {
        const user = await requireKYC();

        const parsed = reservaCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Atomic logical lock: Try to update state only if it is "DISPONIBLE"
            const updated = await tx.unidad.updateMany({
                where: {
                    id: data.unidadId,
                    estado: "DISPONIBLE"
                },
                data: {
                    estado: "RESERVADA_PENDIENTE"
                }
            });

            if (updated.count === 0) {
                throw new Error("La unidad ya no está disponible");
            }

            // 2. Create the reservation
            const newReserva = await tx.reserva.create({
                data: {
                    unidadId: data.unidadId,
                    leadId: data.leadId,
                    vendedorId: user.id,
                    fechaInicio: new Date(),
                    fechaVencimiento: new Date(data.fechaVencimiento),
                    montoSena: data.montoSena,
                    estado: "PENDIENTE_APROBACION",
                    estadoPago: "PENDIENTE"
                }
            });

            // 3. Record in unit history
            await tx.historialUnidad.create({
                data: {
                    unidadId: data.unidadId,
                    usuarioId: user.id,
                    estadoAnterior: "DISPONIBLE",
                    estadoNuevo: "RESERVADA_PENDIENTE",
                    motivo: "Inicio de proceso de reserva"
                }
            });

            return newReserva;
        });

        revalidatePath("/dashboard/developer/reservas");
        return { success: true, data: result };
    } catch (error: any) {
        if (error.message === "La unidad ya no está disponible") {
            return { success: false, error: error.message };
        }
        return handleGuardError(error);
    }
}

/**
 * STP-P1-5: Hardened Approve Reserva with automated PDF and Notifications.
 */
export async function approveReserva(reservaId: string) {
    try {
        const idParsed = idSchema.safeParse(reservaId);
        if (!idParsed.success) return { success: false, error: "ID de reserva inválido" };

        const adminOrDev = await requireAuth();

        // 1. Fetch full data for validation and PDF
        const reserva = await prisma.reserva.findUnique({
            where: { id: reservaId },
            include: {
                unidad: {
                    include: {
                        manzana: {
                            include: {
                                etapa: {
                                    include: { proyecto: true }
                                }
                            }
                        }
                    }
                },
                lead: true,
                vendedor: true
            }
        });

        if (!reserva) return { success: false, error: "Reserva no encontrada" };

        const proyectoId = reserva.unidad.manzana.etapa.proyectoId;

        // 2. Ownership security check
        if (adminOrDev.role !== "ADMIN") {
            await requireProjectOwnership(proyectoId);
        }

        // 3. Atomic Transaction for Side-Effects
        const result = await prisma.$transaction(async (tx) => {
            // Update Unit
            await tx.unidad.update({
                where: { id: reserva.unidadId },
                data: { estado: "RESERVADA" }
            });

            // Update History
            await tx.historialUnidad.create({
                data: {
                    unidadId: reserva.unidadId,
                    usuarioId: adminOrDev.id,
                    estadoAnterior: (reserva.unidad as any).estado,
                    estadoNuevo: "RESERVADA",
                    motivo: "Reserva aprobada por administración"
                }
            });

            // Generate PDF Buffer (Awaited)
            const pdfBuffer = await generateReservaPDF({
                reservaId: reserva.id,
                fechaInicio: reserva.fechaInicio.toISOString(),
                fechaVencimiento: reserva.fechaVencimiento.toISOString(),
                montoSena: Number(reserva.montoSena) || 0,
                unidadNumero: reserva.unidad.numero,
                unidadTipo: reserva.unidad.tipo,
                unidadSuperficie: reserva.unidad.superficie || 0,
                unidadPrecio: reserva.unidad.precio || 0,
                unidadMoneda: reserva.unidad.moneda,
                proyectoNombre: reserva.unidad.manzana.etapa.proyecto.nombre,
                proyectoUbicacion: reserva.unidad.manzana.etapa.proyecto.ubicacion || "",
                clienteNombre: (reserva as any).compradorNombre || reserva.lead?.nombre || "—",
                clienteEmail: (reserva as any).compradorEmail || reserva.lead?.email || "",
                clienteTelefono: reserva.lead?.telefono || "",
                vendedorNombre: reserva.vendedor.nombre
            });

            // Upload PDF to storage
            const upload = await uploadFile({
                folder: "reservas",
                filename: `reserva-${reserva.id.slice(-8)}.pdf`,
                contentType: "application/pdf",
                buffer: pdfBuffer
            });

            // Update Reserva with PDF URL and status
            const updatedReserva = await tx.reserva.update({
                where: { id: reservaId },
                data: {
                    estado: "ACTIVA",
                    documentoGenerado: upload.url
                }
            });

            const clienteName = (reserva as any).compradorNombre || reserva.lead?.nombre || "Cliente";
            // Create Notification for the Seller
            await createNotification(
                reserva.vendedorId,
                "EXITO",
                "Reserva Aprobada",
                `La reserva para ${clienteName} en ${reserva.unidad.numero} ha sido aprobada.`,
                reserva.leadId ? `/dashboard/leads/${reserva.leadId}` : `/dashboard/proyectos`,
                true // Send Email
            );

            return updatedReserva;
        });

        revalidatePath("/dashboard/developer/reservas");
        revalidatePath("/dashboard/developer");
        return { success: true, documentoUrl: result.documentoGenerado };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function cancelReserva(reservaId: string) {
    try {
        const idParsed = idSchema.safeParse(reservaId);
        if (!idParsed.success) return { success: false, error: "ID de reserva inválido" };

        const user = await requireAuth();

        const reserva = await prisma.reserva.findUnique({
            where: { id: reservaId },
            include: {
                unidad: { include: { manzana: { include: { etapa: { include: { proyecto: true } } } } } },
                lead: true
            }
        });

        if (!reserva) return { success: false, error: "Reserva no encontrada" };

        // Permisos: ADMIN o Dueño del proyecto
        if (user.role !== "ADMIN" && reserva.unidad.manzana.etapa.proyecto.creadoPorId !== user.id && reserva.vendedorId !== user.id) {
            return { success: false, error: "No tienes permisos para cancelar esta reserva" };
        }

        await prisma.$transaction(async (tx) => {
            await tx.reserva.update({
                where: { id: reservaId },
                data: { estado: "CANCELADA" }
            });

            await tx.unidad.update({
                where: { id: reserva.unidadId },
                data: { estado: "DISPONIBLE" }
            });

            await tx.historialUnidad.create({
                data: {
                    unidadId: reserva.unidadId,
                    usuarioId: user.id,
                    estadoAnterior: (reserva.unidad as any).estado,
                    estadoNuevo: "DISPONIBLE",
                    motivo: "Reserva cancelada"
                }
            });

            // Create Notification for the Seller
            await createNotification(
                reserva.vendedorId,
                "ALERTA",
                "Reserva Cancelada",
                `La reserva para ${(reserva as any).compradorNombre || reserva.lead?.nombre || "Cliente"} en ${reserva.unidad.numero} ha sido cancelada.`,
                reserva.leadId ? `/dashboard/leads/${reserva.leadId}` : `/dashboard/proyectos`,
                true // Send Email
            );
        });

        revalidatePath("/dashboard/developer/reservas");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function cancelarReserva(id: string) {
    return cancelReserva(id);
}

export async function confirmarVenta(input: unknown) {
    try {
        const user = await requireRole("ADMIN");

        const parsed = confirmVentaSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "Datos de venta inválidos" };
        const { reservaId } = parsed.data;

        await prisma.$transaction(async (tx) => {
            const reserva = await tx.reserva.findUnique({
                where: { id: reservaId },
                include: {
                    unidad: {
                        include: {
                            manzana: {
                                include: { etapa: true }
                            }
                        }
                    },
                    lead: true
                }
            });
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

            await tx.historialUnidad.create({
                data: {
                    unidadId: reserva.unidadId,
                    usuarioId: user.id,
                    estadoAnterior: "RESERVADA",
                    estadoNuevo: "VENDIDA",
                    motivo: "Venta confirmada por administración"
                }
            });

            // Notify Vendedor and Owner
            const proyecto = await tx.proyecto.findUnique({
                where: { id: reserva.unidad.manzana.etapa.proyectoId },
                select: { creadoPorId: true }
            });

            await createNotification(
                reserva.vendedorId,
                "EXITO",
                "¡Venta Confirmada! 💰",
                `La venta de ${reserva.unidad.numero} para ${(reserva as any).compradorNombre || reserva.lead?.nombre || "Cliente"} ha sido confirmada.`,
                reserva.leadId ? `/dashboard/leads/${reserva.leadId}` : `/dashboard/proyectos`,
                true
            );

            if (proyecto && proyecto.creadoPorId !== reserva.vendedorId) {
                await createNotification(
                    proyecto.creadoPorId as string,
                    "EXITO",
                    "Nueva Venta de Unidad",
                    `Se ha confirmado la venta de la unidad ${reserva.unidad.numero}.`,
                    `/dashboard/proyectos/${reserva.unidad.manzana.etapa.proyectoId}`,
                    true
                );
            }
        });

        revalidatePath("/dashboard/developer/reservas");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── New actions for ReservaWizard + ReservasTab ───

export async function iniciarReserva(data: {
    unidadId: string;
    proyectoId: string;
    compradorNombre: string;
    compradorEmail?: string;
    notas?: string;
    montoSena?: number;
    fechaVencimiento: string;
}) {
    try {
        const user = await requireAuth();

        if (!data.unidadId || !data.compradorNombre || !data.fechaVencimiento) {
            return { success: false, error: "Datos incompletos" };
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.unidad.updateMany({
                where: { id: data.unidadId, estado: "DISPONIBLE" },
                data: { estado: "RESERVADA" }
            });

            if (updated.count === 0) {
                throw new Error("La unidad ya no está disponible");
            }

            const reserva = await (tx.reserva as any).create({
                data: {
                    unidadId: data.unidadId,
                    vendedorId: user.id,
                    compradorNombre: data.compradorNombre,
                    compradorEmail: data.compradorEmail ?? null,
                    notas: data.notas ?? null,
                    montoSena: data.montoSena ? data.montoSena : null,
                    fechaVencimiento: new Date(data.fechaVencimiento),
                    estado: "ACTIVA",
                    estadoPago: "PENDIENTE",
                }
            });

            await tx.historialUnidad.create({
                data: {
                    unidadId: data.unidadId,
                    usuarioId: user.id,
                    estadoAnterior: "DISPONIBLE",
                    estadoNuevo: "RESERVADA",
                    motivo: `Reserva iniciada para ${data.compradorNombre}`,
                }
            });

            return reserva;
        });

        revalidatePath(`/dashboard/admin/proyectos/${data.proyectoId}`);
        return { success: true, data: result };
    } catch (error: any) {
        if (error.message === "La unidad ya no está disponible") {
            return { success: false, error: error.message };
        }
        return handleGuardError(error);
    }
}

export async function avanzarEstadoReserva(reservaId: string, nuevoEstado: string, nota?: string) {
    try {
        const user = await requireAuth();
        const idParsed = idSchema.safeParse(reservaId);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const reserva = await (prisma.reserva as any).findUnique({
            where: { id: reservaId },
            include: { unidad: true }
        });

        if (!reserva) return { success: false, error: "Reserva no encontrada" };

        const estadoUnidad: Record<string, string> = {
            CANCELADA: "DISPONIBLE",
            VENDIDA: "VENDIDA",
            ACTIVA: "RESERVADA",
        };

        await prisma.$transaction(async (tx) => {
            await (tx.reserva as any).update({
                where: { id: reservaId },
                data: { estado: nuevoEstado, ...(nuevoEstado === "VENDIDA" ? { estadoPago: "PAGADO" } : {}) }
            });

            const nuevoEstadoUnidad = estadoUnidad[nuevoEstado];
            if (nuevoEstadoUnidad) {
                await tx.unidad.update({ where: { id: reserva.unidadId }, data: { estado: nuevoEstadoUnidad } });
            }

            await tx.historialUnidad.create({
                data: {
                    unidadId: reserva.unidadId,
                    usuarioId: user.id,
                    estadoAnterior: (reserva.unidad as any).estado,
                    estadoNuevo: nuevoEstadoUnidad ?? (reserva.unidad as any).estado,
                    motivo: nota ?? `Reserva ${nuevoEstado.toLowerCase()}`
                }
            });
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getReservasByProyecto(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        await requireProjectOwnership(proyectoId);

        const reservas = await (prisma.reserva as any).findMany({
            where: { unidad: { manzana: { etapa: { proyectoId } } } },
            orderBy: { createdAt: "desc" },
            include: {
                unidad: { select: { numero: true, precio: true, moneda: true } },
                lead: { select: { nombre: true, email: true } },
                vendedor: { select: { nombre: true } },
            }
        });

        return {
            success: true, data: reservas.map((r: any) => ({
                id: r.id,
                unidadNumero: r.unidad.numero,
                unidadPrecio: Number(r.unidad.precio || 0),
                moneda: r.unidad.moneda,
                compradorNombre: r.compradorNombre || r.lead?.nombre || "—",
                compradorEmail: r.compradorEmail || r.lead?.email || "",
                vendedorNombre: r.vendedor?.nombre || "—",
                estado: r.estado,
                estadoPago: r.estadoPago,
                montoSena: Number(r.montoSena || 0),
                notas: r.notas || "",
                fechaVencimiento: r.fechaVencimiento?.toISOString() ?? "",
                createdAt: r.createdAt.toISOString(),
            }))
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getUsuariosParaReserva() {
    try {
        await requireAuth();
        const users = await prisma.user.findMany({
            where: { rol: { in: ["ADMIN", "VENDEDOR", "DESARROLLADOR"] } },
            select: { id: true, nombre: true, rol: true }
        });
        return { success: true, data: users };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getReservasProyecto(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        await requireProjectOwnership(proyectoId);

        const reservas = await prisma.reserva.findMany({
            where: {
                unidad: {
                    manzana: { etapa: { proyectoId } }
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
        return handleGuardError(error);
    }
}
