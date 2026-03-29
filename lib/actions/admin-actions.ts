"use server";

import prisma from "@/lib/db";
import { requireRole, requireAnyRole, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Health ───

export async function getHealthStatus() {
    let db = "DOWN";
    try {
        await prisma.$queryRaw`SELECT 1`;
        db = "HEALTHY";
    } catch { /* DB unreachable */ }

    return {
        db,
        storage: (process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY) ? "HEALTHY" : "NOT_CONFIGURED",
        pusher: (process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.PUSHER_SECRET) ? "HEALTHY" : "NOT_CONFIGURED",
        whatsapp: (process.env.WHATSAPP_API_KEY || process.env.META_WEBHOOK_SECRET) ? "HEALTHY" : "NOT_CONFIGURED",
    };
}

// ─── Schemas ───

const riskUpdateSchema = z.object({
    userId: idSchema,
    level: z.enum(["low", "medium", "high"]),
    reason: z.string().max(500).min(1, "Razón requerida"),
});

// ─── Queries ───

export async function getAdminDashboardData() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalInvertido,
            totalPagos,
            totalEscrowResult,
            reservasActivasCount,
            oportunidadesTotalCount,
            proyectosActivosCount,
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
            prisma.reserva.count({ where: { estado: "ACTIVA" } }),
            prisma.oportunidad.count(),
            prisma.proyecto.count({ where: { estado: "ACTIVO" } }),
            prisma.user.findMany({
                where: { 
                    kycStatus: { in: ["PENDIENTE", "EN_REVISION"] },
                    rol: { notIn: ["ADMIN", "SUPERADMIN"] }
                },
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
            prisma.user.count({ 
                where: { 
                    kycStatus: { in: ["PENDIENTE", "EN_REVISION"] },
                    rol: { notIn: ["ADMIN", "SUPERADMIN"] }
                } 
            }),
        ]);

        const globalVolume = Number(totalInvertido._sum.montoTotal || 0) + Number(totalPagos._sum.monto || 0);
        const platformRevenue = Number(totalPagos._sum.monto || 0) * 0.015;
        const totalLeads = await prisma.lead.count();
        const conversionRate = totalLeads > 0 ? (oportunidadesTotalCount / totalLeads) * 100 : 0;

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
                    totalEscrow: Number(totalEscrowResult._sum.montoTotal || 0),
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
                    reservasActivas: reservasActivasCount,
                    conversionRate: Math.round(conversionRate * 10) / 10,
                    proyectosActivos: proyectosActivosCount,
                },
                auditLogs,
                health: {
                    db: dbStatus,
                    storage: (process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY) ? "HEALTHY" : "NOT_CONFIGURED",
                    pusher: (process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.PUSHER_SECRET) ? "CONFIGURED" : "NOT_CONFIGURED",
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
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

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

export async function getOrganizationsList() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const orgs = await prisma.organization.findMany({
            select: {
                id: true,
                nombre: true,
            },
            orderBy: { nombre: "asc" }
        });

        return { success: true, data: orgs };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function updateUserRisk(input: unknown) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

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
