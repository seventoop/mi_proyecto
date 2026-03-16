"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { idSchema, slugSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

// ─── Scemas ───

const proyectoCreateSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
    slug: slugSchema.optional(),
    descripcion: z.string().max(2000).optional(),
    ubicacion: z.string().max(200).optional(),
    estado: z.string().optional(),
    tipo: z.string().optional(),
    imagenPortada: z.string().url("URL de imagen inválida").optional().or(z.literal("")),
    invertible: z.boolean().optional(),
    precioM2Inversor: z.number().positive().optional(),
    precioM2Mercado: z.number().positive().optional(),
    metaM2Objetivo: z.number().positive().optional(),
    fechaLimiteFondeo: z.date().optional().or(z.string().transform(v => new Date(v))).optional(),
    mapCenterLat: z.number().optional(),
    mapCenterLng: z.number().optional(),
    mapZoom: z.number().int().optional(),
    aiKnowledgeBase: z.string().optional(),
    aiSystemPrompt: z.string().optional(),
});

const proyectoUpdateSchema = proyectoCreateSchema.partial();

export async function getProyectos(params: {
    page?: number;
    pageSize?: number;
    estado?: string;
    tipo?: string;
} = {}) {
    const { page = 1, pageSize = 20, estado, tipo } = params;
    const skip = (page - 1) * pageSize;

    try {
        const now = new Date();
        const where: any = {
            visibilityStatus: 'PUBLICADO',
            estado: { not: 'SUSPENDIDO' },
            OR: [
                { isDemo: false },
                { AND: [{ isDemo: true }, { demoExpiresAt: { gt: now } }] }
            ]
        };

        if (estado && estado !== "ALL") {
            where.estado = estado;
        }
        if (tipo && tipo !== "ALL") {
            where.tipo = tipo;
        }

        const [proyectos, total] = await Promise.all([
            prisma.proyecto.findMany({
                where,
                select: {
                    id: true,
                    nombre: true,
                    slug: true,
                    estado: true,
                    tipo: true,
                    imagenPortada: true,
                    ubicacion: true,
                    createdAt: true,
                    isDemo: true,
                    demoExpiresAt: true,
                    _count: {
                        select: { etapas: true, leads: true, inversiones: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.proyecto.count({ where })
        ]);

        const projectIds = proyectos.map(p => p.id);

        if (projectIds.length === 0) {
            return {
                success: true,
                data: [],
                metadata: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
            };
        }

        // Optimización de Ultra-Rendimiento para estadísticas
        const statsRaw: any[] = await prisma.$queryRaw`
            SELECT 
                e."proyectoId", 
                u.estado, 
                COUNT(*)::int as count 
            FROM unidades u
            JOIN manzanas m ON u."manzanaId" = m.id
            JOIN etapas e ON m."etapaId" = e.id
            WHERE e."proyectoId" IN (${projectIds})
            GROUP BY e."proyectoId", u.estado
        `;

        const unitsByProject = new Map<string, { total: number, disponibles: number, reservadas: number, vendidas: number }>();

        for (const stat of statsRaw) {
            const pid = stat.proyectoId;
            if (!unitsByProject.has(pid)) {
                unitsByProject.set(pid, { total: 0, disponibles: 0, reservadas: 0, vendidas: 0 });
            }
            const current = unitsByProject.get(pid)!;
            const count = Number(stat.count);
            current.total += count;
            if (stat.estado === "DISPONIBLE") current.disponibles += count;
            else if (stat.estado === "RESERVADA") current.reservadas += count;
            else if (stat.estado === "VENDIDA") current.vendidas += count;
        }

        const data = proyectos.map(p => ({
            ...p,
            demoExpired: p.isDemo && p.demoExpiresAt && new Date(p.demoExpiresAt) < now,
            unidades: unitsByProject.get(p.id) || {
                total: 0,
                disponibles: 0,
                reservadas: 0,
                vendidas: 0
            }
        }));

        return {
            success: true,
            data,
            metadata: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
        };
    } catch (error) {
        console.error("[getProyectos]", error);
        return { success: false, error: "Error al obtener proyectos" };
    }
}

export async function getProyecto(id: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;

        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id },
            include: {
                etapas: {
                    include: { manzanas: { include: { unidades: true } } },
                    orderBy: { orden: "asc" }
                },
                inversiones: {
                    include: { inversor: { select: { nombre: true, email: true } } }
                },
                hitosEscrow: true,
                documentacion: true,
                pagos: true,
                tours: true,
                _count: { select: { leads: true, oportunidades: true } }
            }
        });

        if (!proyecto) {
            return { success: false, error: "Proyecto no encontrado" };
        }

        // SECURITY CHECK: Only Admin or Owner can see the full dashboard detail
        // MULTI-TENANT: Non-admin must be in the same org
        if (user.role !== "ADMIN") {
            if ((proyecto as any).orgId && (user as any).orgId && (proyecto as any).orgId !== (user as any).orgId) {
                return { success: false, error: "Proyecto no encontrado" };
            }
            if ((proyecto as any).creadoPorId !== user.id) {
                return { success: false, error: "No tienes permisos para ver este proyecto" };
            }
        }

        return { success: true, data: proyecto };
    } catch (error) {
        console.error("Error fetching project:", error);
        return { success: false, error: "Error al obtener proyecto" };
    }
}

export async function createProyecto(input: unknown) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = session?.user?.role;
        const userId = session?.user?.id;

        if (!userId) return { success: false, error: "No autorizado" };

        const parsed = proyectoCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const userRecord = await prisma.user.findUnique({
            where: { id: userId },
            select: { kycStatus: true, demoEndsAt: true }
        });

        const isVerified = userRecord?.kycStatus === "VERIFICADO";
        const isDemoActive = userRecord?.demoEndsAt && new Date(userRecord.demoEndsAt) > new Date();
        const isPrivileged = userRole === "ADMIN" || userRole === "SUPERADMIN";

        if (!isVerified && !isDemoActive && !isPrivileged) {
            return {
                success: false,
                error: "Debes completar el proceso KYC o estar en período de prueba de 48h para publicar proyectos."
            };
        }

        const isDemo = !isVerified;
        const slug = data.slug || data.nombre.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

        const existing = await prisma.proyecto.findUnique({ where: { slug } });
        if (existing) {
            return { success: false, error: "Ya existe un proyecto con ese slug" };
        }

        let estado = data.estado || "PLANIFICACION";
        let documentacionEstado = (userRole === "ADMIN") ? "APROBADO" : "PENDIENTE";

        const proyecto = await prisma.proyecto.create({
            data: {
                ...data,
                slug,
                estado,
                documentacionEstado,
                invertible: data.invertible ?? false,
                m2VendidosInversores: 0,
                creadoPorId: userId,
                orgId: (session?.user as any)?.orgId || null,
                isDemo,
                demoExpiresAt: isDemo ? (userRecord?.demoEndsAt ? new Date(userRecord.demoEndsAt) : null) : null,
                visibilityStatus: 'PUBLICADO'
            }
        });

        if (isDemo) {
            await prisma.user.update({
                where: { id: userId },
                data: { demoUsed: true }
            });
        }

        revalidatePath("/dashboard/proyectos");
        return { success: true, data: proyecto };
    } catch (error) {
        console.error("Error creating project:", error);
        return { success: false, error: "Error al crear proyecto" };
    }
}

