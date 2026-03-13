"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole, requireAnyRole, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema, slugSchema } from "@/lib/validations";
import { createNotification } from "./notifications";

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

const uploadDocumentoSchema = z.object({
    proyectoId: idSchema,
    nombre: z.string().min(1, "Nombre requerido").max(100),
    tipo: z.string().min(1, "Tipo de documento requerido"),
    categoria: z.string().default("GENERAL"),
    url: z.string().url("URL de documento inválida"),
    descripcion: z.string().max(500).optional(),
    visiblePublicamente: z.boolean().default(false),
});

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
            deletedAt: null,
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

        if (!isVerified && !isDemoActive) {
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
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const proyecto = await prisma.proyecto.findUnique({
            where: { id },
            select: { id: true, nombre: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        // Soft delete
        await prisma.proyecto.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        // Audit log
        try {
            const session = await getServerSession(authOptions);
            await prisma.auditLog.create({
                data: {
                    action: "PROYECTO_ELIMINADO",
                    entity: "PROYECTO",
                    entityId: id,
                    userId: session?.user?.id as string,
                    details: `Proyecto eliminado (soft delete): ${proyecto.nombre}`
                }
            });
        } catch (e) {
            console.error("Error creating audit log:", e);
        }

        revalidatePath("/dashboard/admin/proyectos");
        revalidatePath("/dashboard/developer/proyectos");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
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

// --- ACCIONES UNIFICADAS DE DOCUMENTACIÓN ---

export async function addDocumentoProyecto(input: unknown) {
    try {
        const parsed = uploadDocumentoSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const user = await requireProjectOwnership(data.proyectoId);

        const documento = await prisma.documentacion.create({
            data: {
                proyectoId: data.proyectoId,
                usuarioId: user.id,
                nombre: data.nombre,
                tipo: data.tipo,
                categoria: data.categoria,
                archivoUrl: data.url,
                descripcion: data.descripcion,
                visiblePublicamente: data.visiblePublicamente,
                estado: "PENDIENTE",
            } as any // Cast to any to handle schema sync if needed
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true, data: documento };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateEstadoDocumentoProyecto(id: string, status: "APROBADO" | "RECHAZADO", notas?: string) {
    try {
        await requireRole("ADMIN");

        const doc = await (prisma.documentacion as any).findUnique({
            where: { id },
            select: { proyectoId: true, nombre: true }
        });

        if (!doc) return { success: false, error: "Documento no encontrado" };

        await prisma.documentacion.update({
            where: { id },
            data: {
                estado: status,
                comentarios: notas
            }
        });

        if (doc.proyectoId) {
            revalidatePath(`/dashboard/proyectos/${doc.proyectoId}`);

            // Revalidate project doc status if it's a critical doc
            // Logic to update proyecto.documentacionEstado could go here if needed
        }

        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** @deprecated Use getDocumentosProyecto instead */
export async function getProyectoArchivos(proyectoId: string) {
    try {
        const docs = await (prisma.documentacion as any).findMany({
            where: { proyectoId, categoria: "TECNICO" }
        });
        return docs.map((d: any) => ({
            id: d.id,
            nombre: d.nombre || d.tipo,
            archivoUrl: d.archivoUrl,
            fechaSubida: d.createdAt
        }));
    } catch (error) {
        return handleGuardError(error);
    }
}

/** @deprecated Use addDocumentoProyecto instead */
export async function addProyectoArchivo(data: { proyectoId: string, nombre: string, archivoUrl: string }) {
    return addDocumentoProyecto({
        proyectoId: data.proyectoId,
        nombre: data.nombre,
        tipo: "PLANO",
        categoria: "TECNICO",
        url: data.archivoUrl
    });
}

/** @deprecated Use deleteDocumentoProyecto instead */
export async function deleteProyectoArchivo(id: string, proyectoId: string) {
    return deleteDocumentoProyecto(id, proyectoId);
}

export async function deleteDocumentoProyecto(id: string, proyectoId: string) {
    try {
        await requireProjectOwnership(proyectoId);

        await prisma.documentacion.delete({
            where: { id, proyectoId }
        });

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function reviewAllProjectDocs(projectId: string, status: "APROBADO" | "RECHAZADO", notas?: string) {
    try {
        await requireRole("ADMIN");

        const project = await prisma.proyecto.update({
            where: { id: projectId },
            data: { documentacionEstado: status }
        });

        if (project.creadoPorId) {
            await createNotification(
                project.creadoPorId,
                status === "APROBADO" ? "EXITO" : "ALERTA",
                "Carpeta Técnica " + (status === "APROBADO" ? "Aprobada" : "Rechazada"),
                notas || `La documentación de tu proyecto "${project.nombre}" ha sido marcada como ${status}.`,
                `/dashboard/proyectos/${projectId}`
            );
        }

        revalidatePath(`/dashboard/proyectos/${projectId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getProyectosDestacados() {
    try {
        const proyectos = await prisma.proyecto.findMany({
            where: {
                visibilityStatus: "PUBLICADO",
                estado: { in: ["ACTIVO", "PROXIMO"] }
            },
            take: 6,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                nombre: true,
                slug: true,
                estado: true,
                tipo: true,
                precioM2Inversor: true,
                imagenPortada: true,
                ubicacion: true,
            }
        });

        const data = proyectos.map(p => ({
            ...p,
            precioDesde: p.precioM2Inversor ? Number(p.precioM2Inversor) : null,
            ciudad: p.ubicacion ? p.ubicacion.split(",")[0].trim() : "",
            provincia: p.ubicacion && p.ubicacion.includes(",") ? p.ubicacion.split(",").pop()?.trim() : "",
        }));

        return data;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getProyectoBySlug(slug: string) {
    try {
        const proyecto = await prisma.proyecto.findFirst({
            where: {
                slug,
                visibilityStatus: "PUBLICADO"
            },
            include: {
                imagenes: { orderBy: { orden: "asc" } },
                tours: true,
                documentacion: true,
                etapas: {
                    include: { manzanas: { include: { unidades: true } } },
                    orderBy: { orden: "asc" }
                }
            }
        });

        if (!proyecto) return null;
        return proyecto;
    } catch (e) {
        console.error("Error getProyectoBySlug:", e);
        return null;
    }
}
