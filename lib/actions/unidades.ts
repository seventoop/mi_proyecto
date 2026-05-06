"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema, currencySchema } from "@/lib/validations";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { audit } from "@/lib/actions/audit";

// ─── Schemas ───

const unidadCreateSchema = z.object({
    manzanaId: idSchema,
    numero: z.string().min(1, "Número de unidad requerido").max(20),
    lote: z.string().max(20).optional(),
    superficie: z.number().positive("La superficie debe ser positiva"),
    precio: z.number().nonnegative("El precio no puede ser negativo"),
    moneda: currencySchema.optional(),
    estado: z.string().optional(),
    coordsGeoJSON: z.string().optional(),
    responsableId: idSchema.optional().nullable(),
});

const unidadUpdateSchema = unidadCreateSchema.partial();

// ─── Queries ───

export async function getAllUnidades(params: any = {}) {
    try {
        const { page = 1, pageSize = 20, proyectoId, proyectoIds, estado, responsableId, creadoPorId } = params;
        const skip = (page - 1) * pageSize;

        const where: any = {};
        if (estado) where.estado = estado;
        if (responsableId) where.responsableId = responsableId;
        if (proyectoId) {
            where.manzana = {
                etapa: {
                    proyectoId: proyectoId
                }
            };
        }

        // Relation-based multi-project filter (takes precedence over legacy creadoPorId)
        if (proyectoIds && proyectoIds.length > 0) {
            where.manzana = {
                ...where.manzana,
                etapa: {
                    ...where.manzana?.etapa,
                    proyectoId: { in: proyectoIds }
                }
            };
        } else if (creadoPorId) {
            // Legacy fallback: kept for backward compatibility
            where.manzana = {
                ...where.manzana,
                etapa: {
                    ...where.manzana?.etapa,
                    proyecto: {
                        creadoPorId: creadoPorId
                    }
                }
            };
        }

        const [unidades, total] = await Promise.all([
            prisma.unidad.findMany({
                where,
                select: {
                    id: true,
                    numero: true,
                    tipo: true,
                    superficie: true,
                    precio: true,
                    moneda: true,
                    estado: true,
                    createdAt: true,
                    manzana: {
                        select: {
                            nombre: true,
                            etapa: {
                                select: {
                                    nombre: true,
                                    proyecto: {
                                        select: { id: true, nombre: true }
                                    }
                                }
                            }
                        }
                    },
                    responsable: {
                        select: { id: true, nombre: true, email: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.unidad.count({ where })
        ]);

        return {
            success: true,
            data: unidades,
            metadata: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error("Error fetching all unidades:", error);
        return { success: false, error: "Error al obtener inventario" };
    }
}

export async function getUnidades(manzanaId: string) {
    try {
        const manIdParsed = idSchema.safeParse(manzanaId);
        if (!manIdParsed.success) return { success: false, error: "ID de manzana inválido" };

        const user = await requireAuth();

        // Org boundary check: resolve project org via manzana → etapa → proyecto.
        // Non-admin users can only access manzanas from their own org's projects.
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const manzana = await prisma.manzana.findUnique({
                where: { id: manzanaId },
                select: { etapa: { select: { proyecto: { select: { orgId: true } } } } },
            });
            if (!manzana || manzana.etapa.proyecto.orgId !== user.orgId) {
                return { success: false, error: "Manzana no encontrada" };
            }
        }

        const unidades = await prisma.unidad.findMany({
            where: { manzanaId },
            orderBy: { numero: "asc" }
        });

        return { success: true, data: unidades };
    } catch (error) {
        console.error("Error fetching unidades:", error);
        return { success: false, error: "Error al obtener unidades" };
    }
}

export async function getProjectBlueprintData(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        const user = await requireAuth();

        // Org boundary check: non-admin users can only access blueprints from their own org.
        // ADMIN/SUPERADMIN bypass (see all orgs by design).
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: proyectoId },
                select: { orgId: true },
            });
            if (!proyecto || proyecto.orgId !== user.orgId) {
                return { success: false, error: "Proyecto no encontrado" };
            }
        }

        const unidades = await prisma.unidad.findMany({
            where: {
                manzana: {
                    etapa: {
                        proyectoId
                    }
                }
            },
            select: {
                id: true,
                numero: true,
                superficie: true,
                frente: true,
                fondo: true,
                precio: true,
                moneda: true,
                estado: true,
                esEsquina: true,
                orientacion: true,
                tipo: true,
                tour360Url: true,
                coordenadasMasterplan: true,
                manzana: {
                    select: {
                        id: true,
                        nombre: true,
                        etapa: {
                            select: { id: true, nombre: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        return { success: true, data: unidades };
    } catch (error) {
        console.error("Error fetching project blueprint data:", error);
        return { success: false, error: "Error al obtener datos del masterplan" };
    }
}

// ─── Mutations ───

export async function createUnidad(input: unknown) {
    try {
        const user = await requireAuth();

        const parsed = unidadCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const manzana = await prisma.manzana.findUnique({
            where: { id: data.manzanaId },
            include: {
                etapa: {
                    select: { proyectoId: true }
                }
            }
        });

        if (!manzana) {
            return { success: false, error: "Manzana no encontrada" };
        }

        // SECURITY CHECK - Official Guard
        await requireProjectOwnership(manzana.etapa.proyectoId);

        const unidad = await prisma.unidad.create({
            data: {
                ...data,
                estado: data.estado || "DISPONIBLE",
                moneda: data.moneda || "USD"
            }
        });

        await audit({
            userId: user.id,
            action: "UNIT_CREATE",
            entity: "Unidad",
            entityId: unidad.id,
            details: { manzanaId: data.manzanaId, numero: data.numero, estado: unidad.estado },
        });

        revalidatePath(`/dashboard/proyectos/${manzana.etapa.proyectoId}`);
        return { success: true, data: unidad };
    } catch (error) {
        console.error("Error creating unidad:", error);
        return handleGuardError(error);
    }
}

export async function getUnidadHistorial(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

        const historial = await prisma.historialUnidad.findMany({
            where: { unidadId: id },
            orderBy: { createdAt: "desc" },
            include: {
                usuario: { select: { nombre: true, email: true } }
            }
        });

        return { success: true, data: historial };
    } catch (error) {
        console.error("Error fetching unidad historial:", error);
        return { success: false, error: "Error al obtener historial" };
    }
}

export async function updateUnidad(id: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

        const user = await requireAuth();

        const parsed = unidadUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const unidad = await prisma.unidad.findUnique({
            where: { id },
            include: {
                manzana: {
                    select: {
                        etapa: {
                            select: { proyectoId: true }
                        }
                    }
                }
            }
        });

        if (!unidad) return { success: false, error: "Unidad no encontrada" };

        // SECURITY CHECK - Official Guard
        await requireProjectOwnership(unidad.manzana.etapa.proyectoId);

        const updated = await prisma.unidad.update({
            where: { id },
            data,
        });

        await audit({
            userId: user.id,
            action: "UNIT_UPDATE",
            entity: "Unidad",
            entityId: id,
            details: { campos: Object.keys(data) },
        });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating unidad:", error);
        return handleGuardError(error);
    }
}

export async function deleteUnidad(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

        const user = await requireAuth();

        const unidad = await prisma.unidad.findUnique({
            where: { id },
            include: {
                manzana: {
                    select: {
                        etapa: {
                            select: { proyectoId: true }
                        }
                    }
                }
            }
        });

        if (!unidad) {
            return { success: false, error: "Unidad no encontrada" };
        }

        // SECURITY CHECK - Official Guard
        await requireProjectOwnership(unidad.manzana.etapa.proyectoId);

        await prisma.unidad.delete({ where: { id } });

        await audit({
            userId: user.id,
            action: "UNIT_DELETE",
            entity: "Unidad",
            entityId: id,
            details: { proyectoId: unidad.manzana.etapa.proyectoId },
        });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting unidad:", error);
        return handleGuardError(error);
    }
}

const unidadEstadoSchema = z.string().min(1, "Estado requerido").max(50);

export async function updateUnidadEstado(id: string, estado: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

        const estadoParsed = unidadEstadoSchema.safeParse(estado);
        if (!estadoParsed.success) return { success: false, error: "Estado inválido" };

        const user = await requireAuth();

        const unidad = await prisma.unidad.findUnique({
            where: { id },
            include: {
                manzana: {
                    select: {
                        etapa: {
                            select: { proyectoId: true }
                        }
                    }
                }
            }
        });

        if (!unidad) return { success: false, error: "Unidad no encontrada" };

        // SECURITY CHECK - Official Guard
        await requireProjectOwnership(unidad.manzana.etapa.proyectoId);

        const updated = await prisma.unidad.update({
            where: { id },
            data: { estado }
        });

        // Trigger real-time update
        const pusher = getPusherServer();
        if (pusher) {
            await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
                id,
                estado,
                proyectoId: unidad.manzana.etapa.proyectoId
            });
        }

        await audit({
            userId: user.id,
            action: "UNIT_STATUS_CHANGED",
            entity: "Unidad",
            entityId: id,
            details: { estadoAnterior: unidad.estado, estadoNuevo: estado },
        });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating unidad estado:", error);
        return handleGuardError(error);
    }
}

export async function assignResponsable(unidadId: string, userId: string) {
    try {
        const idParsed = idSchema.safeParse(unidadId);
        if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

        const userIdParsed = idSchema.safeParse(userId);
        if (!userIdParsed.success) return { success: false, error: "ID de usuario inválido" };

        const user = await requireAuth();

        const unidad = await prisma.unidad.findUnique({
            where: { id: unidadId },
            include: {
                manzana: {
                    select: {
                        etapa: {
                            select: { proyectoId: true }
                        }
                    }
                }
            }
        });

        if (!unidad) return { success: false, error: "Unidad no encontrada" };

        // SECURITY CHECK - Official Guard
        await requireProjectOwnership(unidad.manzana.etapa.proyectoId);

        const updated = await prisma.unidad.update({
            where: { id: unidadId },
            data: { responsableId: userId },
        });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error assigning responsable:", error);
        return handleGuardError(error);
    }
}
