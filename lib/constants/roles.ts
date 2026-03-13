/**
 * Canonical role constants for SevenToop.
 *
 * All role checks in guards, middleware, and actions SHOULD reference
 * these constants to avoid typos and make refactoring safe.
 *
 * Usage:
 *   import { ROLES } from "@/lib/constants/roles";
 *   if (user.role === ROLES.ADMIN) { ... }
 *   await requireAnyRole([ROLES.ADMIN, ROLES.DESARROLLADOR]);
 *
 * Current role hierarchy (high to low):
 *   SUPERADMIN > ADMIN > DESARROLLADOR = VENDEDOR > INVERSOR = CLIENTE
 *
 * ADMIN: Full super-admin access. Bypasses all org/ownership checks.
 * SUPERADMIN: Platform-level admin (billing, orgs). Equivalent to ADMIN for most checks.
 * DESARROLLADOR: Project owner within an org. Creates/manages projects, reservas, leads.
 * VENDEDOR: Sales agent within an org. Manages leads and reservas for assigned projects.
 * INVERSOR: Investor. Read-only access to their investments and public project data.
 * CLIENTE: Buyer. Read-only access to their reservas.
 */

export const ROLES = {
    ADMIN: "ADMIN",
    SUPERADMIN: "SUPERADMIN",
    DESARROLLADOR: "DESARROLLADOR",
    VENDEDOR: "VENDEDOR",
    INVERSOR: "INVERSOR",
    CLIENTE: "CLIENTE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles that have write access to projects and CRM data */
export const PROJECT_WRITE_ROLES: Role[] = [ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DESARROLLADOR];

/** Roles that can access the main dashboard */
export const DASHBOARD_ROLES: Role[] = [
    ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DESARROLLADOR, ROLES.VENDEDOR, ROLES.INVERSOR, ROLES.CLIENTE
];

/** Roles that bypass org-scoping (see everything) */
export const BYPASS_ORG_ROLES: Role[] = [ROLES.ADMIN, ROLES.SUPERADMIN];
