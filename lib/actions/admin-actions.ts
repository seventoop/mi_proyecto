"use server";

import prisma from "@/lib/db";

export async function getAdminDashboardData() {
    const [
        totalInvertido,
        totalPagos,
        totalEscrow,
        pendingKYCQueue,
        pendingProjectDocs,
        recentUsers,
        totalRevenue
    ] = await Promise.all([
        // Global Investment Volume
        prisma.inversion.aggregate({
            _sum: { montoTotal: true }
        }),
        // Global Payment Volume (Approved)
        prisma.pago.aggregate({
            where: { estado: "APROBADO" },
            _sum: { monto: true }
        }),
        // Total currently in Escrow
        prisma.inversion.aggregate({
            where: { estado: "ESCROW" },
            _sum: { montoTotal: true }
        }),
        // Users awaiting KYC
        prisma.user.findMany({
            where: { kycStatus: { in: ["PENDIENTE", "EN_REVISION"] } },
            select: { id: true, nombre: true, email: true, kycStatus: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 5
        }),
        // Projects awaiting documentation approval
        prisma.proyecto.findMany({
            where: { documentacionEstado: "PENDIENTE" },
            select: { id: true, nombre: true, documentacionEstado: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 5
        }),
        // Recently registered users
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, nombre: true, rol: true, createdAt: true }
        }),
        // Placeholder Platform Revenue (assuming 1% of approved payments for now)
        prisma.pago.aggregate({
            where: { estado: "APROBADO" },
            _sum: { monto: true }
        })
    ]);

    const globalVolume = (totalInvertido._sum.montoTotal || 0) + (totalPagos._sum.monto || 0);
    const platformRevenue = (totalPagos._sum.monto || 0) * 0.015; // 1.5% fee placeholder

    return {
        financials: {
            globalVolume,
            totalEscrow: totalEscrow._sum.montoTotal || 0,
            platformRevenue,
            totalInvested: totalInvertido._sum.montoTotal || 0
        },
        queues: {
            kyc: pendingKYCQueue,
            projects: pendingProjectDocs
        },
        recentUsers
    };
}

export async function getUsersRiskData(filters?: { level?: string }) {
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
            createdAt: true
        },
        orderBy: { createdAt: "desc" }
    });

    const stats = {
        low: await prisma.user.count({ where: { riskLevel: "low" } }),
        medium: await prisma.user.count({ where: { riskLevel: "medium" } }),
        high: await prisma.user.count({ where: { riskLevel: "high" } }),
    };

    return { users, stats };
}

export async function updateUserRisk(userId: string, level: string, reason: string) {
    return await prisma.user.update({
        where: { id: userId },
        data: { riskLevel: level, riskReason: reason }
    });
}
