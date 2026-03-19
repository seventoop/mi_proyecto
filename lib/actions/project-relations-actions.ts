"use server";

/**
 * lib/actions/project-relations-actions.ts
 *
 * Server Actions for ProyectoUsuario relation management:
 * assign, revoke, and permission defaults per relation type.
 */

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError } from "@/lib/guards";
import { getProjectAccess, assertPermission, ProjectPermission } from "@/lib/project-access";
import { audit } from "@/lib/actions/audit";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schema ───────────────────────────────────────────────────────────────────

const assignUserSchema = z.object({
    proyectoId:    idSchema,
    targetUserId:  idSchema,
    tipoRelacion:  z.enum([
        "OWNER", "COLABORADOR", "VENDEDOR_ASIGNADO",
        "COMERCIALIZADOR_EXCLUSIVO", "COMERCIALIZADOR_NO_EXCLUSIVO", "SOLO_LECTURA",
    ]),
    permisoEditarProyecto:      z.boolean().optional(),
    permisoSubirDocumentacion:  z.boolean().optional(),
    permisoVerLeadsGlobales:    z.boolean().optional(),
    permisoVerMetricasGlobales: z.boolean().optional(),
    tipoMandato:         z.enum(["EXCLUSIVO", "NO_EXCLUSIVO"]).optional(),
    documentoMandatoUrl: z.string().url().optional(),
    mandatoVigenciaDesde: z.string().datetime().optional(),
    mandatoVigenciaHasta: z.string().datetime().optional(),
    notas:               z.string().max(500).optional(),
});

// ─── assignUserToProject ──────────────────────────────────────────────────────

