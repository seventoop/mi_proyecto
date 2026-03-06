"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { idSchema, currencySchema } from "@/lib/validations";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

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
    // ✅ AUTH GUARD
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return { success: false, error: "No autorizado" };

    const { page = 1, pageSize = 20, proyectoId, estado, responsableId } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (estado) where.estado = estado;
    if (responsableId) where.responsableId = responsableId;

    if (proyectoId) {
      where.manzana = {
        etapa: {
          proyectoId: proyectoId,
        },
      };
    }

    // ✅ SECURITY: do NOT accept creadoPorId from caller.
    // If not ADMIN, force scope to projects created by this user.
    if (user.role !== "ADMIN") {
      where.manzana = {
        ...(where.manzana || {}),
        etapa: {
          ...(where.manzana?.etapa || {}),
          proyecto: {
            creadoPorId: user.id,
          },
        },
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
                    select: { id: true, nombre: true },
                  },
                },
              },
            },
          },
          responsable: {
            select: { id: true, nombre: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip,
      }),
      prisma.unidad.count({ where }),
    ]);

    return {
      success: true,
      data: unidades,
      metadata: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
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

    const unidades = await prisma.unidad.findMany({
      where: { manzanaId },
      orderBy: { numero: "asc" },
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

    const unidades = await prisma.unidad.findMany({
      where: {
        manzana: {
          etapa: {
            proyectoId,
          },
        },
      },
      select: {
        id: true,
        numero: true,
        superficie: true,
        precio: true,
        moneda: true,
        estado: true,
        esEsquina: true,
        orientacion: true,
        tipo: true,
        coordenadasMasterplan: true,
        manzana: {
          select: {
            nombre: true,
            etapa: {
              select: { nombre: true },
            },
          },
        },
      },
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
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return { success: false, error: "No autorizado" };

    const parsed = unidadCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }
    const data = parsed.data;

    const manzana = await prisma.manzana.findUnique({
      where: { id: data.manzanaId },
      include: {
        etapa: {
          include: { proyecto: { select: { creadoPorId: true } } },
        },
      },
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
        moneda: data.moneda || "USD",
      },
    });

    revalidatePath(`/dashboard/proyectos/${manzana.etapa.proyectoId}`);
    return { success: true, data: unidad };
  } catch (error) {
    console.error("Error creating unidad:", error);
    return { success: false, error: "Error al crear unidad" };
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
        usuario: { select: { nombre: true, email: true } },
      },
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

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return { success: false, error: "No autorizado" };

    const parsed = unidadUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
    }
    const data = parsed.data;

    const unidad = await prisma.unidad.findUnique({
      where: { id },
      include: {
        manzana: {
          include: {
            etapa: {
              include: { proyecto: { select: { creadoPorId: true } } },
            },
          },
        },
      },
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
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return { success: false, error: "No autorizado" };

    const unidad = await prisma.unidad.findUnique({
      where: { id },
      include: {
        manzana: {
          include: {
            etapa: {
              include: { proyecto: { select: { creadoPorId: true } } },
            },
          },
        },
      },
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
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return { success: false, error: "No autorizado" };

    const unidad = await prisma.unidad.findUnique({
      where: { id },
      include: {
        manzana: {
          include: {
            etapa: {
              include: { proyecto: { select: { creadoPorId: true } } },
            },
          },
        },
      },
    });

    if (!unidad) return { success: false, error: "Unidad no encontrada" };

    // SECURITY CHECK
    if (user.role !== "ADMIN" && unidad.manzana.etapa.proyecto.creadoPorId !== user.id) {
      return { success: false, error: "No autorizado" };
    }

    const updated = await prisma.unidad.update({
      where: { id },
      data: { estado },
    });

    // Trigger real-time update
    const pusher = getPusherServer();
    if (pusher) {
      try {
        await pusher.trigger(CHANNELS.UNIDADES, EVENTS.UNIDAD_STATUS_CHANGED, {
          id,
          estado,
          proyectoId: unidad.manzana.etapa.proyectoId,
        });
      } catch (err) {
        console.warn("Pusher trigger failed in updateUnidadEstado:", err);
      }
    }

    revalidatePath(`/dashboard/proyectos/${unidad.manzana.etapa.proyectoId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating unidad estado:", error);
    return { success: false, error: "Error al actualizar estado" };
  }
}

export async function assignResponsable(unidadId: string, userId: string) {
  try {
    const idParsed = idSchema.safeParse(unidadId);
    if (!idParsed.success) return { success: false, error: "ID de unidad inválido" };

    const userIdParsed = idSchema.safeParse(userId);
    if (!userIdParsed.success) return { success: false, error: "ID de usuario inválido" };

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return { success: false, error: "No autorizado" };

    const unidad = await prisma.unidad.findUnique({
      where: { id: unidadId },
      include: {
        manzana: {
          include: {
            etapa: {
              include: { proyecto: { select: { creadoPorId: true } } },
            },
          },
        },
      },
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