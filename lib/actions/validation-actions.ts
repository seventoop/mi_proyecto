"use server";

/**
 * lib/actions/validation-actions.ts
 *
 * Read-only server actions for the validation workflow:
 * - getProyectosPendientesValidacion: ADMIN-only queue view
 * - getProyectoEstadoLogs: transition history (ADMIN full, OWNER own project)
 */

import prisma from "@/lib/db";
import { requireAnyRole, requireAuth, handleGuardError } from "@/lib/guards";
import { getProjectAccess } from "@/lib/project-access";

// ─── getProyectosPendientesValidacion ─────────────────────────────────────────

/**
 * ADMIN-only: returns all projects currently in the validation queue.
 * Includes name, orgId, the first PENDIENTE_VALIDACION log (submission date +
 * who submitted) and the latest log entry for context.
 */
export async function getProyectosPendientesValidacion() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const proyectos = await prisma.proyecto.findMany({
            where: {
                estadoValidacion: { in: ["PENDIENTE_VALIDACION", "EN_REVISION"] },
                deletedAt: null,
            },
            select: {
                id:               true,
                nombre:           true,
                orgId:            true,
                estadoValidacion: true,
                createdAt:        true,
                estadoLogs: {
                    select: {
                        id:             true,
                        estadoAnterior: true,
                        estadoNuevo:    true,
                        realizadoPorId: true,
                        motivo:         true,
                        createdAt:      true,
                        realizadoPor: {
                            select: { id: true, nombre: true, email: true },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // Derive fechaSubmit (when it first entered PENDIENTE_VALIDACION) and submitter
        const result = proyectos.map(p => {
            const firstSubmitLog = p.estadoLogs.find(
                l => l.estadoNuevo === "PENDIENTE_VALIDACION"
            );
            return {
                id:               p.id,
                nombre:           p.nombre,
                orgId:            p.orgId,
                estadoValidacion: p.estadoValidacion,
                createdAt:        p.createdAt,
                fechaSubmit:      firstSubmitLog?.createdAt ?? null,
                submittedBy:      firstSubmitLog?.realizadoPor ?? null,
                latestLog:        p.estadoLogs.at(-1) ?? null,
            };
        });

        return { success: true, data: result };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── getProyectoEstadoLogs ─────────────────────────────────────────────────────

/**
 * Returns the full transition history for a project.
 * - ADMIN/SUPERADMIN: can query any project.
 * - OWNER (or legacy creadoPorId): can query their own project.
 * - Anyone else: 403.
 */
export async function getProyectoEstadoLogs(proyectoId: string) {
    try {
        const user = await requireAuth();
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        if (!isAdmin) {
            // Throws AuthError(404) if project not found or outside org
            const ctx = await getProjectAccess(user, proyectoId);
            const isOwner =
                ctx.relacion?.tipoRelacion === "OWNER" ||
                ctx.isLegacy;
            if (!isOwner) {
                return { success: false, error: "No autorizado para ver el historial de este proyecto" };
            }
        }

        const logs = await prisma.proyectoEstadoLog.findMany({
            where:   { proyectoId },
            orderBy: { createdAt: "desc" },
            select: {
                id:             true,
                estadoAnterior: true,
                estadoNuevo:    true,
                motivo:         true,
                flagsSnapshot:  true,
                createdAt:      true,
                realizadoPor: {
                    select: { id: true, nombre: true, email: true },
                },
            },
        });

        return { success: true, data: logs };
    } catch (error) {
        return handleGuardError(error);
    }
}