export async function updateProyecto(id: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        const session = await getServerSession(authOptions);
        const user = session?.user;

        if (!user) return { success: false, error: "No autorizado" };

        const parsed = proyectoUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const proyecto = await prisma.proyecto.findUnique({
            where: { id },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No tienes permisos para modificar este proyecto" };
        }

        const updated = await prisma.proyecto.update({
            where: { id },
            data
        });

        revalidatePath("/dashboard/proyectos");
        revalidatePath(`/dashboard/proyectos/${id}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating project:", error);
        return { success: false, error: "Error al actualizar proyecto" };
    }
}

export async function deleteProyecto(id: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;

        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({ where: { id } });
        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No tienes permisos para eliminar este proyecto" };
        }

        await prisma.proyecto.delete({ where: { id } });

        revalidatePath("/dashboard/proyectos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting project:", error);
        return { success: false, error: "Error al eliminar proyecto" };
    }
}

export async function updateProyectoStatus(id: string, estado: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const updated = await prisma.proyecto.update({
            where: { id },
            data: { estado }
        });

        revalidatePath("/dashboard/proyectos");
        revalidatePath(`/dashboard/proyectos/${id}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating project status:", error);
        return { success: false, error: "Error al actualizar estado" };
    }
}

export async function updateDocumentacionStatus(id: string, documentacionEstado: string) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "Solo administradores pueden cambiar el estado de documentación" };

        const proyecto = await prisma.proyecto.update({
            where: { id },
            data: { documentacionEstado }
        });

        revalidatePath("/dashboard/proyectos");
        revalidatePath(`/dashboard/proyectos/${id}`);
        return { success: true, data: proyecto };
    } catch (error) {
        console.error("Error updating documentation status:", error);
        return { success: false, error: "Error al actualizar estado de documentación" };
    }
}

