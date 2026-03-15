"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema } from "@/lib/validations";
import { requireAuth, requireAnyRole, requireRole, handleGuardError } from "@/lib/guards";
import { sendNotification } from "@/lib/notifications/send";
import { BANNER_ESTADOS, BANNER_CONTEXT, MAX_PUBLISHED_PER_CONTEXT } from "./banners-constants";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const bannerCreateSchema = z.object({
    titulo: z.string().min(1, "Título requerido").max(100),
    internalName: z.string().max(150).optional().nullable(),
    headline: z.string().max(120).optional().nullable(),
    subheadline: z.string().max(200).optional().nullable(),
    tagline: z.string().max(60).optional().nullable(),
    ctaText: z.string().max(60).optional().nullable(),
    ctaUrl: z.string().max(500).optional().nullable().or(z.literal("")),
    tipo: z.enum(["IMAGEN", "VIDEO"]).default("IMAGEN"),
    mediaUrl: z.string().min(1, "URL de media requerida").max(1000).optional().nullable().or(z.literal("")),
    context: z.enum(["SEVENTOOP_GLOBAL", "ORG_LANDING", "PROJECT_LANDING"]).default("ORG_LANDING"),
    projectId: idSchema.optional().nullable(),
    posicion: z.string().default("HOME_TOP"),
    prioridad: z.number().int().default(0),
    fechaInicio: z.preprocess(
        (a) => (typeof a === "string" ? new Date(a) : a),
        z.date().optional().nullable()
    ),
    fechaFin: z.preprocess(
        (a) => (typeof a === "string" ? new Date(a) : a),
        z.date().optional().nullable()
    ),
    // legado
    linkDestino: z.string().max(1000).optional().nullable().or(z.literal("")),
});

