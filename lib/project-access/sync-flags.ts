/**
 * lib/project-access/sync-flags.ts
 *
 * Synchronizes puedePublicarse / puedeReservarse / puedeCaptarLeads
 * from estadoValidacion.
 *
 * Rules:
 *  - APROBADO           → all flags = true  (unless ADMIN override already set higher)
 *  - BLOCKING_STATES    → all flags = false (always, overrides any previous override)
 *  - All other states   → all flags = false
 *
 * ADMIN override (flagsOverridePorId) is preserved across non-blocking transitions
 * unless explicitly cleared. On BLOCKING_STATE entry the override is always cleared.
 */

import prisma from "@/lib/db";
import { isBlockingState } from "./types";
import type { EstadoValidacionProyecto } from "./types";

export interface SyncFlagsResult {
    puedePublicarse:  boolean;
    puedeReservarse:  boolean;
    puedeCaptarLeads: boolean;
    overrideCleared:  boolean;
}

/**
 * Derives target flag values from estadoValidacion.
 * Blocking states always return false regardless of anything else.
 */
export function flagsFromEstado(estado: EstadoValidacionProyecto): {
    puedePublicarse:  boolean;
    puedeReservarse:  boolean;
    puedeCaptarLeads: boolean;
} {
    const enabled = estado === "APROBADO";
    return {
        puedePublicarse:  enabled,
        puedeReservarse:  enabled,
        puedeCaptarLeads: enabled,
    };
}

/**
 * Persists flag sync to DB. Clears override on blocking states.
 * Returns the applied values.
 */
export async function syncOperationalFlags(
    proyectoId: string,
    estado: EstadoValidacionProyecto,
    opts: { preserveOverride?: boolean } = {},
): Promise<SyncFlagsResult> {
    const flags = flagsFromEstado(estado);
    const blocking = isBlockingState(estado);

    // Always clear override on blocking states; optionally preserve on others
    const clearOverride = blocking || !opts.preserveOverride;

    await prisma.proyecto.update({
        where: { id: proyectoId },
        data: {
            ...flags,
            ...(clearOverride
                ? { flagsOverridePorId: null, flagsOverrideAt: null }
                : {}),
        },
    });

    return { ...flags, overrideCleared: clearOverride };
}

/**
 * Admin-only: override flags independently of estadoValidacion.
 * Blocked entirely when project is in a BLOCKING_STATE.
 */
export async function overrideFlags(
    proyectoId: string,
    adminId: string,
    flags: { puedePublicarse?: boolean; puedeReservarse?: boolean; puedeCaptarLeads?: boolean },
): Promise<void> {
    // Fetch current state first
    const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: { estadoValidacion: true },
    });

    if (!proyecto) throw new Error("Proyecto no encontrado");

    if (isBlockingState(proyecto.estadoValidacion)) {
        throw new Error(
            `No se pueden modificar flags en estado ${proyecto.estadoValidacion}`,
        );
    }

    await prisma.proyecto.update({
        where: { id: proyectoId },
        data: {
            ...flags,
            flagsOverridePorId: adminId,
            flagsOverrideAt:    new Date(),
        },
    });
}
