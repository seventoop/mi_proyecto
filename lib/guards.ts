/**
 * CANONICAL guards — use in Server Actions and API Route handlers.
 * These throw AuthError on failure, which is caught by handleGuardError()
 * (returns { success: false, error }) or handleApiGuardError() (returns NextResponse).
 *
 * DO NOT use in Server Components / page.tsx files.
 * For those, use lib/auth/guards.ts (calls redirect() on failure).
 *
 * Multi-tenant aware: All guards propagate orgId.
 * ADMIN is super-admin and bypasses org checks.
 *
 * Usage:
 *   const user = await requireAuth();
 *   await requireRole("ADMIN");
 *   await requireProjectOwnership(projectId); // also checks org
 */

export const ROLES = {
    SUPERADMIN: "SUPERADMIN",
    ADMIN: "ADMIN",
    DESARROLLADOR: "DESARROLLADOR",
    VENDEDOR: "VENDEDOR",
    INVERSOR: "INVERSOR",
    USER: "USER",
} as const;

export type UserRole = keyof typeof ROLES;

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getProjectAccess, ProjectPermission } from "@/lib/project-access";

// ─── Types (defined in lib/auth-types.ts, re-exported here for backward compat) ───

export type { AuthUser } from "@/lib/auth-types";
export { AuthError } from "@/lib/auth-types";
import type { AuthUser } from "@/lib/auth-types";
import { AuthError } from "@/lib/auth-types";

// ─── Core Guards ───

/**
 * Returns the authenticated user or throws AuthError.
 * Now includes orgId from session.
 */
export async function requireAuth(): Promise<AuthUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new AuthError("No autorizado", 401);
    }
    const { user } = session;
    return {
        id: user.id,
        email: user.email as string,
        name: user.name as string,
        role: user.role,
        orgId: user.orgId,
        kycStatus: user.kycStatus,
        demoEndsAt: user.demoEndsAt,
    };
}

/**
 * Requires the user to have a specific role. Returns the user.
 * SUPERADMIN has all permissions by default.
 *
 * NOTE on requireRole vs requirePermission (lib/auth/permissions.ts):
 *
 *   - `requirePermission(KEY)` is the preferred guard for any module covered by
 *     the configurable permission matrix (USERS_MANAGE, ROLE_REQUESTS_MANAGE,
 *     RISKS_VIEW, CRM_ADMIN, PLATFORM_CONFIG_MANAGE). It honors role overrides
 *     stored in `system_config` so admins can adjust access without redeploys.
 *
 *   - `requireRole(role)` remains the right tool for guards that are NOT
 *     governed by that matrix and must stay tied to a hard role identity:
 *       · `app/api/admin/role-permissions/route.ts` → SUPERADMIN-only because
 *         it edits the matrix itself; making it permission-driven would create
 *         a privilege loop.
 *       · Legacy admin-only server actions (`lib/actions/proyectos.ts`,
 *         `tours.ts`, `pagos.ts`, `reservas.ts`, `inversiones.ts`, etc.) that
 *         do not yet have a dedicated permission key. These are safe — they
 *         deny by default to anyone who isn't ADMIN/SUPERADMIN.
 *
 * Do not replace requireRole with requirePermission unless a matching
 * permission key already exists; otherwise you remove a check without adding
 * an equivalent one.
 */
export async function requireRole(role: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "SUPERADMIN") return user;
    if (user.role !== role) {
        throw new AuthError("No tienes permisos para esta acción", 403);
    }
    return user;
}

/**
 * Requires the user to have one of the given roles. Returns the user.
 */
export async function requireAnyRole(roles: string[]): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "SUPERADMIN") return user;
    if (!roles.includes(user.role)) {
        throw new AuthError("No tienes permisos para esta acción", 403);
    }
    return user;
}

// ─── Multi-Tenant Guards ───

/**
 * Builds a Prisma WHERE filter scoped to the user's organization.
 * ADMIN sees all data (no org filter).
 * Other roles only see data in their org.
 * 
 * Usage: prisma.proyecto.findMany({ where: { ...orgFilter(user), ...otherFilters } })
 */
export function orgFilter(user: AuthUser): { orgId?: string } {
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return {};
    if (!user.orgId) return { orgId: "___NO_ORG___" }; // user has no org → see nothing
    return { orgId: user.orgId };
}

/**
 * Requires the user to be ADMIN or have EDITAR_PROYECTO permission on the project.
 *
 * Resolution order (getProjectAccess handles all fallbacks):
 *  1. ADMIN/SUPERADMIN → always allowed
 *  2. ProyectoUsuario(ACTIVA) with permisoEditarProyecto or tipoRelacion=OWNER → allowed
 *  3. Legacy fallback: creadoPorId match within same org → allowed (implicit OWNER)
 */