const bannerUpdateSchema = bannerCreateSchema.partial().extend({
    notasAdmin: z.string().max(500).optional().nullable(),
    estado: z.string().optional(),
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getBanners(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    context?: string;
} = {}) {
    try {
        const user = await requireAuth();
        const { page = 1, pageSize = 20, status, context } = params;
        const skip = (page - 1) * pageSize;

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        const where: Record<string, unknown> = {};

        // Multi-tenant scoping
        if (!isAdmin) {
            if (user.orgId) {
                where.orgId = user.orgId;
            } else {
                where.creadoPorId = user.id;
            }
        }

        if (status) where.estado = status;
        if (context) where.context = context;

        const [banners, total] = await Promise.all([
            prisma.banner.findMany({
                where,
                include: {
                    creadoPor: { select: { id: true, nombre: true, email: true, rol: true } },
                    approvedBy: { select: { id: true, nombre: true } },
                    proyecto: { select: { id: true, nombre: true } },
                },
                orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }],
                take: pageSize,
                skip,
            }),
            prisma.banner.count({ where }),
        ]);

        return {
            success: true,
            data: banners,
            metadata: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

/**
 * Banners para landing pública.
 *
 * Reglas de visibilidad por contexto:
 *
 *   SEVENTOOP_GLOBAL (sin orgId/projectId):
 *     → Solo banners de plataforma creados por admin SevenToop.
 *     → Usados en la landing principal de la plataforma (/)).
 *
 *   ORG_LANDING (requiere orgId):
 *     → Banners de esa organización específica + SEVENTOOP_GLOBAL.
 *     → Sin orgId no retorna ORG_LANDING de ninguna org (evita mezclar orgs).
 *
 *   PROJECT_LANDING (requiere projectId):
 *     → Banners de ese proyecto específico + ORG_LANDING de la org + SEVENTOOP_GLOBAL.
 *     → Sin projectId no retorna PROJECT_LANDING de ningún proyecto.
 *     → orgId sigue siendo necesario para el fallback ORG_LANDING.
 *
 * Orden: prioridad desc, publishedAt desc. Máximo MAX_PUBLISHED_PER_CONTEXT resultados.
 */
export async function getBannersLanding(
    orgId?: string,
    context: string = "ORG_LANDING",
    projectId?: string,
) {
    try {
        const baseSelect = {
            id: true,
            titulo: true,
            headline: true,
            subheadline: true,
            tagline: true,
            ctaText: true,
            ctaUrl: true,
            linkDestino: true,
            mediaUrl: true,
            tipo: true,
            prioridad: true,
            publishedAt: true,
            context: true,
        };

        const orderBy = [{ prioridad: "desc" as const }, { publishedAt: "desc" as const }];

        // ── SEVENTOOP_GLOBAL: solo plataforma, sin filtro de org ──────────────
        if (context === BANNER_CONTEXT.SEVENTOOP_GLOBAL) {
            const banners = await prisma.banner.findMany({
                where: { estado: BANNER_ESTADOS.PUBLISHED, context: BANNER_CONTEXT.SEVENTOOP_GLOBAL },
                select: baseSelect,
                orderBy,
                take: MAX_PUBLISHED_PER_CONTEXT,
            });
            return { success: true, data: banners };
        }

        // Siempre se incluyen los banners globales de plataforma
        const orConditions: Record<string, unknown>[] = [
            { context: BANNER_CONTEXT.SEVENTOOP_GLOBAL },
        ];

        // ── PROJECT_LANDING: filtrar por projectId exacto ─────────────────────
        if (context === BANNER_CONTEXT.PROJECT_LANDING) {
            if (projectId) {
                // Banners de este proyecto específico
                orConditions.push({ context: BANNER_CONTEXT.PROJECT_LANDING, projectId });
            }
            // Fallback: ORG_LANDING de la misma org (si hay orgId)
            if (orgId) {
                orConditions.push({ context: BANNER_CONTEXT.ORG_LANDING, orgId });
            }
        }

        // ── ORG_LANDING: solo de la org indicada ─────────────────────────────
        // Sin orgId no se agrega ningún ORG_LANDING — la landing principal de
        // SevenToop (/) llama sin orgId y solo recibe SEVENTOOP_GLOBAL.
        if (context === BANNER_CONTEXT.ORG_LANDING && orgId) {
            orConditions.push({ context: BANNER_CONTEXT.ORG_LANDING, orgId });
        }

        const banners = await prisma.banner.findMany({
            where: {
                estado: BANNER_ESTADOS.PUBLISHED,
                OR: orConditions,
            },
            select: baseSelect,
            orderBy,
            take: MAX_PUBLISHED_PER_CONTEXT,
        });

        return { success: true, data: banners };
    } catch (error) {
        console.error("[getBannersLanding]", error);
        return { success: false, data: [], error: "Error fetching banners" };
    }
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Crea un banner en estado DRAFT */
export async function createBanner(input: unknown) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        const parsed = bannerCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
        }
        const data = parsed.data;

        // SEVENTOOP_GLOBAL: solo admin
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (data.context === BANNER_CONTEXT.SEVENTOOP_GLOBAL && !isAdmin) {
            return { success: false, error: "Solo administradores pueden crear banners globales de SevenToop." };
        }

        // PROJECT_LANDING: requiere projectId y solo admite imagen
        if (data.context === BANNER_CONTEXT.PROJECT_LANDING) {
            if (!data.projectId) {
                return { success: false, error: "El banner de proyecto requiere seleccionar un proyecto." };
            }
            if (data.tipo !== "IMAGEN") {
                return { success: false, error: "El banner de proyecto solo admite imágenes (no video)." };
            }
        }

        // Si hay projectId, verificar que pertenece al mismo org
        if (data.projectId && user.orgId) {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: data.projectId },
                select: { orgId: true },
            });
            if (proyecto?.orgId && proyecto.orgId !== user.orgId) {
                return { success: false, error: "No tenés acceso a ese proyecto." };
            }
        }

        const banner = await prisma.banner.create({
            data: {
                titulo: data.titulo,
                internalName: data.internalName ?? null,
                headline: data.headline ?? null,
                subheadline: data.subheadline ?? null,
                tagline: data.tagline ?? null,
                ctaText: data.ctaText ?? null,
                ctaUrl: data.ctaUrl || null,
                tipo: data.tipo,
                mediaUrl: data.mediaUrl || "",
                context: data.context,
                projectId: data.projectId ?? null,
                posicion: data.posicion,
                prioridad: data.prioridad,
                fechaInicio: data.fechaInicio ?? null,
                fechaFin: data.fechaFin ?? null,
                linkDestino: data.linkDestino || null,
                orgId: user.orgId ?? null,
                creadoPorId: user.id,
                estado: BANNER_ESTADOS.DRAFT,
            },
        });

        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        revalidatePath("/dashboard/banners");
        return { success: true, data: banner };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** Edita campos de contenido de un banner propio (no cambia estado) */
