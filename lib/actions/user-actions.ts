"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { handleGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";
import { PERMISSIONS, requirePermission } from "@/lib/auth/permissions";
import { ROLES, type Role } from "@/lib/constants/roles";

const ASSIGNABLE_BY_ADMIN = [
    ROLES.ADMIN,
    ROLES.DESARROLLADOR,
    ROLES.VENDEDOR,
    ROLES.INVERSOR,
    ROLES.CLIENTE,
] as const satisfies readonly Role[];

const ASSIGNABLE_BY_SUPERADMIN = [
    ROLES.SUPERADMIN,
    ...ASSIGNABLE_BY_ADMIN,
] as const satisfies readonly Role[];

export type AdminAssignableRole = (typeof ASSIGNABLE_BY_SUPERADMIN)[number];

function isAssignableRole(value: unknown): value is AdminAssignableRole {
    return typeof value === "string"
        && (ASSIGNABLE_BY_SUPERADMIN as readonly string[]).includes(value);
}

function canActorAssign(actorRole: string, target: AdminAssignableRole): boolean {
    if (target === ROLES.SUPERADMIN) return actorRole === ROLES.SUPERADMIN;
    return actorRole === ROLES.SUPERADMIN || actorRole === ROLES.ADMIN;
}

export type UserAccessMethod = "google" | "password" | "both" | "none";

function deriveAccessMethod(opts: { hasPassword: boolean; hasGoogle: boolean }): UserAccessMethod {
    if (opts.hasPassword && opts.hasGoogle) return "both";
    if (opts.hasGoogle) return "google";
    if (opts.hasPassword) return "password";
    return "none";
}

export async function getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    kycStatus?: string
) {
    try {
        await requirePermission(PERMISSIONS.USERS_MANAGE);
        const where: any = {};

        if (search) {
            where.OR = [
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        if (role && role !== "ALL") where.rol = role;
        if (kycStatus && kycStatus !== "ALL") where.kycStatus = kycStatus;

        const [rawUsers, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    rol: true,
                    kycStatus: true,
                    createdAt: true,
                    avatar: true,
                    password: true,
                    googleId: true,
                }
            }),
            prisma.user.count({ where })
        ]);

        const users = rawUsers.map(({ password, googleId, ...rest }) => {
            const hasPassword = Boolean(password);
            const hasGoogle = Boolean(googleId);
            return {
                ...rest,
                hasPassword,
                hasGoogle,
                accessMethod: deriveAccessMethod({ hasPassword, hasGoogle }),
            };
        });

        return {
            success: true,
            data: {
                users,
                metadata: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateUserRole(userId: string, newRole: AdminAssignableRole) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        if (!isAssignableRole(newRole)) {
            console.warn("[updateUserRole] rejected non-canonical role", { userId, newRole });
            return { success: false, error: "Rol no asignable" };
        }

        const actor = await requirePermission(PERMISSIONS.USERS_MANAGE);

        if (!canActorAssign(actor.role, newRole)) {
            console.warn("[updateUserRole] privilege escalation blocked", {
                actorId: actor.id,
                actorRole: actor.role,
                targetUserId: userId,
                attemptedRole: newRole,
            });
            return { success: false, error: "No tenés permisos para asignar este rol." };
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, rol: true },
        });

        if (!target) {
            return { success: false, error: "Usuario no encontrado" };
        }

        if (target.rol === newRole) {
            return { success: true, unchanged: true };
        }

        if (
            actor.id === userId &&
            target.rol === ROLES.SUPERADMIN &&
            newRole !== ROLES.SUPERADMIN
        ) {
            const remainingSuperadmins = await prisma.user.count({
                where: { rol: ROLES.SUPERADMIN, id: { not: userId } },
            });
            if (remainingSuperadmins === 0) {
                return {
                    success: false,
                    error: "No podés bajarte de SUPERADMIN siendo el último. Asigná otro SUPERADMIN primero.",
                };
            }
        }

        if (
            target.rol === ROLES.SUPERADMIN &&
            newRole !== ROLES.SUPERADMIN &&
            actor.role !== ROLES.SUPERADMIN
        ) {
            return { success: false, error: "Solo SUPERADMIN puede degradar a otro SUPERADMIN." };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { rol: newRole }
        });

        try {
            const { audit } = await import("@/lib/actions/audit");
            await audit({
                userId: actor.id,
                action: "USER_ROLE_UPDATED",
                entity: "User",
                entityId: userId,
                details: { from: target.rol, to: newRole, actorRole: actor.role },
            });
        } catch (auditErr) {
            console.error("[updateUserRole] audit failed", auditErr);
        }

        revalidatePath("/dashboard/admin/usuarios");
        return { success: true };
    } catch (error) {
        console.error("[updateUserRole] failed", { userId, newRole, error });
        return handleGuardError(error);
    }
}

/**
 * Disabled by design: previous implementation called `prisma.user.delete`,
 * which permanently removed the user and cascaded to their data. The product
 * rule is "no borrar usuarios". A safe ban requires a soft-delete column
 * (e.g. `bannedAt`/`isBanned`) on the User model, which does not exist yet.
 *
 * Until that schema change lands, this action is a no-op that returns a
 * clear error so the UI can disable/hide the button without leaking
 * implementation details.
 */
export async function toggleUserBan(_userId: string, _isBanned: boolean) {
    try {
        await requirePermission(PERMISSIONS.USERS_MANAGE);
        return {
            success: false,
            error: "Bloqueo de usuarios temporalmente deshabilitado: requiere soft-delete (campo isBanned/bannedAt) en el schema. No se borran usuarios.",
        };
    } catch (error) {
        return handleGuardError(error);
    }
}
