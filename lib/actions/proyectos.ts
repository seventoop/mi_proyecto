"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getProyectos(params: {
    page?: number;
    pageSize?: number;
    estado?: string;
    tipo?: string;
} = {}) {
    const { page = 1, pageSize = 20, estado, tipo } = params;
    const skip = (page - 1) * pageSize;

    try {
        // Raw SQL to filter IDs bypassing outdated Prisma Client type check for isDemo/demoExpiresAt
        let rawQuery = `
            SELECT id FROM proyectos 
            WHERE "visibilityStatus" = 'PUBLICADO' 
            AND "estado" != 'SUSPENDIDO'
            AND (
                "isDemo" = false 
                OR ("isDemo" = true AND "demoExpiresAt" > NOW())
            )
        `;

        const queryParams: any[] = [];
        if (estado && estado !== "ALL") {
            rawQuery += ` AND "estado" = $1`;
            queryParams.push(estado);
        }
        if (tipo && tipo !== "ALL") {
            rawQuery += ` AND "tipo" = ${queryParams.length + 1}`;
            queryParams.push(tipo);
        }

        rawQuery += ` ORDER BY "createdAt" DESC`;

        const filteredResults: any[] = await prisma.$queryRawUnsafe(rawQuery, ...queryParams);
        const allIds = filteredResults.map(r => r.id);
        const total = allIds.length;
        const pageIds = allIds.slice(skip, skip + pageSize);

        if (pageIds.length === 0) {
            return {
                success: true,
                data: [],
                metadata: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
            };
        }

        const [proyectos, demoInfoRaw]: [any[], any[]] = await Promise.all([
            prisma.proyecto.findMany({
                where: { id: { in: pageIds } },
                select: {
                    id: true,
                    nombre: true,
                    slug: true,
                    estado: true,
                    tipo: true,
                    imagenPortada: true,
                    ubicacion: true,
                    createdAt: true,
                    _count: {
                        select: { etapas: true, leads: true, inversiones: true }
                    }
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.$queryRaw`
                SELECT id, "isDemo", "demoExpiresAt" FROM proyectos 
                WHERE id IN (${pageIds})
            `
        ]);

        const demoInfoMap = new Map(demoInfoRaw.map(d => [d.id, d]));

        // Optimización de Ultra-Rendimiento para estadísticas
        const statsRaw: any[] = await prisma.$queryRaw`
            SELECT 
                e."proyectoId", 
                u.estado, 
                COUNT(*)::int as count 
            FROM unidades u
            JOIN manzanas m ON u."manzanaId" = m.id
            JOIN etapas e ON m."etapaId" = e.id
            WHERE e."proyectoId" IN (${pageIds})
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

        const data = proyectos.map(p => {
            const demoInfo = demoInfoMap.get(p.id) || { isDemo: false, demoExpiresAt: null };
            return {
                ...p,
                isDemo: demoInfo.isDemo,
                demoExpiresAt: demoInfo.demoExpiresAt,
                demoExpired: demoInfo.isDemo && demoInfo.demoExpiresAt && new Date(demoInfo.demoExpiresAt) < new Date(),
                unidades: unitsByProject.get(p.id) || {
                    total: 0,
                    disponibles: 0,
                    reservadas: 0,
                    vendidas: 0
                }
            };
        });

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

        const [proyecto, demoInfo]: [any, any[]] = await Promise.all([
            prisma.proyecto.findUnique({
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
            }),
            prisma.$queryRaw`SELECT "isDemo", "demoExpiresAt", "creadoPorId" FROM proyectos WHERE id = ${id}`
        ]);

        if (!proyecto) {
            return { success: false, error: "Proyecto no encontrado" };
        }

        // Attach demo info from raw query
        if (demoInfo && demoInfo.length > 0) {
            proyecto.isDemo = demoInfo[0].isDemo;
            proyecto.demoExpiresAt = demoInfo[0].demoExpiresAt;
            proyecto.creadoPorId = demoInfo[0].creadoPorId;
        }

        // SECURITY CHECK: Only Admin or Owner can see the full dashboard detail
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No tienes permisos para ver este proyecto" };
        }

        return { success: true, data: proyecto };
    } catch (error) {
        console.error("Error fetching project:", error);
        return { success: false, error: "Error al obtener proyecto" };
    }
}

export async function createProyecto(data: {
    nombre: string;
    slug?: string;
    descripcion?: string;
    ubicacion?: string;
    estado?: string;
    tipo?: string;
    imagenPortada?: string;
    invertible?: boolean;
    precioM2Inversor?: number;
    precioM2Mercado?: number;
    metaM2Objetivo?: number;
    fechaLimiteFondeo?: Date;
    mapCenterLat?: number;
    mapCenterLng?: number;
    mapZoom?: number;
    aiKnowledgeBase?: string;
    aiSystemPrompt?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = session?.user?.role;
        const userId = session?.user?.id;

        if (!userId) return { success: false, error: "No autorizado" };

        const { isKycVerifiedOrDemoActive } = await import("@/lib/actions/kyc");
        const kycOrDemo = await isKycVerifiedOrDemoActive();

        const users: any[] = await prisma.$queryRaw`
            SELECT "kycStatus", "demoEndsAt" FROM users WHERE id = ${userId}
        `;
        const userRecord = users[0];
        const isVerified = userRecord?.kycStatus === "VERIFICADO";

        if (!kycOrDemo) {
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
        let documentacionEstado = "PENDIENTE";

        if (userRole === "DESARROLLADOR") {
            documentacionEstado = "PENDIENTE";
        }

        const proyecto = await prisma.proyecto.create({
            data: {
                ...data,
                slug,
                estado,
                documentacionEstado,
                invertible: data.invertible ?? false,
                m2VendidosInversores: 0,
                creadoPorId: userId,
            }
        });

        // Use raw SQL to set demo fields that the Prisma client might not know about yet
        if (isDemo) {
            await prisma.$executeRaw`
                UPDATE proyectos 
                SET "isDemo" = true,
                    "demoExpiresAt" = ${userRecord.demoEndsAt ? new Date(userRecord.demoEndsAt) : null},
                    "visibilityStatus" = 'PUBLICADO'
                WHERE id = ${proyecto.id}
            `;

            // Mark demo as used if it hasn't been already
            await prisma.$executeRaw`
                UPDATE users 
                SET "demoUsed" = true 
                WHERE id = ${userId}
            `;
        }

        revalidatePath("/dashboard/proyectos");
        return { success: true, data: proyecto };
    } catch (error) {
        console.error("Error creating project:", error);
        return { success: false, error: "Error al crear proyecto" };
    }
}

export async function updateProyecto(id: string, data: Partial<{
    nombre: string;
    slug: string;
    descripcion: string;
    ubicacion: string;
    estado: string;
    tipo: string;
    imagenPortada: string;
    galeria: string;
    documentos: string;
    masterplanSVG: string;
    mapCenterLat: number;
    mapCenterLng: number;
    mapZoom: number;
    overlayUrl: string;
    overlayBounds: string;
    overlayRotation: number;
    invertible: boolean;
    precioM2Inversor: number;
    precioM2Mercado: number;
    metaM2Objetivo: number;
    fechaLimiteFondeo: Date;
    aiKnowledgeBase: string;
    aiSystemPrompt: string;
}>) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;

        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
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

        if (user.role === "ADMIN") {
        } else if (user.role === "DESARROLLADOR" || user.role === "VENDEDOR") {
            if (proyecto.creadoPorId && proyecto.creadoPorId !== user.id) {
                return { success: false, error: "No tienes permisos para eliminar este proyecto" };
            }
        } else {
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
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
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

export async function getProyectoArchivos(proyectoId: string) {
    try {
        const archivos: any[] = await prisma.$queryRaw`
            SELECT * FROM proyecto_archivos 
            WHERE "proyectoId" = ${proyectoId} 
            ORDER BY "createdAt" DESC
        `;
        return { success: true, data: archivos };
    } catch (error) {
        console.error("Error fetching project files:", error);
        return { success: true, data: [] }; // Return empty instead of error for better UX
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
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const id = `pa_${Math.random().toString(36).substring(2, 11)}`;
        await prisma.$executeRaw`
            INSERT INTO proyecto_archivos (id, "proyectoId", tipo, nombre, url, "visiblePublicamente", "createdAt")
            VALUES (${id}, ${data.proyectoId}, ${data.tipo}, ${data.nombre}, ${data.url}, ${data.visiblePublicamente}, NOW())
        `;
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
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.$executeRaw`
            DELETE FROM proyecto_archivos WHERE id = ${id}
        `;
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
        const imagenes: any[] = await prisma.$queryRaw`
            SELECT * FROM proyecto_imagenes 
            WHERE "proyectoId" = ${proyectoId} 
            ORDER BY "orden" ASC
        `;
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
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const id = `pi_${Math.random().toString(36).substring(2, 11)}`;
        const esPrincipal = data.esPrincipal || false;

        if (esPrincipal) {
            await prisma.$executeRaw`
                UPDATE proyecto_imagenes SET "esPrincipal" = false WHERE "proyectoId" = ${data.proyectoId}
            `;
            await prisma.$executeRaw`
                UPDATE proyectos SET "imagenPortada" = ${data.url} WHERE id = ${data.proyectoId}
            `;
        }

        await prisma.$executeRaw`
            INSERT INTO proyecto_imagenes (id, "proyectoId", url, categoria, "esPrincipal", "orden", "createdAt")
            VALUES (${id}, ${data.proyectoId}, ${data.url}, ${data.categoria}, ${esPrincipal}, ${data.orden || 0}, NOW())
        `;

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
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        for (const update of updates) {
            await prisma.$executeRaw`
                UPDATE proyecto_imagenes SET "orden" = ${update.orden} WHERE id = ${update.id}
            `;
        }
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
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.$executeRaw`
            DELETE FROM proyecto_imagenes WHERE id = ${id}
        `;
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
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const imgs: any[] = await prisma.$queryRaw`
            SELECT url FROM proyecto_imagenes WHERE id = ${id}
        `;
        if (imgs.length === 0) return { success: false, error: "Imagen no encontrada" };

        const url = imgs[0].url;

        await prisma.$executeRaw`
            UPDATE proyecto_imagenes SET "esPrincipal" = false WHERE "proyectoId" = ${proyectoId}
        `;
        await prisma.$executeRaw`
            UPDATE proyecto_imagenes SET "esPrincipal" = true WHERE id = ${id}
        `;
        await prisma.$executeRaw`
            UPDATE proyectos SET "imagenPortada" = ${url} WHERE id = ${proyectoId}
        `;

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error setting main image:", error);
        return { success: false, error: "Error al establecer imagen principal" };
    }
}
