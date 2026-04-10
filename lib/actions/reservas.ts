"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { generateReservaPDF } from "@/lib/pdf-generator";
import { uploadFile } from "@/lib/storage";
import { createNotification } from "@/lib/actions/notifications";
import { idSchema } from "@/lib/validations";
import { audit } from "@/lib/actions/audit";
import { getProjectAccess, assertPermission, ProjectPermission } from "@/lib/project-access";

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

        // Role based access: Admins/Superadmins see all.
        // Non-admin: own reservas (vendedorId) always visible.
        // Projects with global metric access (OWNER, COMERCIALIZADOR_EXCLUSIVO) → all reservas.
        // Projects with own-only access → covered by vendedorId filter.
        // Legacy (creadoPorId, no ProyectoUsuario row) → treated as full-access OWNER.
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const relaciones = await prisma.proyectoUsuario.findMany({
                where: { userId: user.id, estadoRelacion: "ACTIVA" },
                select: { proyectoId: true, permisoVerMetricasGlobales: true },
            });
            const globalIds = relaciones
                .filter(r => r.permisoVerMetricasGlobales)
                .map(r => r.proyectoId);

            // Legacy: projects created by user with no ProyectoUsuario row
            const legacyProjects = await prisma.proyecto.findMany({
                where: {
                    creadoPorId: user.id,
                    deletedAt: null,
                    NOT: { usuariosRelaciones: { some: { userId: user.id } } },
                },
                select: { id: true },
            });
            const legacyIds = legacyProjects.map(p => p.id);

            const allGlobalIds = [...globalIds, ...legacyIds].filter((id, i, arr) => arr.indexOf(id) === i);

            const orClauses: any[] = [{ vendedorId: user.id }];
            if (allGlobalIds.length > 0) {
                orClauses.push({
                    unidad: { manzana: { etapa: { proyectoId: { in: allGlobalIds } } } }
                });
            }
            where.OR = orClauses;
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
            clienteNombre: r.lead?.nombre ?? "",
            leadId: r.lead?.id ?? r.leadId ?? "",
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
        const user = await requireAuth();

        const parsed = reservaCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // Resolve project from the unit (needed for permission + flag checks)
        const unidad = await prisma.unidad.findUnique({
            where: { id: data.unidadId },
            select: { manzana: { select: { etapa: { select: { proyectoId: true } } } } },
        });
        if (!unidad) {
            return { success: false, error: "Unidad no encontrada" };
        }
        const proyectoId = unidad.manzana.etapa.proyectoId;

        const lead = await prisma.lead.findUnique({
            where: { id: data.leadId },
            select: { id: true, orgId: true },
        });
        if (!lead) {
            return { success: false, error: "Lead no encontrado" };
        }

        // Permission check: requires RESERVAR (checks puedeReservarse flag + blocking states)
        const ctx = await getProjectAccess(user, proyectoId);
        assertPermission(ctx, ProjectPermission.RESERVAR);

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin) {
            if (!user.orgId || !lead.orgId || lead.orgId !== user.orgId) {
                return { success: false, error: "Lead no encontrado" };
            }
        }

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

        await audit({
            userId: user.id,
            action: "RESERVA_CREATED",
            entity: "Reserva",
            entityId: result.id,
            details: { unidadId: data.unidadId, leadId: data.leadId, montoSena: data.montoSena },
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

        // 2. Ownership security check (ADMIN and SUPERADMIN bypass)
        if (adminOrDev.role !== "ADMIN" && adminOrDev.role !== "SUPERADMIN") {
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
                clienteNombre: reserva.lead?.nombre ?? "",
                clienteEmail: reserva.lead?.email ?? "",
                clienteTelefono: reserva.lead?.telefono ?? "",
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

            // Create Notification for the Seller
            await createNotification(
                reserva.vendedorId,
                "EXITO",
                "Reserva Aprobada",
                `La reserva para ${reserva.lead?.nombre ?? "cliente"} en ${reserva.unidad.numero} ha sido aprobada.`,
                `/dashboard/leads/${reserva.leadId}`,
                true // Send Email
            );

            // NEW: AUDIT LOG (inside transaction)
            await tx.auditLog.create({
                data: {
                    userId: adminOrDev.id,
                    action: "APPROVE_RESERVA",
                    entity: "Reserva",
                    entityId: reservaId,
                    details: `Reserva aprobada para unidad ${reserva.unidad.numero}`
                }
            });

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

        const isPrivileged = user.role === "ADMIN" || user.role === "SUPERADMIN";

        // Relation-based gate — org boundary + legacy creadoPorId fallback inside getProjectAccess
        const proyectoId = reserva.unidad.manzana.etapa.proyecto.id;
        const ctx = await getProjectAccess(user, proyectoId);

        const isSeller = reserva.vendedorId === user.id;
        // OWNER-level (EDITAR_PROYECTO) or the specific vendor of this reserva
        const canEdit = ctx.can(ProjectPermission.EDITAR_PROYECTO);

        if (!isPrivileged && !canEdit && !isSeller) {
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
                `La reserva para ${reserva.lead?.nombre ?? "cliente"} en ${reserva.unidad.numero} ha sido cancelada.`,
                `/dashboard/leads/${reserva.leadId}`,
                true // Send Email
            );

            // NEW: AUDIT LOG (inside transaction)
            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: "CANCEL_RESERVA",
                    entity: "Reserva",
                    entityId: reservaId,
                    details: `Reserva cancelada para unidad ${reserva.unidad.numero}`
                }
            });
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
                `La venta de ${reserva.unidad.numero} para ${reserva.lead?.nombre ?? "cliente"} ha sido confirmada.`,
                `/dashboard/leads/${reserva.leadId}`,
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

            // NEW: AUDIT LOG (inside transaction)
            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: "CONFIRM_SALE",
                    entity: "Reserva",
                    entityId: reservaId,
                    details: `Venta confirmada para unidad ${reserva.unidad.numero}`
                }
            });
        });

        revalidatePath("/dashboard/developer/reservas");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getReservasProyecto(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        // requireProjectOwnership bypasses ADMIN but not SUPERADMIN — check explicitly
        const caller = await requireAuth();
        if (caller.role !== "ADMIN" && caller.role !== "SUPERADMIN") {
            await requireProjectOwnership(proyectoId);
        }

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