export async function assignUserToProject(input: unknown) {
    try {
        const user = await requireAuth();

        const parsed = assignUserSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // 1. Permission: must be ADMIN or OWNER of the project
        const ctx = await getProjectAccess(user, data.proyectoId);
        assertPermission(ctx, ProjectPermission.GESTIONAR_RELACIONES);

        // 2. Tenant check: target user must belong to the same org
        const targetUser = await prisma.user.findUnique({
            where: { id: data.targetUserId },
            select: { id: true, nombre: true, orgId: true },
        });

        if (!targetUser) {
            return { success: false, error: "Usuario no encontrado" };
        }

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin && targetUser.orgId !== user.orgId) {
            return { success: false, error: "El usuario debe pertenecer a la misma organización" };
        }

        // 3. Exclusivity check for COMERCIALIZADOR_EXCLUSIVO
        if (data.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO") {
            const vigenciaDesde = data.mandatoVigenciaDesde ? new Date(data.mandatoVigenciaDesde) : null;
            const vigenciaHasta = data.mandatoVigenciaHasta ? new Date(data.mandatoVigenciaHasta) : null;

            const existingExclusivo = await prisma.proyectoUsuario.findFirst({
                where: {
                    proyectoId:     data.proyectoId,
                    tipoRelacion:   "COMERCIALIZADOR_EXCLUSIVO",
                    estadoRelacion: "ACTIVA",
                    NOT: { userId: data.targetUserId },
                },
                select: {
                    mandatoVigenciaDesde: true,
                    mandatoVigenciaHasta: true,
                    user: { select: { nombre: true } },
                },
            });

            if (existingExclusivo) {
                const existsFrom = existingExclusivo.mandatoVigenciaDesde;
                const existsTo   = existingExclusivo.mandatoVigenciaHasta;
                const overlaps =
                    !vigenciaDesde || !vigenciaHasta || !existsFrom || !existsTo
                        ? true
                        : vigenciaDesde < existsTo && vigenciaHasta > existsFrom;

                if (overlaps) {
                    return {
                        success: false,
                        error: `Ya existe un comercializador exclusivo activo (${existingExclusivo.user.nombre}) con vigencia superpuesta`,
                    };
                }
            }
        }

        // 4. Resolve permissions and orgId
        const defaultPerms = defaultPermissionsFor(data.tipoRelacion);
        const orgId = isAdmin ? (targetUser.orgId ?? ctx.proyecto.orgId) : user.orgId;
        if (!orgId) {
            return { success: false, error: "No se pudo determinar la organización" };
        }

        const perms = {
            permisoEditarProyecto:       data.permisoEditarProyecto      ?? defaultPerms.permisoEditarProyecto,
            permisoSubirDocumentacion:   data.permisoSubirDocumentacion  ?? defaultPerms.permisoSubirDocumentacion,
            permisoVerLeadsGlobales:     data.permisoVerLeadsGlobales     ?? defaultPerms.permisoVerLeadsGlobales,
            permisoVerMetricasGlobales:  data.permisoVerMetricasGlobales  ?? defaultPerms.permisoVerMetricasGlobales,
        };
        const mandato = {
            tipoMandato:          data.tipoMandato          ?? null,
            documentoMandatoUrl:  data.documentoMandatoUrl  ?? null,
            mandatoVigenciaDesde: data.mandatoVigenciaDesde ? new Date(data.mandatoVigenciaDesde) : null,
            mandatoVigenciaHasta: data.mandatoVigenciaHasta ? new Date(data.mandatoVigenciaHasta) : null,
            notas:                data.notas ?? null,
        };

        // 5. Upsert relation
        const relacion = await prisma.proyectoUsuario.upsert({
            where:  { proyectoId_userId: { proyectoId: data.proyectoId, userId: data.targetUserId } },
            update: { tipoRelacion: data.tipoRelacion, estadoRelacion: "ACTIVA", ...perms, ...mandato, asignadoPorId: user.id },
            create: { proyectoId: data.proyectoId, userId: data.targetUserId, orgId, tipoRelacion: data.tipoRelacion, estadoRelacion: "ACTIVA", ...perms, ...mandato, asignadoPorId: user.id },
        });

        await audit({
            userId: user.id,
            action: "PROJECT_USER_ASSIGNED",
            entity: "ProyectoUsuario",
            entityId: relacion.id,
            details: { proyectoId: data.proyectoId, targetUserId: data.targetUserId, targetNombre: targetUser.nombre, tipoRelacion: data.tipoRelacion },
        });

        revalidatePath(`/dashboard/developer/proyectos/${data.proyectoId}`);
        return { success: true, data: relacion };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── revokeUserFromProject ────────────────────────────────────────────────────

export async function revokeUserFromProject(proyectoId: string, targetUserId: string) {
    try {
        const user = await requireAuth();

        const ctx = await getProjectAccess(user, proyectoId);
        assertPermission(ctx, ProjectPermission.GESTIONAR_RELACIONES);

        const relacion = await prisma.proyectoUsuario.findUnique({
            where: { proyectoId_userId: { proyectoId, userId: targetUserId } },
            select: { tipoRelacion: true },
        });

        if (!relacion) {
            return { success: false, error: "El usuario no tiene relación con este proyecto" };
        }

        if (relacion.tipoRelacion === "OWNER") {
            const ownerCount = await prisma.proyectoUsuario.count({
                where: { proyectoId, tipoRelacion: "OWNER", estadoRelacion: "ACTIVA" },
            });
            if (ownerCount <= 1) {
                return { success: false, error: "No se puede revocar al único OWNER del proyecto" };
            }
        }

        await prisma.proyectoUsuario.update({
            where: { proyectoId_userId: { proyectoId, userId: targetUserId } },
            data:  { estadoRelacion: "VENCIDA" },
        });

        await audit({
            userId: user.id,
            action: "PROJECT_USER_REVOKED",
            entity: "ProyectoUsuario",
            details: { proyectoId, targetUserId },
        });

        revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Default permissions by relation type.
 *
 * Lead visibility policy (permisoVerLeadsGlobales):
 *   OWNER                      → true  (full project visibility)
 *   COLABORADOR                → false (docs only, no CRM)
 *   VENDEDOR_ASIGNADO          → false (sees only OWN assigned leads by default)
 *   COMERCIALIZADOR_EXCLUSIVO  → true  (exclusive mandate requires full pipeline visibility)
 *   COMERCIALIZADOR_NO_EXCLUSIVO → false (sees only own leads by default)
 *   SOLO_LECTURA               → false
 *
 * Rationale for COMERCIALIZADOR_EXCLUSIVO=true: the exclusive mandate contractually
 * gives them full commercial responsibility for the project; they need the full lead
 * funnel to work. Overrideable per-assignment if the OWNER restricts it.
 *
 * Metrics policy (permisoVerMetricasGlobales) follows the same logic.
 * VENDEDOR_ASIGNADO intentionally starts with own-only metrics to preserve privacy
 * between competing vendedores on the same project.
 */
function defaultPermissionsFor(tipoRelacion: string) {
    switch (tipoRelacion) {
        case "OWNER":
            return { permisoEditarProyecto: true,  permisoSubirDocumentacion: true,  permisoVerLeadsGlobales: true,  permisoVerMetricasGlobales: true  };
        case "COLABORADOR":
            return { permisoEditarProyecto: false, permisoSubirDocumentacion: true,  permisoVerLeadsGlobales: false, permisoVerMetricasGlobales: false };
        case "VENDEDOR_ASIGNADO":
            // Own leads/metrics only — OWNER can grant global access per-assignment if needed
            return { permisoEditarProyecto: false, permisoSubirDocumentacion: false, permisoVerLeadsGlobales: false, permisoVerMetricasGlobales: false };
        case "COMERCIALIZADOR_EXCLUSIVO":
            // Full visibility — exclusive mandate requires complete project funnel
            return { permisoEditarProyecto: false, permisoSubirDocumentacion: false, permisoVerLeadsGlobales: true,  permisoVerMetricasGlobales: true  };
        case "COMERCIALIZADOR_NO_EXCLUSIVO":
            // Own leads/metrics only by default — no exclusive mandate
            return { permisoEditarProyecto: false, permisoSubirDocumentacion: false, permisoVerLeadsGlobales: false, permisoVerMetricasGlobales: false };
        default: // SOLO_LECTURA
            return { permisoEditarProyecto: false, permisoSubirDocumentacion: false, permisoVerLeadsGlobales: false, permisoVerMetricasGlobales: false };
    }
}