export async function updateBanner(id: string, input: unknown) {
    try {
        const user = await requireAuth();

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const parsed = bannerUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
        }
        const data = parsed.data;

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        // Ownership check
        const existing = await prisma.banner.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Banner no encontrado" };
        if (!isAdmin && existing.creadoPorId !== user.id) {
            return { success: false, error: "No tenés permisos para editar este banner." };
        }

        // Non-admin cannot change estado directamente
        if (!isAdmin && data.estado) {
            return { success: false, error: "No podés cambiar el estado directamente." };
        }

        // Non-admin cannot edit published banners
        if (!isAdmin && existing.estado === BANNER_ESTADOS.PUBLISHED) {
            return { success: false, error: "No podés editar un banner publicado. Pausalo primero." };
        }

        const { estado, notasAdmin, ...contentData } = data;

        const updatePayload: Record<string, unknown> = { ...contentData };
        if (isAdmin && estado) updatePayload.estado = estado;
        if (isAdmin && notasAdmin !== undefined) updatePayload.notasAdmin = notasAdmin;

        const banner = await prisma.banner.update({ where: { id }, data: updatePayload });

        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        revalidatePath("/dashboard/admin/banners");
        revalidatePath("/dashboard/banners");
        return { success: true, data: banner };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** Envía banner a revisión del admin (DRAFT → PENDING_APPROVAL) */
export async function submitBannerForApproval(id: string) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const existing = await prisma.banner.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Banner no encontrado" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin && existing.creadoPorId !== user.id) {
            return { success: false, error: "No tenés permisos sobre este banner." };
        }

        if (!existing.mediaUrl) {
            return { success: false, error: "El banner debe tener un archivo de media antes de enviarse." };
        }

        if (![BANNER_ESTADOS.DRAFT, BANNER_ESTADOS.REJECTED].includes(existing.estado as any)) {
            return { success: false, error: `No se puede enviar un banner en estado "${existing.estado}".` };
        }

        // Admin puede auto-publicar
        if (isAdmin) {
            return publishBanner(id);
        }

        await prisma.banner.update({
            where: { id },
            data: { estado: BANNER_ESTADOS.PENDING_APPROVAL },
        });

        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        revalidatePath("/dashboard/admin/banners");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/**
 * Admin aprueba y publica un banner.
 * Regla: solo un banner PUBLISHED por (context + orgId).
 * El anterior se pausa automáticamente.
 */
export async function publishBanner(id: string) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const banner = await prisma.banner.findUnique({
            where: { id },
            include: { creadoPor: { select: { rol: true } } },
        });
        if (!banner) return { success: false, error: "Banner no encontrado" };

        const creatorBannersPath =
            banner.creadoPor?.rol === "VENDEDOR"
                ? "/dashboard/vendedor/banners"
                : "/dashboard/developer/banners";

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            if (banner.context === BANNER_CONTEXT.PROJECT_LANDING) {
                // PROJECT_LANDING: solo 1 activo por projectId — pausa el anterior directamente
                if (banner.projectId) {
                    await tx.banner.updateMany({
                        where: {
                            id: { not: id },
                            context: BANNER_CONTEXT.PROJECT_LANDING,
                            projectId: banner.projectId,
                            estado: BANNER_ESTADOS.PUBLISHED,
                        },
                        data: { estado: BANNER_ESTADOS.PAUSED },
                    });
                }
            } else {
                // SEVENTOOP_GLOBAL / ORG_LANDING: rotación hasta MAX_PUBLISHED_PER_CONTEXT.
                // Si ya hay MAX activos, pausa el(los) más antiguo(s) para hacer lugar.
                const currentPublished = await tx.banner.findMany({
                    where: {
                        id: { not: id },
                        context: banner.context,
                        orgId: banner.orgId,
                        estado: BANNER_ESTADOS.PUBLISHED,
                    },
                    select: { id: true, publishedAt: true },
                    orderBy: { publishedAt: "asc" },
                });

                if (currentPublished.length >= MAX_PUBLISHED_PER_CONTEXT) {
                    const overflow = currentPublished.length - MAX_PUBLISHED_PER_CONTEXT + 1;
                    const idsToOverflow = currentPublished.slice(0, overflow).map((b) => b.id);
                    await tx.banner.updateMany({
                        where: { id: { in: idsToOverflow } },
                        data: { estado: BANNER_ESTADOS.PAUSED },
                    });
                }
            }

            // Publicar el nuevo
            await tx.banner.update({
                where: { id },
                data: {
                    estado: BANNER_ESTADOS.PUBLISHED,
                    approvedById: user.id,
                    approvedAt: now,
                    publishedAt: now,
                    notasAdmin: null,
                },
            });
        });

        // Notificar al creador si no es el mismo admin
        if (banner.creadoPorId && banner.creadoPorId !== user.id) {
            await sendNotification({
                userId: banner.creadoPorId,
                tipo: "EXITO",
                titulo: "Tu banner fue aprobado",
                mensaje: `Tu banner "${banner.titulo}" fue aprobado y ya está publicado en la landing.`,
                linkAccion: creatorBannersPath,
            });
        }

        revalidatePath("/dashboard/admin/banners");
        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** Admin rechaza un banner con motivo opcional */
