import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { CommercialDashboardClient } from "@/components/dashboard/commercial/commercial-dashboard-client";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
import type { LeadsDayBucket } from "@/components/dashboard/commercial/leads-timeline";
import type { ProjectRankingRow } from "@/components/dashboard/commercial/projects-ranking-table";

type UnitStateRow    = { proyectoId: string; estado: string; count: number };
type ReservaCountRow = { proyectoId: string; count: number };

export const dynamic = "force-dynamic";

export default async function DeveloperComercialPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) redirect("/login");
    if (userRole !== "DESARROLLADOR" && userRole !== "VENDEDOR") redirect("/dashboard");

    // ── Relation-based project scope (both queries are independent — run in parallel)
    const [relaciones, legacyProyectos] = await Promise.all([
        // 1. Active ProyectoUsuario relations
        prisma.proyectoUsuario.findMany({
            where: { userId, estadoRelacion: "ACTIVA" },
            select: { proyectoId: true },
        }),
        // 2. Legacy fallback: projects created by user with no relation row
        prisma.proyecto.findMany({
            where: {
                creadoPorId: userId,
                deletedAt: null,
                NOT: { usuariosRelaciones: { some: { userId } } },
            },
            select: { id: true },
        }),
    ]);

    const allProyectoIds = [
        ...relaciones.map(r => r.proyectoId),
        ...legacyProyectos.map(p => p.id),
    ];

    // If developer has no projects, show empty dashboard
    if (allProyectoIds.length === 0) {
        return (
            <div className="space-y-6 p-6">
                <ModuleHelp content={MODULE_HELP_CONTENT.comercialDeveloper} />
                <CommercialDashboardClient
                    leadsTimeline={[]}
                    totalLeads={0}
                    reservasActivas={0}
                    reservasTotal={0}
                    unidadesDisponibles={0}
                    unidadesReservadas={0}
                    unidadesVendidas={0}
                    rankings={[]}
                    contextLabel="Mis proyectos"
                />
            </div>
        );
    }

    // ── Base date: 30 days ago ────────────────────────────────────────────────
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);
    since30d.setHours(0, 0, 0, 0);

    // ── Fetch in parallel, all scoped to allProyectoIds ───────────────────────
    const [
        totalLeads,
        leadsRaw,
        reservasActivas,
        reservasTotal,
        proyectos,
        unitStateRows,
        reservaCountRows,
    ] = await Promise.all([
        prisma.lead.count({
            where: { proyectoId: { in: allProyectoIds } },
        }),

        prisma.lead.findMany({
            where: {
                proyectoId: { in: allProyectoIds },
                createdAt: { gte: since30d },
            },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        }),

        prisma.reserva.count({
            where: {
                estado: "ACTIVA",
                unidad: { manzana: { etapa: { proyectoId: { in: allProyectoIds } } } },
            },
        }),

        prisma.reserva.count({
            where: {
                unidad: { manzana: { etapa: { proyectoId: { in: allProyectoIds } } } },
            },
        }),

        // Projects — minimal: no tree, no nested units/reservas
        prisma.proyecto.findMany({
            where: { id: { in: allProyectoIds }, deletedAt: null },
            select: {
                id: true,
                nombre: true,
                _count: { select: { leads: true } },
            },
            orderBy: { createdAt: "desc" },
        }),

        // Units by estado per project — replaces etapas→manzanas→unidades tree
        prisma.$queryRaw<UnitStateRow[]>(Prisma.sql`
            SELECT e."proyectoId", u.estado, COUNT(u.id)::int AS count
            FROM "unidades" u
            INNER JOIN "manzanas" m ON u."manzanaId" = m.id
            INNER JOIN "etapas"   e ON m."etapaId"   = e.id
            WHERE e."proyectoId" IN (${Prisma.join(allProyectoIds)})
            GROUP BY e."proyectoId", u.estado
        `),

        // Active reservas per project — replaces unidades→reservas(ACTIVA) sub-tree
        prisma.$queryRaw<ReservaCountRow[]>(Prisma.sql`
            SELECT e."proyectoId", COUNT(r.id)::int AS count
            FROM "reservas" r
            INNER JOIN "unidades" u ON r."unidadId" = u.id
            INNER JOIN "manzanas" m ON u."manzanaId" = m.id
            INNER JOIN "etapas"   e ON m."etapaId"   = e.id
            WHERE r.estado = 'ACTIVA'
              AND e."proyectoId" IN (${Prisma.join(allProyectoIds)})
            GROUP BY e."proyectoId"
        `),
    ]);

    // ── Build leads timeline ──────────────────────────────────────────────────
    const bucketMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
        const d = new Date(since30d);
        d.setDate(d.getDate() + i);
        bucketMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const l of leadsRaw) {
        const key = l.createdAt.toISOString().slice(0, 10);
        if (key in bucketMap) bucketMap[key]++;
    }
    const leadsTimeline: LeadsDayBucket[] = Object.entries(bucketMap).map(([date, count]) => ({ date, count }));

    // ── Build lookup maps from DB aggregates — O(N) ───────────────────────────
    const unitsByProject: Record<string, Record<string, number>> = {};
    for (const row of unitStateRows) {
        (unitsByProject[row.proyectoId] ??= {})[row.estado] = row.count;
    }
    const reservasByProject: Record<string, number> = {};
    for (const row of reservaCountRows) {
        reservasByProject[row.proyectoId] = row.count;
    }

    // ── Inventory (summed from aggregates, no tree traversal) ─────────────────
    let unidadesDisponibles = 0, unidadesReservadas = 0, unidadesVendidas = 0;
    for (const us of Object.values(unitsByProject)) {
        unidadesDisponibles += us.DISPONIBLE ?? 0;
        unidadesReservadas  += us.RESERVADA  ?? 0;
        unidadesVendidas    += us.VENDIDA    ?? 0;
    }

    // ── Project rankings — built from DB aggregates, no tree traversal ────────
    const rankings: ProjectRankingRow[] = proyectos.map(p => {
        const us   = unitsByProject[p.id] ?? {};
        const disp = us.DISPONIBLE ?? 0;
        const res  = us.RESERVADA  ?? 0;
        const vend = us.VENDIDA    ?? 0;
        return {
            id: p.id,
            nombre: p.nombre,
            leads: p._count.leads,
            reservasActivas: reservasByProject[p.id] ?? 0,
            unidadesDisponibles: disp,
            unidadesVendidas: vend,
            unidadesTotal: disp + res + vend,
        };
    }).sort((a, b) => b.leads - a.leads);

    return (
        <div className="space-y-6 p-6">
            <ModuleHelp content={MODULE_HELP_CONTENT.comercialDeveloper} />
            <CommercialDashboardClient
                leadsTimeline={leadsTimeline}
                totalLeads={totalLeads}
                reservasActivas={reservasActivas}
                reservasTotal={reservasTotal}
                unidadesDisponibles={unidadesDisponibles}
                unidadesReservadas={unidadesReservadas}
                unidadesVendidas={unidadesVendidas}
                rankings={rankings}
                contextLabel="Mis proyectos"
            />
        </div>
    );
}
