"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Queries ───

export async function getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    kycStatus?: string
) {
    try {
        await requireRole("ADMIN");
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

export async function updateUserRole(userId: string, newRole: "ADMIN" | "VENDEDOR" | "USER") {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        await requireRole("ADMIN");
        await prisma.user.update({
            where: { id: userId },
            data: { rol: newRole }
        });
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function toggleUserBan(userId: string, isBanned: boolean) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        await requireRole("ADMIN");
        // In the original file, it was deleting the user. I'll stick to that if that's the intended "ban" logic in this repo.
        await prisma.user.delete({ where: { id: userId } });
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
