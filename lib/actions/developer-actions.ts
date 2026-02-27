"use server";

import prisma from "@/lib/db";
import { Proyecto, Unidad, Inversion, Pago, EscrowMilestone } from "@prisma/client";

export async function getDeveloperDashboardData(userId: string) {
    // 1. Fetch project-specific aggregated data
    const projects = await prisma.proyecto.findMany({
        where: { creadoPorId: userId },
        select: {
            id: true,
            nombre: true,
            estado: true,
            _count: {
                select: {
                    leads: true,
                    inversiones: true
                }
            },
            hitosEscrow: {
                where: { estado: "PENDIENTE" },
                orderBy: { createdAt: "asc" },
                take: 1
            },
            inversiones: {
                where: { estado: "ESCROW" },
                select: { montoTotal: true }
            },
            pagos: {
                where: { estado: "APROBADO" },
                select: { monto: true }
            }
        }
    });

    let globalTotalRecaudado = 0;
    let globalMontoEnEscrow = 0;

    const projectStats = projects.map(project => {
        const totalProjectRecaudado = project.pagos.reduce((acc, p) => acc + p.monto, 0);
        const totalProjectEscrow = project.inversiones.reduce((acc, inv) => acc + inv.montoTotal, 0);

        globalTotalRecaudado += totalProjectRecaudado;
        globalMontoEnEscrow += totalProjectEscrow;

        const totalLeads = project._count.leads;
        const conversions = project._count.inversiones;
        const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
        const demandLevel = (totalLeads > 10 ? "ALTA" : totalLeads > 5 ? "MEDIA" : "BAJA") as "ALTA" | "MEDIA" | "BAJA";

        return {
            id: project.id,
            nombre: project.nombre,
            etapaActual: project.estado,
            leadsActivos: totalLeads,
            conversion: Math.round(conversionRate * 10) / 10,
            nivelDemanda: demandLevel,
            recaudado: totalProjectRecaudado,
            proximoHito: project.hitosEscrow[0] || null
        };
    });

    // 2. Global Metrics for Units using direct count and aggregate
    const [unitCounts, priceAggregate] = await Promise.all([
        prisma.unidad.groupBy({
            by: ['estado'],
            where: {
                manzana: {
                    etapa: {
                        proyecto: {
                            creadoPorId: userId
                        }
                    }
                }
            },
            _count: true
        }),
        prisma.unidad.aggregate({
            where: {
                manzana: {
                    etapa: {
                        proyecto: {
                            creadoPorId: userId
                        }
                    }
                },
                estado: "DISPONIBLE"
            },
            _sum: { precio: true }
        })
    ]);

    let totalUnidades = 0;
    let unidadesVendidas = 0;

    unitCounts.forEach(group => {
        totalUnidades += group._count;
        if (group.estado === "VENDIDA") unidadesVendidas = group._count;
    });

    const soldPercentage = totalUnidades > 0 ? (unidadesVendidas / totalUnidades) * 100 : 0;

    return {
        projectStats,
        nextMilestones: projects.flatMap(p => p.hitosEscrow).slice(0, 3),
        global: {
            totalRecaudado: globalTotalRecaudado,
            montoEnEscrow: globalMontoEnEscrow,
            soldPercentage: Math.round(soldPercentage * 10) / 10,
            flujoProyectado: priceAggregate._sum.precio || 0
        }
    };
}
