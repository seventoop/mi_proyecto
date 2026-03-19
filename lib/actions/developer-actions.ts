"use server";

import prisma from "@/lib/db";
import { requireAuth, handleGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

export async function getDeveloperDashboardData(userId: string) {
    try {
        const user = await requireAuth();

        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        if (user.role !== "ADMIN" && user.id !== userId) {
            return { success: false, error: "No autorizado" };
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const NONE = ["___NONE___"] as string[];

        // ─── Step 1: Resolve project access buckets ───────────────────────────
        //
        // Bucket A — fullMetricIds:
        //   Projects where the user sees ALL metrics (global access).
        //   Includes: OWNER, COMERCIALIZADOR_EXCLUSIVO (with perm=true), legacy creadoPorId.
        //
        // Bucket B — ownOnlyMetricIds:
        //   Projects where the user has a relation but permisoVerMetricasGlobales=false.
        //   Includes: VENDEDOR_ASIGNADO, COMERCIALIZADOR_NO_EXCLUSIVO (default).
        //   Metrics scoped to: vendedorId=userId / asignadoAId=userId.
        //
        // Bucket C — Legacy (no ProyectoUsuario row, creadoPorId match):
        //   Treated as OWNER — full global access.

        const relaciones = await prisma.proyectoUsuario.findMany({
            where: { userId, estadoRelacion: "ACTIVA" },
            select: { proyectoId: true, permisoVerMetricasGlobales: true },
        });

        const globalMetricIds   = relaciones.filter(r =>  r.permisoVerMetricasGlobales).map(r => r.proyectoId);
        const ownOnlyMetricIds  = relaciones.filter(r => !r.permisoVerMetricasGlobales).map(r => r.proyectoId);

        // Legacy: projects created by user with no relation row (treated as global/OWNER)
        const legacyProjects = await prisma.proyecto.findMany({
            where: {
                creadoPorId: userId,
                deletedAt: null,
                NOT: { usuariosRelaciones: { some: { userId } } },
            },
            select: { id: true },
        });
        const legacyIds = legacyProjects.map(p => p.id);

        const allGlobalIds = [...globalMetricIds, ...legacyIds];
        const fullMetricIds = allGlobalIds.filter((id, i) => allGlobalIds.indexOf(id) === i);

        // ─── Step 2: Bucket A — Global-access metrics ─────────────────────────
        //   Full project data: leads, inversiones, pagos, unidades, reservas, etc.
        //   No user-scoping — all data for these projects.

        const globalUnitFilter   = { manzana: { etapa: { proyectoId: { in: fullMetricIds.length > 0 ? fullMetricIds : NONE } } } };
        const globalProjectFilter = { proyecto: { id: { in: fullMetricIds.length > 0 ? fullMetricIds : NONE } } };

        const [
            globalProjects,
            globalLeadsThisMonth,
            globalLeadsTotal,
            globalOportunidades,
            globalReservasActivas,
            globalRevenue,
            globalUnitCounts,
            globalPriceAggregate,
        ] = await Promise.all([
            prisma.proyecto.findMany({
                where: { id: { in: fullMetricIds.length > 0 ? fullMetricIds : NONE }, deletedAt: null },
                select: {
                    id: true, nombre: true, estado: true,
                    _count: { select: { leads: true, inversiones: true } },
                    hitosEscrow: { where: { estado: "PENDIENTE" as any }, orderBy: { createdAt: "asc" }, take: 1 },
                    inversiones: { where: { estado: "ESCROW" as any }, select: { montoTotal: true } },
                    pagos:       { where: { estado: "APROBADO" as any }, select: { monto: true } },
                },
            }),
            prisma.lead.count({ where: { ...globalProjectFilter, createdAt: { gte: thirtyDaysAgo } } }),
            prisma.lead.count({ where: globalProjectFilter }),
            prisma.oportunidad.count({ where: globalProjectFilter }),
            prisma.reserva.count({ where: { ...globalUnitFilter, estado: "ACTIVA" } }),
            prisma.reserva.aggregate({ where: { ...globalUnitFilter, createdAt: { gte: thirtyDaysAgo } }, _sum: { montoSena: true } }),
            prisma.unidad.groupBy({ by: ["estado"], where: globalUnitFilter, _count: true }),
            prisma.unidad.aggregate({ where: { ...globalUnitFilter, estado: "DISPONIBLE" as any }, _sum: { precio: true } }),
        ]);

        // ─── Step 3: Bucket B — Own-only metrics ──────────────────────────────
        //   Scoped to userId: only reservas where vendedorId=userId, leads where asignadoAId=userId.
        //   Used for VENDEDOR_ASIGNADO, COMERCIALIZADOR_NO_EXCLUSIVO (default), etc.

        const hasOwnOnly = ownOnlyMetricIds.length > 0;
        const ownUnitFilter   = hasOwnOnly
            ? { vendedorId: userId, unidad: { manzana: { etapa: { proyectoId: { in: ownOnlyMetricIds } } } } }
            : null;
        const ownLeadFilter   = hasOwnOnly
            ? { asignadoAId: userId, proyectoId: { in: ownOnlyMetricIds } }
            : null;

        const [
            ownLeadsThisMonth,
            ownLeadsTotal,
            ownOportunidades,
            ownReservasActivas,
            ownRevenue,
            ownProjectNames,
        ] = await Promise.all([
            hasOwnOnly
                ? prisma.lead.count({ where: { ...ownLeadFilter!, createdAt: { gte: thirtyDaysAgo } } })
                : Promise.resolve(0),
            hasOwnOnly
                ? prisma.lead.count({ where: ownLeadFilter! })
                : Promise.resolve(0),
            hasOwnOnly
                ? prisma.oportunidad.count({ where: { lead: { asignadoAId: userId }, proyectoId: { in: ownOnlyMetricIds } } })
                : Promise.resolve(0),
            hasOwnOnly
                ? prisma.reserva.count({ where: { vendedorId: userId, unidad: { manzana: { etapa: { proyectoId: { in: ownOnlyMetricIds } } } }, estado: "ACTIVA" } })
                : Promise.resolve(0),
            hasOwnOnly
                ? prisma.reserva.aggregate({ where: { vendedorId: userId, unidad: { manzana: { etapa: { proyectoId: { in: ownOnlyMetricIds } } } }, createdAt: { gte: thirtyDaysAgo } }, _sum: { montoSena: true } })
                : Promise.resolve({ _sum: { montoSena: null } }),
            // Project names for own-only entries in projectStats
            hasOwnOnly
                ? prisma.proyecto.findMany({ where: { id: { in: ownOnlyMetricIds }, deletedAt: null }, select: { id: true, nombre: true, estado: true } })
                : Promise.resolve([] as { id: string; nombre: string; estado: string }[]),
        ]);

        // ─── Step 4: Build projectStats ───────────────────────────────────────

        let globalTotalRecaudado = 0;
        let globalMontoEnEscrow = 0;

        // A: Full-access projects — complete data
        const globalProjectStats = globalProjects.map((project) => {
            const recaudado  = project.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
            const enEscrow   = project.inversiones.reduce((acc, inv) => acc + Number(inv.montoTotal), 0);
            globalTotalRecaudado += recaudado;
            globalMontoEnEscrow  += enEscrow;
            const totalLeads    = project._count.leads;
            const conversions   = project._count.inversiones;
            const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
            return {
                id: project.id,
                nombre: project.nombre,
                etapaActual: project.estado,
                leadsActivos: totalLeads,
                conversion: Math.round(conversionRate * 10) / 10,
                nivelDemanda: (totalLeads > 10 ? "ALTA" : totalLeads > 5 ? "MEDIA" : "BAJA") as "ALTA" | "MEDIA" | "BAJA",
                recaudado,
                proximoHito: project.hitosEscrow[0] || null,
                // Distinguish for the consumer
                accesoGlobal: true as const,
            };
        });

        // B: Own-only projects — own-scoped data only (no financial totals — not visible)
        const ownProjectStats = ownProjectNames.map((project) => ({
            id: project.id,
            nombre: project.nombre,
            etapaActual: project.estado,
            leadsActivos: 0,  // will be filled below per-project if needed; for now aggregate only
            conversion: 0,
            nivelDemanda: "BAJA" as const,
            recaudado: 0,
            proximoHito: null,
            accesoGlobal: false as const,
        }));

        const projectStats = [...globalProjectStats, ...ownProjectStats];
        const topProjects  = [...globalProjectStats]
            .sort((a, b) => b.leadsActivos - a.leadsActivos)
            .slice(0, 3);

        // ─── Step 5: Combine A + B for global KPI numbers ─────────────────────

        const leadsThisMonth  = globalLeadsThisMonth  + ownLeadsThisMonth;
        const leadsTotal      = globalLeadsTotal       + ownLeadsTotal;
        const oportunidades   = globalOportunidades    + ownOportunidades;
        const reservasActivas = globalReservasActivas  + ownReservasActivas;
        const revenueThisMonth = Number(globalRevenue._sum.montoSena ?? 0)
                               + Number(ownRevenue._sum.montoSena ?? 0);

        // Unit aggregates only from full-access bucket (own-only → no unit visibility)
        let totalUnidades = 0;
        let unidadesVendidas = 0;
        globalUnitCounts.forEach((group) => {
            totalUnidades += group._count;
            if (group.estado === "VENDIDA") unidadesVendidas = group._count;
        });
        const soldPercentage  = totalUnidades > 0 ? (unidadesVendidas / totalUnidades) * 100 : 0;
        const conversionRate  = leadsTotal > 0 ? Math.round((oportunidades / leadsTotal) * 1000) / 10 : 0;

        return {
            success: true,
            data: {
                projectStats,
                topProjects,
                nextMilestones: globalProjects.flatMap((p) => p.hitosEscrow).slice(0, 3),
                global: {
                    totalRecaudado: globalTotalRecaudado,
                    montoEnEscrow:  globalMontoEnEscrow,
                    soldPercentage: Math.round(soldPercentage * 10) / 10,
                    flujoProyectado: Number(globalPriceAggregate._sum.precio ?? 0),
                    leadsThisMonth,
                    conversionRate,
                    reservasActivas,
                    revenueThisMonth,
                },
            },
        };
    } catch (error) {
        return handleGuardError(error);
    }
}
