/**
 * Shared auth & authorization guards for Server Actions and API Routes.
 * 
 * Multi-tenant aware: All guards propagate orgId.
 * ADMIN is super-admin and bypasses org checks.
 * 
 * Usage:
 *   const user = await requireAuth();
 *   await requireRole("ADMIN");
 *   await requireProjectOwnership(projectId); // also checks org
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// ─── Types ───

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: string;
    orgId: string | null;
    kycStatus: string;
    demoEndsAt: string | null;
}

export class AuthError extends Error {
    public status: number;
    constructor(message: string, status: number = 401) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}

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
    return {
        id: session.user.id as string,
        email: session.user.email as string,
        name: session.user.name as string,
        role: (session.user as any).role as string,
        orgId: (session.user as any).orgId as string | null,
        kycStatus: (session.user as any).kycStatus as string,
        demoEndsAt: (session.user as any).demoEndsAt as string | null,
    };
}

/**
 * Requires the user to have a specific role. Returns the user.
 */
export async function requireRole(role: string): Promise<AuthUser> {
    const user = await requireAuth();
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
    if (user.role === "ADMIN") return {};
    if (!user.orgId) return { orgId: "___NO_ORG___" }; // user has no org → see nothing
    return { orgId: user.orgId };
}

/**
 * Requires the user to be ADMIN or the owner/member of the project's org.
 * Also checks creadoPorId for backward compatibility.
 */
export async function requireProjectOwnership(projectId: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "ADMIN") return user;

    const proyecto = await prisma.proyecto.findUnique({
        where: { id: projectId },
        select: { creadoPorId: true, orgId: true },
    });

    if (!proyecto) {
        throw new AuthError("Proyecto no encontrado", 404);
    }

    // Multi-tenant check: user must be in the same org as the project
    if (proyecto.orgId && user.orgId && proyecto.orgId !== user.orgId) {
        throw new AuthError("Proyecto no encontrado", 404); // 404 not 403 (don't leak existence)
    }

    // Ownership check: must be creator (within org)
    if (proyecto.creadoPorId !== user.id) {
        throw new AuthError("No tienes permisos sobre este proyecto", 403);
    }
    return user;
}

/**
 * Requires the user to own the notification or be ADMIN. Returns the user.
 */
export async function requireNotificationOwnership(notificationId: string): Promise<AuthUser> {
    const user = await requireAuth();
    if (user.role === "ADMIN") return user;

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
    if (user.role === "ADMIN") return user;

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

    // Multi-tenant check
    if (projectOrgId && user.orgId && projectOrgId !== user.orgId) {
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

import { NextResponse } from "next/server";

/**
 * Safe wrapper for server actions that use guards.
 * Catches AuthError and returns a typed error response.
 */
export function handleGuardError(error: unknown): { success: false; error: string } {
    if (error instanceof AuthError) {
        return { success: false, error: error.message };
    }
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
    console.error("Unexpected API error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}
