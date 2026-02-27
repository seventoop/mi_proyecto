"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getAllUnidades(params: {
    page?: number;
    pageSize?: number;
    proyectoId?: string;
    estado?: string;
    responsableId?: string;
    creadoPorId?: string;
} = {}) {
    const { page = 1, pageSize = 20, proyectoId, estado, responsableId, creadoPorId } = params;
    const skip = (page - 1) * pageSize;

    try {
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

        if (creadoPorId) {
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

export async function createUnidad(data: {
    manzanaId: string;
    numero: string;
    lote?: string;
    superficie: number;
    precio: number;
    moneda?: string;
    estado?: string;
    coordsGeoJSON?: string;
    responsableId?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const manzana = await prisma.manzana.findUnique({
            where: { id: data.manzanaId },
            include: {
                etapa: {
                    include: { proyecto: { select: { creadoPorId: true } } }
                }
            }
        });

        if (!manzana) {
            return { success: false, error: "Manzana no encontrada" };
        }

        // SECURITY CHECK
        if (user.role !== "ADMIN" && manzana.etapa.proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No tienes permisos para crear unidades en este proyecto" };
        }

        const unidad = await prisma.unidad.create({
            data: {
                ...data,
                estado: data.estado || "DISPONIBLE",
                moneda: data.moneda || "USD"
            }
        });

        revalidatePath(`/dashboard/proyectos/${manzana.etapa.proyectoId}`);
        return { success: true, data: unidad };
    } catch (error) {
        console.error("Error creating unidad:", error);
        return { success: false, error: "Error al crear unidad" };
    }
}

export async function updateUnidad(id: string, data: Partial<{
    numero: string;
    lote: string;
    superficie: number;
    precio: number;
    moneda: string;
    estado: string;
    coordsGeoJSON: string;
    responsableId: string;
}>) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const unidad = await prisma.unidad.findUnique({
            where: { id },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: { proyecto: { select: { creadoPorId: true } } }
                        }
                    }
                }
            }
        });

        if (!unidad) return { success: false, error: "Unidad no encontrada" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && unidad.manzana.etapa.proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const updated = await prisma.unidad.update({
            where: { id },
            data,
        });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating unidad:", error);
        return { success: false, error: "Error al actualizar unidad" };
    }
}

export async function deleteUnidad(id: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const unidad = await prisma.unidad.findUnique({
            where: { id },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: { proyecto: { select: { creadoPorId: true } } }
                        }
                    }
                }
            }
        });

        if (!unidad) {
            return { success: false, error: "Unidad no encontrada" };
        }

        // SECURITY CHECK
        if (user.role !== "ADMIN" && unidad.manzana.etapa.proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.unidad.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting unidad:", error);
        return { success: false, error: "Error al eliminar unidad" };
    }
}

export async function updateUnidadEstado(id: string, estado: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const unidad = await prisma.unidad.findUnique({
            where: { id },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: { proyecto: { select: { creadoPorId: true } } }
                        }
                    }
                }
            }
        });

        if (!unidad) return { success: false, error: "Unidad no encontrada" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && unidad.manzana.etapa.proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const updated = await prisma.unidad.update({
            where: { id },
            data: { estado }
        });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating unidad estado:", error);
        return { success: false, error: "Error al actualizar estado" };
    }
}

export async function assignResponsable(unidadId: string, userId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const unidad = await prisma.unidad.findUnique({
            where: { id: unidadId },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: { proyecto: { select: { creadoPorId: true } } }
                        }
                    }
                }
            }
        });

        if (!unidad) return { success: false, error: "Unidad no encontrada" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && unidad.manzana.etapa.proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const updated = await prisma.unidad.update({
            where: { id: unidadId },
            data: { responsableId: userId },
        });

        revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error assigning responsable:", error);
        return { success: false, error: "Error al asignar responsable" };
    }
}