export async function rejectBanner(id: string, reason?: string) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const banner = await prisma.banner.findUnique({
            where: { id },
            include: { creadoPor: { select: { rol: true } } },
        });
        if (!banner) return { success: false, error: "Banner no encontrado" };

        const creatorBannersPath =
            banner.creadoPor?.rol === "VENDEDOR"
                ? "/dashboard/vendedor/banners"
                : "/dashboard/developer/banners";

        await prisma.banner.update({
            where: { id },
            data: {
                estado: BANNER_ESTADOS.REJECTED,
                notasAdmin: reason ?? null,
            },
        });

        // Notificar al creador
        if (banner.creadoPorId && banner.creadoPorId !== user.id) {
            await sendNotification({
                userId: banner.creadoPorId,
                tipo: "ERROR",
                titulo: "Tu banner fue rechazado",
                mensaje: reason
                    ? `Tu banner "${banner.titulo}" fue rechazado. Motivo: ${reason}`
                    : `Tu banner "${banner.titulo}" fue rechazado. Revisá las observaciones del administrador.`,
                linkAccion: creatorBannersPath,
            });
        }

        revalidatePath("/dashboard/admin/banners");
        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** Pausa un banner publicado (solo admin) */
export async function pauseBanner(id: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        await prisma.banner.update({
            where: { id },
            data: { estado: BANNER_ESTADOS.PAUSED },
        });

        revalidatePath("/dashboard/admin/banners");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** Archiva un banner (admin, o creador si está en DRAFT/REJECTED) */
export async function archiveBanner(id: string) {
    try {
        const user = await requireAuth();

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        const existing = await prisma.banner.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Banner no encontrado" };

        if (!isAdmin && existing.creadoPorId !== user.id) {
            return { success: false, error: "No tenés permisos." };
        }

        if (!isAdmin && ![BANNER_ESTADOS.DRAFT, BANNER_ESTADOS.REJECTED].includes(existing.estado as any)) {
            return { success: false, error: "Solo podés archivar banners en borrador o rechazados." };
        }

        await prisma.banner.update({ where: { id }, data: { estado: BANNER_ESTADOS.ARCHIVED } });

        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        revalidatePath("/dashboard/admin/banners");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** Elimina un banner (admin, o creador si está en DRAFT) */
export async function deleteBanner(id: string) {
    console.log(`[deleteBanner] Iniciando borrado para id: ${id}`);
    try {
        const user = await requireAuth();
        console.log(`[deleteBanner] Usuario autenticado: ${user.id}, rol: ${user.role}`);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) {
            console.error(`[deleteBanner] Error: ID inválido: ${id}`);
            return { success: false, error: "ID inválido" };
        }

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        const existing = await prisma.banner.findUnique({ where: { id } });
        if (!existing) {
            console.error(`[deleteBanner] Error: Banner no encontrado: ${id}`);
            return { success: false, error: "Banner no encontrado" };
        }

        console.log(`[deleteBanner] Banner encontrado. Creador: ${existing.creadoPorId}, Estado: ${existing.estado}, isAdmin: ${isAdmin}`);

        if (!isAdmin && existing.creadoPorId !== user.id) {
            console.error(`[deleteBanner] Error de permisos. Creador !== Usuario actual.`);
            return { success: false, error: "No tenés permisos." };
        }

        // Si el usuario es admin puede borrar cualquier cosa.
        // Si no es admin, ya comprobamos arriba que es el creador.
        // Ahora le permitimos al creador borrar su propio banner en cualquier estado.

        console.log(`[deleteBanner] Ejecutando prisma.banner.delete...`);
        await prisma.banner.delete({ where: { id } });
        console.log(`[deleteBanner] Borrado exitoso en DB.`);

        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        revalidatePath("/dashboard/admin/banners");
        return { success: true };
    } catch (error) {
        console.error(`[deleteBanner] Excepción capturada:`, error);
        return handleGuardError(error);
    }
}

/** Legacy: mantener compatibilidad con código viejo que llama updateBanner con estado */
export async function updateBannerStatus(id: string, newStatus: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID inválido" };

        if (newStatus === BANNER_ESTADOS.PUBLISHED) return publishBanner(id);
        if (newStatus === BANNER_ESTADOS.REJECTED) return rejectBanner(id);
        if (newStatus === BANNER_ESTADOS.PAUSED) return pauseBanner(id);

        await prisma.banner.update({ where: { id }, data: { estado: newStatus } });
        revalidatePath("/dashboard/admin/banners");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/** Legacy: linkBannerPayment — mantenido para no romper código existente */
export async function linkBannerPayment(bannerId: string, comprobanteUrl: string, monto: number) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const idParsed = idSchema.safeParse(bannerId);
        if (!idParsed.success) return { success: false, error: "ID de banner inválido" };

        const banner = await prisma.banner.findUnique({ where: { id: bannerId } });
        if (!banner || !banner.creadoPorId) return { success: false, error: "Banner no válido" };

        await prisma.pago.create({
            data: {
                monto,
                concepto: `Pago por Banner: ${banner.titulo}`,
                comprobanteUrl,
                usuarioId: banner.creadoPorId,
                bannerId: banner.id,
                estado: "PENDIENTE",
                tipo: "BANNER_PAYMENT" as any,
                fechaPago: new Date(),
            },
        });

        await prisma.banner.update({
            where: { id: bannerId },
            data: { estado: BANNER_ESTADOS.PENDING_APPROVAL },
        });

        revalidatePath("/dashboard/developer/banners");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

/**
 * Fetches the single active PROJECT_LANDING banner for a project (public page hero).
 * Uses a direct query instead of getBannersLanding to avoid the MAX_PUBLISHED_PER_CONTEXT
 * take limit cutting off project banners when global banners have higher priority.
 */
export async function getProjectBanner(projectId: string) {
    try {
        const banner = await prisma.banner.findFirst({
            where: {
                context: BANNER_CONTEXT.PROJECT_LANDING,
                projectId,
                estado: BANNER_ESTADOS.PUBLISHED,
            },
            select: {
                id: true,
                mediaUrl: true,
                tipo: true,
                headline: true,
                subheadline: true,
                tagline: true,
            },
            orderBy: [{ prioridad: "desc" }, { publishedAt: "desc" }],
        });
        return { success: true, data: banner ?? null };
    } catch (error) {
        console.error("[getProjectBanner]", error);
        return { success: false, data: null };
    }
}

/**
 * Returns the user's org projects (id + nombre) for the banner PROJECT_LANDING selector.
 */
export async function getMyProyectos() {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        const proyectos = await prisma.proyecto.findMany({
            where: isAdmin ? { deletedAt: null } : { orgId: user.orgId ?? undefined, deletedAt: null },
            select: { id: true, nombre: true },
            orderBy: { nombre: "asc" },
            take: 200,
        });

        return { success: true, data: proyectos };
    } catch (error) {
        return handleGuardError(error);
    }
}
