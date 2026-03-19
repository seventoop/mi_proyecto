/**
 * lib/project-access/types.ts
 *
 * Core types for relation-based project access control.
 */

import type { AuthUser } from "@/lib/auth-types";

// ─── Permission enum ──────────────────────────────────────────────────────────

export const ProjectPermission = {
    // Management
    EDITAR_PROYECTO:         "EDITAR_PROYECTO",
    SUBIR_DOCUMENTACION:     "SUBIR_DOCUMENTACION",
    GESTIONAR_RELACIONES:    "GESTIONAR_RELACIONES",
    TRANSICIONAR_ESTADO:     "TRANSICIONAR_ESTADO",
    // Commercial (gated by operational flags + blocking states)
    PUBLICAR:                "PUBLICAR",
    RESERVAR:                "RESERVAR",
    CAPTAR_LEADS:            "CAPTAR_LEADS",
    // Visibility
    VER_LEADS_GLOBALES:      "VER_LEADS_GLOBALES",
    VER_METRICAS_GLOBALES:   "VER_METRICAS_GLOBALES",
    // Override (admin only)
    OVERRIDE_FLAGS:          "OVERRIDE_FLAGS",
} as const;

export type ProjectPermission = (typeof ProjectPermission)[keyof typeof ProjectPermission];

// ─── EstadoValidacion ─────────────────────────────────────────────────────────

export const BLOCKING_STATES = ["RECHAZADO", "SUSPENDIDO"] as const;
export type BlockingState = (typeof BLOCKING_STATES)[number];

export function isBlockingState(estado: string): estado is BlockingState {
    return (BLOCKING_STATES as readonly string[]).includes(estado);
}

// ─── Relation shape (Prisma-aligned subset) ───────────────────────────────────

export interface ProjectRelation {
    tipoRelacion:                string;
    estadoRelacion:              string;
    permisoEditarProyecto:       boolean;
    permisoSubirDocumentacion:   boolean;
    permisoVerLeadsGlobales:     boolean;
    permisoVerMetricasGlobales:  boolean;
}

// ─── ProjectAccessContext ─────────────────────────────────────────────────────

export interface ProjectSnapshot {
    id:                  string;
    orgId:               string | null;
    creadoPorId:         string | null;
    estadoValidacion:    string;
    puedePublicarse:     boolean;
    puedeReservarse:     boolean;
    puedeCaptarLeads:    boolean;
    flagsOverridePorId:  string | null;
}

export interface ProjectAccessContext {
    user:       AuthUser;
    proyecto:   ProjectSnapshot;
    /** Resolved ProyectoUsuario relation, or null if legacy/admin fallback */
    relacion:   ProjectRelation | null;
    /** Whether this access was resolved via legacy creadoPorId (no ProyectoUsuario row) */
    isLegacy:   boolean;
    /** Evaluated permissions for this user+project pair */
    can: (permission: ProjectPermission) => boolean;
}

// ─── Block reason ─────────────────────────────────────────────────────────────

export interface BlockReason {
    code:    "BLOCKING_STATE" | "FLAG_DISABLED" | "NO_PERMISSION" | "NO_RELATION";
    message: string;
}

// ─── Transition ───────────────────────────────────────────────────────────────

export type EstadoValidacionProyecto =
    | "BORRADOR"
    | "PENDIENTE_VALIDACION"
    | "EN_REVISION"
    | "APROBADO"
    | "OBSERVADO"
    | "RECHAZADO"
    | "SUSPENDIDO";

export interface TransitionOptions {
    /** Notes to attach to the ProyectoEstadoLog entry */
    nota?:            string;
    /** Preserve existing flag override instead of clearing it (default: false) */
    preserveOverride?: boolean;
}
