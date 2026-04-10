/**
 * lib/project-access/get-project-access.ts
 *
 * Central function that loads the ProyectoUsuario relation and project snapshot,
 * then builds a ProjectAccessContext with evaluated permissions.
 *
 * Access resolution order:
 *  1. ADMIN/SUPERADMIN — full management access; still blocked by BLOCKING_STATES
 *     for commercial operations.
 *  2. ProyectoUsuario relation (ACTIVA) — granular per-relation permissions.
 *  3. Legacy fallback — creadoPorId match treated as implicit OWNER (ACTIVA).
 */

import prisma from "@/lib/db";
import { AuthError } from "@/lib/auth-types";
import type { AuthUser } from "@/lib/auth-types";
import {
    ProjectPermission,
    isBlockingState,
    type ProjectAccessContext,
    type ProjectSnapshot,
    type ProjectRelation,
} from "./types";

// ─── Permission evaluator ─────────────────────────────────────────────────────

function buildCan(
    user: AuthUser,
    proyecto: ProjectSnapshot,
    relacion: ProjectRelation | null,
): (permission: ProjectPermission) => boolean {
    const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
    const blocking = isBlockingState(proyecto.estadoValidacion);

    // Effective OWNER: admin, explicit OWNER relation, or legacy creadoPorId match
    const isOwner =
        isAdmin ||
        relacion?.tipoRelacion === "OWNER" ||
        (!relacion && proyecto.creadoPorId === user.id);

    const isColaborador = relacion?.tipoRelacion === "COLABORADOR";

    return (permission: ProjectPermission): boolean => {
        switch (permission) {
            // ── Management ──────────────────────────────────────────────────
            case ProjectPermission.EDITAR_PROYECTO:
                if (isOwner) return true;
                if (isColaborador) return false; // COLABORADOR never edits
                return relacion?.estadoRelacion === "ACTIVA" &&
                       (relacion.permisoEditarProyecto ?? false);

            case ProjectPermission.SUBIR_DOCUMENTACION:
                if (isOwner) return true;
                if (isColaborador) return relacion?.estadoRelacion === "ACTIVA";
                return relacion?.estadoRelacion === "ACTIVA" &&
                       (relacion.permisoSubirDocumentacion ?? false);

            case ProjectPermission.GESTIONAR_RELACIONES:
                return isOwner; // ADMIN or OWNER only

            case ProjectPermission.TRANSICIONAR_ESTADO:
                return isAdmin; // only admin drives the state machine

            case ProjectPermission.OVERRIDE_FLAGS:
                return isAdmin;

            // ── Commercial (gated by blocking + flags) ───────────────────
            case ProjectPermission.PUBLICAR:
                if (blocking) return false;
                if (!proyecto.puedePublicarse) return false;
                return isOwner || relacion?.estadoRelacion === "ACTIVA";

            case ProjectPermission.RESERVAR:
                if (blocking) return false;
                if (!proyecto.puedeReservarse) return false;
                if (isColaborador) return false;
                return isOwner || relacion?.estadoRelacion === "ACTIVA";

            case ProjectPermission.CAPTAR_LEADS:
                if (blocking) return false;
                if (!proyecto.puedeCaptarLeads) return false;
                if (isColaborador) return false;
                return isOwner || relacion?.estadoRelacion === "ACTIVA";

            // ── Visibility ───────────────────────────────────────────────
            case ProjectPermission.VER_LEADS_GLOBALES:
                if (isAdmin || isOwner) return true;
                if (isColaborador) return false;
                return relacion?.estadoRelacion === "ACTIVA" &&
                       (relacion.permisoVerLeadsGlobales ?? false);

            case ProjectPermission.VER_METRICAS_GLOBALES:
                if (isAdmin || isOwner) return true;
                if (isColaborador) return false;
                return relacion?.estadoRelacion === "ACTIVA" &&
                       (relacion.permisoVerMetricasGlobales ?? false);

            default:
                return false;
        }
    };
}

