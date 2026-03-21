/**
 * lib/project-access/assert-permission.ts
 *
 * Throws AuthError with a contextual message when a permission check fails.
 * BLOCKING_STATE errors use 423 (Locked) to signal to the client
 * that the operation is not possible regardless of credentials.
 */

import { AuthError } from "@/lib/auth-types";
import { isBlockingState, ProjectPermission, type ProjectAccessContext, type BlockReason } from "./types";

// ─── resolveBlockReason ───────────────────────────────────────────────────────

export function resolveBlockReason(
    ctx: ProjectAccessContext,
    permission: ProjectPermission,
): BlockReason | null {
    if (ctx.can(permission)) return null;

    const estado = ctx.proyecto.estadoValidacion;

    // BLOCKING_STATE takes priority in the message
    if (isBlockingState(estado)) {
        return {
            code: "BLOCKING_STATE",
            message:
                estado === "RECHAZADO"
                    ? "Este proyecto fue rechazado y no puede operar comercialmente"
                    : "Este proyecto está suspendido y no puede operar comercialmente",
        };
    }

    // Commercial flag disabled
    if (
        permission === ProjectPermission.PUBLICAR ||
        permission === ProjectPermission.RESERVAR ||
        permission === ProjectPermission.CAPTAR_LEADS
    ) {
        return {
            code: "FLAG_DISABLED",
            message: `El proyecto aún no está habilitado para esta operación (estado: ${estado})`,
        };
    }

    // No relation at all
    if (!ctx.relacion && !ctx.isLegacy) {
        return {
            code: "NO_RELATION",
            message: "No tienes ninguna relación activa con este proyecto",
        };
    }

    return {
        code: "NO_PERMISSION",
        message: "No tienes los permisos necesarios para esta acción",
    };
}

// ─── assertPermission ─────────────────────────────────────────────────────────

/**
 * Throws AuthError if the user does not have the given permission.
 *
 * Status codes:
 *  - 423 Locked     — BLOCKING_STATE (RECHAZADO / SUSPENDIDO)
 *  - 403 Forbidden  — permission missing
 *  - 404 Not Found  — no relation (leaks no info about project existence)
 */
export function assertPermission(
    ctx: ProjectAccessContext,
    permission: ProjectPermission,
): void {
    const block = resolveBlockReason(ctx, permission);
    if (!block) return;

    switch (block.code) {
        case "BLOCKING_STATE":
            throw new AuthError(block.message, 423);
        case "NO_RELATION":
            throw new AuthError("Proyecto no encontrado", 404);
        default:
            throw new AuthError(block.message, 403);
    }
}

/**
 * Like assertPermission but for multiple permissions (all must pass).
 */
export function assertPermissions(
    ctx: ProjectAccessContext,
    permissions: ProjectPermission[],
): void {
    for (const p of permissions) {
        assertPermission(ctx, p);
    }
}
