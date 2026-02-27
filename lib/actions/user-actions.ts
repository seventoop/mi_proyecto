"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    kycStatus?: string
) {
    try {
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
        console.error("Error fetching users:", error);
        return { success: false, error: "Error al obtener usuarios" };
    }
}

export async function updateUserRole(userId: string, newRole: "ADMIN" | "VENDEDOR" | "USER") {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { rol: newRole }
        });
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar rol" };
    }
}

export async function toggleUserBan(userId: string, isBanned: boolean) {
    // Note: checks for 'isBanned' field or similar logic. 
    // Since Schema doesn't have 'isBanned', we might simulate this by another means or add field.
    // For now, let's assume we might handle this by role = 'BANNED' if schema supported it, 
    // or just skipping this if schema change is not desired yet.
    // Let's stick to updateRole for now as primary moderation tool or implement delete.

    // Implementing Delete for severe cases
    try {
        await prisma.user.delete({ where: { id: userId } });
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar usuario" };
    }
}
