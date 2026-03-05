"use server";

import prisma from "@/lib/db";
import { handleGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

export async function getDeveloperDashboardData(userId: string) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

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
                    where: { estado: "PENDIENTE" as any },
                    orderBy: { createdAt: "asc" },
                    take: 1
                },
                inversiones: {
                    where: { estado: "ESCROW" as any },
                    select: { montoTotal: true }
                },
                pagos: {
                    where: { estado: "APROBADO" as any },
                    select: { monto: true }
                }
            }
        });

        let globalTotalRecaudado = 0;
        let globalMontoEnEscrow = 0;

        const projectStats = projects.map(project => {
            const totalProjectRecaudado = project.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
            const totalProjectEscrow = project.inversiones.reduce((acc, inv) => acc + Number(inv.montoTotal), 0);

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

        // 2. Global Metrics for Units
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
                    estado: "DISPONIBLE" as any
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
            success: true,
            data: {
                projectStats,
                nextMilestones: projects.flatMap(p => p.hitosEscrow).slice(0, 3),
                global: {
                    totalRecaudado: globalTotalRecaudado,
                    montoEnEscrow: globalMontoEnEscrow,
                    soldPercentage: Math.round(soldPercentage * 10) / 10,
                    flujoProyectado: Number(priceAggregate._sum.precio ?? 0)
                }
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}
