"use server";

import prisma from "@/lib/db";
import { handleGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

export async function getDeveloperDashboardData(userId: string) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // All queries scoped to projects created by this developer
        const projectFilter = { proyecto: { creadoPorId: userId } };
        const unitFilter = { manzana: { etapa: { proyecto: { creadoPorId: userId } } } };

        const [
            projects,
            leadsThisMonth,
            leadsTotal,
            oportunidadesTotal,
            reservasActivas,
            revenueThisMonth,
            unitCounts,
            priceAggregate,
        ] = await Promise.all([
            // Per-project stats for the panel
            prisma.proyecto.findMany({
                where: { creadoPorId: userId },
                select: {
                    id: true,
                    nombre: true,
                    estado: true,
                    _count: { select: { leads: true, inversiones: true } },
                    hitosEscrow: {
                        where: { estado: "PENDIENTE" as any },
                        orderBy: { createdAt: "asc" },
                        take: 1,
                    },
                    inversiones: {
                        where: { estado: "ESCROW" as any },
                        select: { montoTotal: true },
                    },
                    pagos: {
                        where: { estado: "APROBADO" as any },
                        select: { monto: true },
                    },
                },
            }),

            // Leads created in the last 30 days
            prisma.lead.count({
                where: { ...projectFilter, createdAt: { gte: thirtyDaysAgo } },
            }),

            // All leads (for conversion rate)
            prisma.lead.count({ where: projectFilter }),

            // All oportunidades (for conversion rate)
            prisma.oportunidad.count({ where: projectFilter }),

            // Active reservations
            prisma.reserva.count({
                where: { ...unitFilter, estado: "ACTIVA" },
            }),

            // Revenue this month (sum of montoSena on reservas created in last 30 days)
            prisma.reserva.aggregate({
                where: { ...unitFilter, createdAt: { gte: thirtyDaysAgo } },
                _sum: { montoSena: true },
            }),

            // Unit counts by estado
            prisma.unidad.groupBy({
                by: ["estado"],
                where: unitFilter,
                _count: true,
            }),

            // Potential revenue from available units
            prisma.unidad.aggregate({
                where: { ...unitFilter, estado: "DISPONIBLE" as any },
                _sum: { precio: true },
            }),
        ]);

        // Build per-project stats
        let globalTotalRecaudado = 0;
        let globalMontoEnEscrow = 0;

        const projectStats = projects.map((project) => {
            const totalProjectRecaudado = project.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
            const totalProjectEscrow = project.inversiones.reduce(
                (acc, inv) => acc + Number(inv.montoTotal),
                0
            );
            globalTotalRecaudado += totalProjectRecaudado;
            globalMontoEnEscrow += totalProjectEscrow;

            const totalLeads = project._count.leads;
            const conversions = project._count.inversiones;
            const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
            const demandLevel = (
                totalLeads > 10 ? "ALTA" : totalLeads > 5 ? "MEDIA" : "BAJA"
            ) as "ALTA" | "MEDIA" | "BAJA";

            return {
                id: project.id,
                nombre: project.nombre,
                etapaActual: project.estado,
                leadsActivos: totalLeads,
                conversion: Math.round(conversionRate * 10) / 10,
                nivelDemanda: demandLevel,
                recaudado: totalProjectRecaudado,
                proximoHito: project.hitosEscrow[0] || null,
            };
        });

        // Sort top 3 by lead count
        const topProjects = [...projectStats]
            .sort((a, b) => b.leadsActivos - a.leadsActivos)
            .slice(0, 3);

        // Unit totals
        let totalUnidades = 0;
        let unidadesVendidas = 0;
        unitCounts.forEach((group) => {
            totalUnidades += group._count;
            if (group.estado === "VENDIDA") unidadesVendidas = group._count;
        });
        const soldPercentage =
            totalUnidades > 0 ? (unidadesVendidas / totalUnidades) * 100 : 0;

        // Pipeline conversion rate: leads → oportunidades
        const conversionRate =
            leadsTotal > 0 ? Math.round((oportunidadesTotal / leadsTotal) * 1000) / 10 : 0;

        return {
            success: true,
            data: {
                projectStats,
                topProjects,
                nextMilestones: projects.flatMap((p) => p.hitosEscrow).slice(0, 3),
                global: {
                    totalRecaudado: globalTotalRecaudado,
                    montoEnEscrow: globalMontoEnEscrow,
                    soldPercentage: Math.round(soldPercentage * 10) / 10,
                    flujoProyectado: Number(priceAggregate._sum.precio ?? 0),
                    // New real metrics
                    leadsThisMonth,
                    conversionRate,
                    reservasActivas,
                    revenueThisMonth: Number(revenueThisMonth._sum.montoSena ?? 0),
                },
            },
        };
    } catch (error) {
        return handleGuardError(error);
    }
}
