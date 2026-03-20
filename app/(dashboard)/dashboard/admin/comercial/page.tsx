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

export default async function AdminComercialPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session?.user || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
        redirect("/dashboard");
    }

    // ── Base date: 30 days ago ────────────────────────────────────────────────
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);
    since30d.setHours(0, 0, 0, 0);

    // ── Fetch in parallel ──────────────────────────────────────────────────────
    const [
        totalLeads,
        leadsRaw,
        reservasActivas,
        reservasTotal,
        unidadesAgg,
        proyectos,
    ] = await Promise.all([
        // Total leads across platform
        prisma.lead.count(),

        // 30d leads grouped by createdAt for timeline
        prisma.lead.findMany({
            where: { createdAt: { gte: since30d } },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
        }),

        // Active reservations
        prisma.reserva.count({ where: { estado: "ACTIVA" } }),

        // All reservations (historical)
        prisma.reserva.count(),

        // Unit states aggregated
        prisma.unidad.groupBy({
            by: ["estado"],
            _count: { id: true },
        }),

        // Projects — minimal: no tree, no nested units/reservas
        prisma.proyecto.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                nombre: true,
                _count: { select: { leads: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
    ]);

    // ── Round 2: per-project aggregates (depend on the 20 project IDs) ─────────
    const projectIds = proyectos.map(p => p.id);
    const [unitStateRows, reservaCountRows] = projectIds.length > 0
        ? await Promise.all([
            // Units by estado per project — replaces etapas→manzanas→unidades tree
            prisma.$queryRaw<UnitStateRow[]>(Prisma.sql`
                SELECT e."proyectoId", u.estado, COUNT(u.id)::int AS count
                FROM "unidades" u
                INNER JOIN "manzanas" m ON u."manzanaId" = m.id
                INNER JOIN "etapas"   e ON m."etapaId"   = e.id
                WHERE e."proyectoId" IN (${Prisma.join(projectIds)})
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
                  AND e."proyectoId" IN (${Prisma.join(projectIds)})
                GROUP BY e."proyectoId"
            `),
        ])
        : [[] as UnitStateRow[], [] as ReservaCountRow[]];

    // ── Build leads timeline (bucket per day) ─────────────────────────────────
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

    // ── Inventory ─────────────────────────────────────────────────────────────
    const inv: Record<string, number> = { DISPONIBLE: 0, RESERVADA: 0, VENDIDA: 0 };
    for (const g of unidadesAgg) inv[g.estado] = (inv[g.estado] ?? 0) + g._count.id;

    // ── Project rankings — built from DB aggregates, no tree traversal ────────
    const unitsByProject: Record<string, Record<string, number>> = {};
    for (const row of unitStateRows) {
        (unitsByProject[row.proyectoId] ??= {})[row.estado] = row.count;
    }
    const reservasByProject: Record<string, number> = {};
    for (const row of reservaCountRows) {
        reservasByProject[row.proyectoId] = row.count;
    }

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
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            <ModuleHelp content={MODULE_HELP_CONTENT.comercialAdmin} />
            <CommercialDashboardClient
                leadsTimeline={leadsTimeline}
                totalLeads={totalLeads}
                reservasActivas={reservasActivas}
                reservasTotal={reservasTotal}
                unidadesDisponibles={inv.DISPONIBLE ?? 0}
                unidadesReservadas={inv.RESERVADA ?? 0}
                unidadesVendidas={inv.VENDIDA ?? 0}
                rankings={rankings}
                contextLabel="Vista global"
            />
        </div>
    );
}
