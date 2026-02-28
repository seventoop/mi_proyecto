"use server";

import prisma from "@/lib/db";
import { requireRole, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const riskUpdateSchema = z.object({
    userId: idSchema,
    level: z.enum(["low", "medium", "high"]),
    reason: z.string().max(500).min(1, "Razón requerida"),
});

// ─── Queries ───

export async function getAdminDashboardData() {
    try {
        await requireRole("ADMIN");

        const [
            totalInvertido,
            totalPagos,
            totalEscrow,
            pendingKYCQueue,
            pendingProjectDocs,
            recentUsers,
        ] = await Promise.all([
            prisma.inversion.aggregate({ _sum: { montoTotal: true } }),
            prisma.pago.aggregate({
                where: { estado: "APROBADO" },
                _sum: { monto: true },
            }),
            prisma.inversion.aggregate({
                where: { estado: "ESCROW" },
                _sum: { montoTotal: true },
            }),
            prisma.user.findMany({
                where: { kycStatus: { in: ["PENDIENTE", "EN_REVISION"] } },
                select: { id: true, nombre: true, email: true, kycStatus: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            prisma.proyecto.findMany({
                where: { documentacionEstado: "PENDIENTE" },
                select: { id: true, nombre: true, documentacionEstado: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            prisma.user.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, nombre: true, rol: true, createdAt: true },
            }),
        ]);

        const globalVolume = Number(totalInvertido._sum.montoTotal || 0) + Number(totalPagos._sum.monto || 0);
        const platformRevenue = Number(totalPagos._sum.monto || 0) * 0.015;

        return {
            success: true,
            data: {
                financials: {
                    globalVolume,
                    totalEscrow: Number(totalEscrow._sum.montoTotal || 0),
                    platformRevenue,
                    totalInvested: Number(totalInvertido._sum.montoTotal || 0),
                },
                queues: {
                    kyc: pendingKYCQueue,
                    projects: pendingProjectDocs,
                },
                recentUsers,
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getUsersRiskData(filters?: { level?: string }) {
    try {
        await requireRole("ADMIN");

        const where: any = {};
        if (filters?.level && filters.level !== "all") {
            where.riskLevel = filters.level;
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
                riskLevel: true,
                riskReason: true,
                kycStatus: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const stats = {
            low: await prisma.user.count({ where: { riskLevel: "low" } }),
            medium: await prisma.user.count({ where: { riskLevel: "medium" } }),
            high: await prisma.user.count({ where: { riskLevel: "high" } }),
        };

        return { success: true, data: { users, stats } };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function updateUserRisk(input: unknown) {
    try {
        await requireRole("ADMIN");

        const parsed = riskUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const { userId, level, reason } = parsed.data;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { riskLevel: level, riskReason: reason },
        });

        return { success: true, data: updated };
    } catch (error) {
        return handleGuardError(error);
    }
}
