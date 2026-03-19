import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { CommercialDashboardClient } from "@/components/dashboard/commercial/commercial-dashboard-client";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
import type { LeadsDayBucket } from "@/components/dashboard/commercial/leads-timeline";
import type { ProjectRankingRow } from "@/components/dashboard/commercial/projects-ranking-table";

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
        proyectosRaw,
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

        // Projects with lead + reservation counts + unit stats
        prisma.proyecto.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                nombre: true,
                _count: {
                    select: { leads: true },
                },
                etapas: {
                    select: {
                        manzanas: {
                            select: {
                                unidades: { 
                                    select: { 
                                        estado: true,
                                        reservas: {
                                            where: { estado: "ACTIVA" },
                                            select: { id: true }
                                        }
                                    } 
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
    ]);

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

    // ── Project rankings ──────────────────────────────────────────────────────
    const rankings: ProjectRankingRow[] = proyectosRaw.map(p => {
        let disp = 0, res = 0, vend = 0;
        let activeReservasCount = 0;
        for (const e of p.etapas)
            for (const m of e.manzanas)
                for (const u of m.unidades) {
                    if (u.estado === "DISPONIBLE") disp++;
                    else if (u.estado === "RESERVADA") res++;
                    else if (u.estado === "VENDIDA") vend++;
                    activeReservasCount += u.reservas.length;
                }
        return {
            id: p.id,
            nombre: p.nombre,
            leads: p._count.leads,
            reservasActivas: activeReservasCount,
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