// --- ACCIONES DE ARCHIVOS TÉCNICOS ---

// ─── PUBLIC: Proyectos destacados para home pública ───────────────────────────

export async function getProyectosDestacados() {
    try {
        const proyectos = await prisma.proyecto.findMany({
            where: {
                visibilityStatus: "PUBLICADO",
                deletedAt: null,
                estado: { not: "SUSPENDIDO" },
            },
            select: {
                id: true,
                nombre: true,
                slug: true,
                estado: true,
                tipo: true,
                imagenPortada: true,
                ubicacion: true,
                precioM2Mercado: true,
            },
            orderBy: { createdAt: "desc" },
            take: 6,
        });
        return proyectos.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            slug: p.slug,
            estado: p.estado,
            tipo: p.tipo,
            imagenPortada: p.imagenPortada,
            ubicacion: p.ubicacion,
            precioDesde: p.precioM2Mercado ? Number(p.precioM2Mercado) : null,
        }));
    } catch {
        return [];
    }
}

export async function getProyectoArchivos(proyectoId: string) {
    try {
        const archivos = await prisma.proyecto_archivos.findMany({
            where: { proyectoId },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: archivos };
    } catch (error) {
        console.error("Error fetching project files:", error);
        return { success: true, data: [] };
    }
}

export async function addProyectoArchivo(data: {
    proyectoId: string;
    tipo: string;
    nombre: string;
    url: string;
    visiblePublicamente: boolean;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: data.proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.proyecto_archivos.create({
            data: {
                id: randomUUID(),
                proyectoId: data.proyectoId,
                tipo: data.tipo,
                nombre: data.nombre,
                url: data.url,
                visiblePublicamente: data.visiblePublicamente
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error adding project file:", error);
        return { success: false, error: "Error al subir archivo técnico" };
    }
}

export async function deleteProyectoArchivo(id: string, proyectoId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.proyecto_archivos.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting project file:", error);
        return { success: false, error: "Error al eliminar archivo" };
    }
}

// --- ACCIONES DE GALERÍA PROFESIONAL ---

export async function getProyectoImagenes(proyectoId: string) {
    try {
        const imagenes = await prisma.proyectoImagen.findMany({
            where: { proyectoId },
            orderBy: { orden: "asc" }
        });
        return { success: true, data: imagenes };
    } catch (error) {
        console.error("Error fetching project images:", error);
        return { success: true, data: [] };
    }
}

export async function addProyectoImagen(data: {
    proyectoId: string;
    url: string;
    categoria: string;
    esPrincipal?: boolean;
    orden?: number;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: data.proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const esPrincipal = data.esPrincipal || false;

        await prisma.$transaction(async (tx) => {
            if (esPrincipal) {
                await tx.proyectoImagen.updateMany({
                    where: { proyectoId: data.proyectoId },
                    data: { esPrincipal: false }
                });
                await tx.proyecto.update({
                    where: { id: data.proyectoId },
                    data: { imagenPortada: data.url }
                });
            }

            await tx.proyectoImagen.create({
                data: {
                    proyectoId: data.proyectoId,
                    url: data.url,
                    categoria: data.categoria,
                    esPrincipal,
                    orden: data.orden || 0
                }
            });
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error adding project image:", error);
        return { success: false, error: "Error al subir imagen" };
    }
}

export async function updateProyectoImagenesOrder(updates: { id: string, orden: number }[], proyectoId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.$transaction(
            updates.map(u => prisma.proyectoImagen.update({
                where: { id: u.id },
                data: { orden: u.orden }
            }))
        );

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating image order:", error);
        return { success: false, error: "Error al reordenar imágenes" };
    }
}

export async function deleteProyectoImagen(id: string, proyectoId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.proyectoImagen.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting image:", error);
        return { success: false, error: "Error al eliminar imagen" };
    }
}

export async function setMainProyectoImagen(id: string, proyectoId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };
        if (user.role !== "ADMIN" && (proyecto as any).creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const img = await prisma.proyectoImagen.findUnique({ where: { id } });
        if (!img) return { success: false, error: "Imagen no encontrada" };

        await prisma.$transaction([
            prisma.proyectoImagen.updateMany({
                where: { proyectoId },
                data: { esPrincipal: false }
            }),
            prisma.proyectoImagen.update({
                where: { id },
                data: { esPrincipal: true }
            }),
            prisma.proyecto.update({
                where: { id: proyectoId },
                data: { imagenPortada: img.url }
            })
        ]);

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error setting main image:", error);
        return { success: false, error: "Error al establecer imagen principal" };
    }
}
