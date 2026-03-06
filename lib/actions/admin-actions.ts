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

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalInvertido,
            totalPagos,
            totalEscrow,
            pendingKYCQueue,
            pendingProjectDocs,
            recentUsers,
            totalOrgs,
            leadsToday,
            leadsWeek,
            auditLogs,
            pendingTestimonios,
            activeBanners,
            pendingBlogs,
            pendingKYCCount,
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
                where: { documentacionEstado: { in: ["PENDIENTE", "EN_REVISION"] } },
                select: { id: true, nombre: true, documentacionEstado: true, createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            prisma.user.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, nombre: true, rol: true, createdAt: true },
            }),
            prisma.organization.count(),
            prisma.lead.count({ where: { createdAt: { gte: startOfDay } } }),
            prisma.lead.count({ where: { createdAt: { gte: startOfWeek } } }),
            prisma.auditLog.findMany({
                take: 20,
                orderBy: { createdAt: "desc" },
                include: { user: { select: { nombre: true } } },
            }),
            prisma.testimonio.count({ where: { estado: "PENDIENTE" } }),
            prisma.banner.count({ where: { estado: "ACTIVO" } }),
            prisma.blogPost.count({ where: { status: "PENDIENTE" } }),
            prisma.user.count({ where: { kycStatus: { in: ["PENDIENTE", "EN_REVISION"] } } }),
        ]);

        const globalVolume = Number(totalInvertido._sum.montoTotal || 0) + Number(totalPagos._sum.monto || 0);
        const platformRevenue = Number(totalPagos._sum.monto || 0) * 0.015;

        // Health checks (Basic connectivity)
        let dbStatus = "HEALTHY";
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (e) {
            dbStatus = "DOWN";
        }

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
                counts: {
                    totalOrgs,
                    leadsToday,
                    leadsWeek,
                    pendingTestimonios,
                    activeBanners,
                    pendingBlogs,
                    pendingKYC: pendingKYCCount,
                },
                auditLogs,
                health: {
                    db: dbStatus,
                    storage: (process.env.AWS_S3_BUCKET || process.env.SUPABASE_URL) ? "HEALTHY" : "NOT_CONFIGURED",
                    pusher: (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) ? "CONFIGURED" : "NOT_CONFIGURED",
                    whatsapp: (process.env.WHATSAPP_API_KEY || process.env.META_WEBHOOK_SECRET) ? "CONFIGURED" : "NOT_CONFIGURED",
                }
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
