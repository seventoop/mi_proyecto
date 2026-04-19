"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { handleGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";
import { PERMISSIONS, requirePermission } from "@/lib/auth/permissions";
import { ROLES, type Role } from "@/lib/constants/roles";

/**
 * Roles that an admin can assign from the Users admin table. Excludes
 * SUPERADMIN (platform-level only, granted out of band) and removes the
 * legacy "USER" role which no longer exists in the canonical role set.
 */
const ADMIN_ASSIGNABLE_ROLES = [
    ROLES.ADMIN,
    ROLES.DESARROLLADOR,
    ROLES.VENDEDOR,
    ROLES.INVERSOR,
    ROLES.CLIENTE,
] as const satisfies readonly Role[];

export type AdminAssignableRole = (typeof ADMIN_ASSIGNABLE_ROLES)[number];

function isAdminAssignableRole(value: unknown): value is AdminAssignableRole {
    return typeof value === "string"
        && (ADMIN_ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

// ─── Queries ───

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

        const [users, total] = await Promise.all([
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
                }
            }),
            prisma.user.count({ where })
        ]);

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

// ─── Mutations ───

export async function updateUserRole(userId: string, newRole: AdminAssignableRole) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        if (!isAdminAssignableRole(newRole)) {
            // Defensive guard: protects against stale clients still sending the
            // legacy "USER" role or any non-canonical value. The backend stays
            // the source of truth even if frontend code drifts.
            console.warn("[updateUserRole] rejected non-canonical role", { userId, newRole });
            return { success: false, error: "Rol no asignable" };
        }

        await requirePermission(PERMISSIONS.USERS_MANAGE);
        await prisma.user.update({
            where: { id: userId },
            data: { rol: newRole }
        });
        revalidatePath("/dashboard/admin/usuarios");
        return { success: true };
    } catch (error) {
        console.error("[updateUserRole] failed", { userId, newRole, error });
        return handleGuardError(error);
    }
}

export async function toggleUserBan(userId: string, isBanned: boolean) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        await requirePermission(PERMISSIONS.USERS_MANAGE);
        // In the original file, it was deleting the user. I'll stick to that if that's the intended "ban" logic in this repo.
        await prisma.user.delete({ where: { id: userId } });
        revalidatePath("/dashboard/admin/usuarios");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
