import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * PAGE-LEVEL guards — use in Server Components (app/page.tsx files).
 * These call redirect() on failure, which is correct in RSC context.
 *
 * DO NOT use in API Route handlers or Server Actions.
 * For those, use lib/guards.ts (throws AuthError → JSON response).
 *
 * Canonical guard file: lib/guards.ts
 * This file: lib/auth/guards.ts (page-level redirects only)
 */

export async function getSession() {
    return await getServerSession(authOptions);
}

export async function requireAuth() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/login");
    }
    return session.user as any;
}

export async function requireRole(allowedRoles: string[]) {
    const user = await requireAuth();
    if (!allowedRoles.includes(user.role)) {
        redirect("/dashboard");
    }
    return user;
}

export async function requireOrgAccess(orgId: string) {
    const user = await requireAuth();
    if (user.role === "ADMIN" || user.role === "SUPERADMIN") return user;

    if (user.orgId !== orgId) {
        redirect("/dashboard");
    }
    return user;
}

/**
 * Wrapper for API routes and Server Actions to enforce ADMIN role.
 */
export function withAdminGuard<T extends any[], R>(handler: (...args: T) => Promise<R>) {
    return async (...args: T) => {
        try {
            const session = await getSession();
            const userRole = (session?.user as any)?.role;

            if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
                return { error: "No autorizado. Se requiere rol ADMIN.", status: 401 };
            }

            return await handler(...args);
        } catch (error) {
            console.error("[AdminGuard Error]:", error);
            return { error: "Internal Server Error", status: 500 };
        }
    };
}
