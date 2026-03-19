/**
 * lib/project-access/transition-state.ts
 *
 * State machine for EstadoValidacionProyecto.
 * Side effects: syncOperationalFlags, ProyectoEstadoLog insert, flag override clear.
 *
 * Valid transitions:
 *   BORRADOR               → PENDIENTE_VALIDACION   (OWNER or ADMIN)
 *   PENDIENTE_VALIDACION   → EN_REVISION            (ADMIN)
 *   EN_REVISION            → APROBADO               (ADMIN)
 *   EN_REVISION            → OBSERVADO              (ADMIN)
 *   EN_REVISION            → RECHAZADO              (ADMIN)
 *   OBSERVADO              → PENDIENTE_VALIDACION   (OWNER or ADMIN — re-submit)
 *   APROBADO               → SUSPENDIDO             (ADMIN)
 *   SUSPENDIDO             → APROBADO               (ADMIN)
 *   any                    → BORRADOR               (ADMIN — reset)
 */

import prisma from "@/lib/db";
import { flagsFromEstado } from "./sync-flags";
import { isBlockingState } from "./types";
import type { EstadoValidacionProyecto, TransitionOptions } from "./types";

// ─── Transition table ─────────────────────────────────────────────────────────

type TransitionMap = Partial<Record<EstadoValidacionProyecto, EstadoValidacionProyecto[]>>;

/** Transitions available to OWNER (and also to ADMIN) */
const OWNER_TRANSITIONS: TransitionMap = {
    BORRADOR:            ["PENDIENTE_VALIDACION"],
    OBSERVADO:           ["PENDIENTE_VALIDACION"],
};

/** Transitions available to ADMIN only */
const ADMIN_TRANSITIONS: TransitionMap = {
    PENDIENTE_VALIDACION: ["EN_REVISION", "BORRADOR"],
    EN_REVISION:          ["APROBADO", "OBSERVADO", "RECHAZADO", "BORRADOR"],
    APROBADO:             ["SUSPENDIDO", "BORRADOR"],
    SUSPENDIDO:           ["APROBADO", "BORRADOR"],
    RECHAZADO:            ["BORRADOR"],
    // Allow admin to reset anything to BORRADOR
    BORRADOR:             ["PENDIENTE_VALIDACION"],
    OBSERVADO:            ["PENDIENTE_VALIDACION", "BORRADOR"],
};

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidTransition(
    from: EstadoValidacionProyecto,
    to: EstadoValidacionProyecto,
    actorRole: "OWNER" | "ADMIN",
): boolean {
    if (actorRole === "ADMIN") {
        const allowed = ADMIN_TRANSITIONS[from] ?? OWNER_TRANSITIONS[from] ?? [];
        return allowed.includes(to);
    }
    const allowed = OWNER_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
}

// ─── transitionProyectoState ──────────────────────────────────────────────────

export interface TransitionResult {
    estadoAnterior: EstadoValidacionProyecto;
    estadoNuevo:    EstadoValidacionProyecto;
    flagsSync: {
        puedePublicarse:  boolean;
        puedeReservarse:  boolean;
        puedeCaptarLeads: boolean;
        overrideCleared:  boolean;
    };
}

/**
 * Transitions a project's estadoValidacion.
 *
 * Validates the transition, updates estadoValidacion in the proyecto,
 * syncs operational flags (always), logs to ProyectoEstadoLog.
 *
 * @param proyectoId  target project
 * @param actorId     user performing the transition (for log + override clear)
 * @param actorRole   "ADMIN" | "OWNER" — determines allowed transitions
 * @param toEstado    target state
 * @param opts        TransitionOptions
 */
export async function transitionProyectoState(
    proyectoId:  string,
    actorId:     string,
    actorRole:   "OWNER" | "ADMIN",
    toEstado:    EstadoValidacionProyecto,
    opts:        TransitionOptions = {},
): Promise<TransitionResult> {
    const proyecto = await prisma.proyecto.findUnique({
        where:  { id: proyectoId },
        select: { estadoValidacion: true },
    });

    if (!proyecto) {
        throw new Error("Proyecto no encontrado");
    }

    const fromEstado = proyecto.estadoValidacion as EstadoValidacionProyecto;

    if (!isValidTransition(fromEstado, toEstado, actorRole)) {
        throw new Error(
            `Transición inválida: ${fromEstado} → ${toEstado} para ${actorRole}`,
        );
    }

    const flags       = flagsFromEstado(toEstado);
    const blocking    = isBlockingState(toEstado);
    const clearOverride = blocking || !(opts.preserveOverride ?? false);

    // Single atomic transaction: estadoValidacion + flags sync + log
    await prisma.$transaction([
        // 1. Update estadoValidacion
        prisma.proyecto.update({
            where: { id: proyectoId },
            data:  { estadoValidacion: toEstado },
        }),
        // 2. Sync operational flags (blocking states always clear override)
        prisma.proyecto.update({
            where: { id: proyectoId },
            data:  {
                ...flags,
                ...(clearOverride ? { flagsOverridePorId: null, flagsOverrideAt: null } : {}),
            },
        }),
        // 3. Log transition
        prisma.proyectoEstadoLog.create({
            data: {
                proyectoId,
                estadoAnterior: fromEstado,
                estadoNuevo:    toEstado,
                realizadoPorId: actorId,
                motivo:         opts.nota ?? null,
                flagsSnapshot:  { ...flags, overrideCleared: clearOverride } as object,
            },
        }),
    ]);

    const flagsSync = { ...flags, overrideCleared: clearOverride };
    return { estadoAnterior: fromEstado, estadoNuevo: toEstado, flagsSync };
}