export async function requireProjectOwnership(projectId: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return user;

    const ctx = await getProjectAccess(user, projectId);
    if (!ctx.can(ProjectPermission.EDITAR_PROYECTO)) {
        throw new AuthError("No tienes permisos sobre este proyecto", 403);
    }
    return user;
}

/**
 * Requires the user to own the notification or be ADMIN. Returns the user.
 */
export async function requireNotificationOwnership(notificationId: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return user;

    const notif = await prisma.notificacion.findUnique({
        where: { id: notificationId },
        select: { usuarioId: true },
    });

    if (!notif) {
        throw new AuthError("Notificación no encontrada", 404);
    }
    if (notif.usuarioId !== user.id) {
        throw new AuthError("No tienes permisos sobre esta notificación", 403);
    }
    return user;
}

/**
 * Requires reservation permission based on role:
 * - ADMIN: always
 * - VENDEDOR/DESARROLLADOR: must be the vendedor or project owner, AND in same org
 * Returns the user.
 */
export async function requireReservaPermission(reservaId: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return user;

    const reserva = await prisma.reserva.findUnique({
        where: { id: reservaId },
        include: {
            unidad: {
                select: {
                    manzana: {
                        select: {
                            etapa: {
                                select: {
                                    proyecto: { select: { creadoPorId: true, orgId: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!reserva) {
        throw new AuthError("Reserva no encontrada", 404);
    }

    const projectOrgId = reserva.unidad.manzana.etapa.proyecto.orgId;

    // Tenant boundary fail-secure: check must be symmetric and strictly equal
    if (!user.orgId || !projectOrgId || projectOrgId !== user.orgId) {
        throw new AuthError("Reserva no encontrada", 404);
    }

    const isVendedor = reserva.vendedorId === user.id;
    const isProjectOwner = reserva.unidad.manzana.etapa.proyecto.creadoPorId === user.id;

    if (!isVendedor && !isProjectOwner) {
        throw new AuthError("No tienes permisos sobre esta reserva", 403);
    }
    return user;
}

/**
 * Validates CRON_SECRET header for cron endpoints.
 * Enforces POST method and x-cron-secret header.
 * Returns true or throws AuthError.
 */
export function requireCronSecret(request: Request): void {
    // 1. Validate Method
    if (request.method !== "POST") {
        throw new AuthError("Método no permitido", 405);
    }

    // 2. Validate Config
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        throw new AuthError("CRON_SECRET no configurado", 500);
    }

    // 3. Validate Header
    const cronHeader = request.headers.get("x-cron-secret");
    if (cronHeader !== secret) {
        throw new AuthError("No autorizado", 401);
    }
}

/**
 * Requires the user's KYC status to be APROBADO or VERIFICADO.
 * Throws AuthError 403 if not approved.
 */
export async function requireKYC(): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return user;
    
    if (user.kycStatus !== "APROBADO" && user.kycStatus !== "VERIFICADO") {
        throw new AuthError("Debes completar tu verificación KYC para realizar esta acción", 403);
    }
    return user;
}

// ─── Org Access Guard ───

/**
 * Requires the user to belong to the given org, or be ADMIN/SUPERADMIN.
 */
export async function requireOrgAccess(orgId: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return user;
    if (user.orgId !== orgId) {
        throw new AuthError("No tienes acceso a esta organización", 403);
    }
    return user;
}

// ─── CRM Access Guards ────────────────────────────────────────────────────────
//
// Policy (documented):
//
// READ  — Pipeline stage config is org-level metadata needed by all roles to
//         render the CRM UI. Any authenticated org member can read.
//         Rule: requireOrgAccess (org boundary only).
//
// WRITE — Structural CRM mutations (create/update/delete pipeline stages) require
//         an active project relation with operational authority.
//         Allowed:  OWNER · VENDEDOR_ASIGNADO · COMERCIALIZADOR_EXCLUSIVO ·
//                   COMERCIALIZADOR_NO_EXCLUSIVO
//         Denied:   COLABORADOR (docs/ops only, no CRM authority)
//                   SOLO_LECTURA (explicit read-only role)
//         Legacy:   users with no ProyectoUsuario rows → allowed (creadoPorId era)
//
// ─────────────────────────────────────────────────────────────────────────────

/** Relation types that grant CRM write authority */
const CRM_WRITE_ROLES = [
    "OWNER",
    "VENDEDOR_ASIGNADO",
    "COMERCIALIZADOR_EXCLUSIVO",
    "COMERCIALIZADOR_NO_EXCLUSIVO",
] as const;

/**
 * Requires CRM read access.
 * Pipeline etapas are org-level config — any org member needs them to use the CRM UI.
 */
export async function requireCrmRead(orgId: string): Promise<AuthUser> {
    return requireOrgAccess(orgId);
}

/**
 * Requires CRM write access.
 * User must have at least one ACTIVA relation with CRM write authority (OWNER,
 * VENDEDOR_ASIGNADO, COMERCIALIZADOR_*). COLABORADOR and SOLO_LECTURA are denied.
 * Legacy users (no relation rows) are allowed for backward compatibility.
 */
export async function requireCrmWrite(orgId: string): Promise<AuthUser> {
    const user = await requireOrgAccess(orgId);
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return user;

    const activeRelations = await prisma.proyectoUsuario.findMany({
        where: { userId: user.id, orgId, estadoRelacion: "ACTIVA" },
        select: { tipoRelacion: true },
    });

    // Legacy fallback: no relation rows → permitted (pre-relation-model era)
    if (activeRelations.length === 0) return user;

    // Require at least one relation with CRM write authority
    const hasCrmAuthority = activeRelations.some(r =>
        (CRM_WRITE_ROLES as readonly string[]).includes(r.tipoRelacion)
    );
    if (!hasCrmAuthority) {
        throw new AuthError(
            "Tu rol en este proyecto no te permite modificar la configuración del CRM",
            403,
        );
    }

    return user;
}

import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";

/**
 * Translates a Prisma known/validation error into a safe user-facing message,
 * without leaking SQL, credentials or stack traces. Returns null when the
 * error is not a Prisma error so the caller can fall back to a generic 500.
 */
function describePrismaError(error: unknown): string | null {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const meta = error.meta ?? {};
        switch (error.code) {
            case "P2002": {
                const target = Array.isArray((meta as any).target)
                    ? (meta as any).target.join(", ")
                    : ((meta as any).target ?? "valor único");
                return `Ya existe un registro con ese ${target}.`;
            }
            case "P2003":
                return "Referencia inválida: el recurso vinculado no existe.";
            case "P2022":
                return `Falta una columna en la base de datos (${(meta as any).column ?? "?"}). Hay que correr las migraciones de Prisma en este entorno.`;
            case "P2021":
                return `Falta una tabla en la base de datos (${(meta as any).table ?? "?"}). Hay que correr las migraciones de Prisma en este entorno.`;
            case "P2025":
                return "El registro buscado no existe o ya fue eliminado.";
            default:
                return `Error de base de datos (${error.code}).`;
        }
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
        return "Tipos de datos inválidos al guardar. Revisá los campos del formulario.";
    }
    return null;
}

/**
 * Safe wrapper for server actions that use guards.
 * Catches AuthError and returns a typed error response. Prisma errors are
 * translated to actionable messages; everything else returns the generic 500
 * label and is reported to Sentry.
 */
export function handleGuardError(error: unknown): { success: false; error: string } {
    if (error instanceof AuthError) {
        return { success: false, error: error.message };
    }

    const prismaMessage = describePrismaError(error);
    if (prismaMessage) {
        // Prisma errors get tagged but still reported so we can spot schema drift.
        Sentry.captureException(error, {
            tags: {
                area: "guards",
                context: "server-action",
                kind: "prisma",
                code: (error as any)?.code ?? "validation",
            },
        });
        console.error("[guards] prisma error in server-action", {
            code: (error as any)?.code,
            meta: (error as any)?.meta,
            firstLine: (error as any)?.message?.split?.("\n")?.[0],
        });
        return { success: false, error: prismaMessage };
    }

    // Production Observability: Capture unexpected errors
    Sentry.captureException(error, {
        tags: { area: "guards", context: "server-action" }
    });

    console.error("Unexpected error:", error);
    return { success: false, error: "Error interno del servidor" };
}

/**
 * Safe wrapper for API routes that use guards.
 * Returns a NextResponse with appropriate status code.
 */
export function handleApiGuardError(error: unknown): NextResponse {
    if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaMessage = describePrismaError(error);
    if (prismaMessage) {
        Sentry.captureException(error, {
            tags: {
                area: "guards",
                context: "api-route",
                kind: "prisma",
                code: (error as any)?.code ?? "validation",
            },
        });
        console.error("[guards] prisma error in api-route", {
            code: (error as any)?.code,
            meta: (error as any)?.meta,
            firstLine: (error as any)?.message?.split?.("\n")?.[0],
        });
        return NextResponse.json({ error: prismaMessage }, { status: 400 });
    }

    // Production Observability: Capture unexpected errors
    Sentry.captureException(error, {
        tags: { area: "guards", context: "api-route" }
    });

    console.error("Unexpected API error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

/**
 * Wrapper for API routes that require ADMIN or SUPERADMIN.
 * Usage: export const GET = withAdminGuard(async (req, user) => { ... });
 */
export function withAdminGuard(
    handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
    return async (req: NextRequest) => {
        try {
            const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);
            return await handler(req, user);
        } catch (error) {
            return handleApiGuardError(error);
        }
    };
}