// ─── getProjectAccess ─────────────────────────────────────────────────────────

/**
 * Loads access context for a given user+project pair.
 *
 * - Does NOT throw on missing permission — callers use ctx.can() or assertPermission().
 * - Throws AuthError(404) if project not found or outside the user's org.
 */
export async function getProjectAccess(
    user: AuthUser,
    proyectoId: string,
): Promise<ProjectAccessContext> {
    const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

    const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
            id:                 true,
            orgId:              true,
            creadoPorId:        true,
            estadoValidacion:   true,
            puedePublicarse:    true,
            puedeReservarse:    true,
            puedeCaptarLeads:   true,
            flagsOverridePorId: true,
        },
    });

    if (!proyecto) {
        throw new AuthError("Proyecto no encontrado", 404);
    }

    // Tenant boundary (non-admin users must be in the same org)
    if (!isAdmin) {
        if (!user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
            throw new AuthError("Proyecto no encontrado", 404);
        }
    }

    const snapshot: ProjectSnapshot = {
        id:                 proyecto.id,
        orgId:              proyecto.orgId,
        creadoPorId:        proyecto.creadoPorId,
        estadoValidacion:   proyecto.estadoValidacion,
        puedePublicarse:    proyecto.puedePublicarse,
        puedeReservarse:    proyecto.puedeReservarse,
        puedeCaptarLeads:   proyecto.puedeCaptarLeads,
        flagsOverridePorId: proyecto.flagsOverridePorId,
    };

    // Look up explicit relation (ACTIVA preferred, any state for others)
    let relacion: ProjectRelation | null = null;
    let isLegacy = false;

    if (!isAdmin) {
        const row = await prisma.proyectoUsuario.findUnique({
            where: { proyectoId_userId: { proyectoId, userId: user.id } },
            select: {
                tipoRelacion:                true,
                estadoRelacion:              true,
                permisoEditarProyecto:       true,
                permisoSubirDocumentacion:   true,
                permisoVerLeadsGlobales:     true,
                permisoVerMetricasGlobales:  true,
                mandatoVigenciaHasta:        true,
            },
        });

        if (row) {
            // 2c: COMERCIALIZADOR_* relations with an expired mandate are treated as VENCIDA.
            // This degrades their access to the same level as a VENCIDA relation (no commercial perms).
            const isComercializador =
                row.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" ||
                row.tipoRelacion === "COMERCIALIZADOR_NO_EXCLUSIVO";
            const mandatoExpired =
                isComercializador &&
                row.mandatoVigenciaHasta !== null &&
                row.mandatoVigenciaHasta < new Date();

            relacion = mandatoExpired
                ? { ...row, estadoRelacion: "VENCIDA" }
                : row;
        } else if (proyecto.creadoPorId === user.id) {
            const explicitOwner = await prisma.proyectoUsuario.findFirst({
                where: {
                    proyectoId,
                    tipoRelacion: "OWNER",
                    estadoRelacion: "ACTIVA",
                },
                select: { userId: true },
            });

            // Hardened legacy fallback:
            // only allow implicit OWNER when the project still has no explicit active OWNER
            // or when the explicit OWNER row belongs to the same user.
            if (!explicitOwner || explicitOwner.userId === user.id) {
                isLegacy = true;
                relacion = {
                    tipoRelacion:                "OWNER",
                    estadoRelacion:              "ACTIVA",
                    permisoEditarProyecto:       true,
                    permisoSubirDocumentacion:   true,
                    permisoVerLeadsGlobales:     true,
                    permisoVerMetricasGlobales:  true,
                    mandatoVigenciaHasta:        null, // OWNER has no mandate
                };
            }
        }
        // else: no relation, no legacy match → can() will return false for most permissions
    }

    const can = buildCan(user, snapshot, relacion);

    return {
        user,
        proyecto: snapshot,
        relacion: isAdmin ? null : relacion,
        isLegacy,
        can,
    };
}
