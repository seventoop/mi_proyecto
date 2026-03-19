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

export default async function DeveloperComercialPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) redirect("/login");
    if (userRole !== "DESARROLLADOR" && userRole !== "VENDEDOR") redirect("/dashboard");

    // ── Relation-based project scope ──────────────────────────────────────────
    // 1. Active ProyectoUsuario relations
    const relaciones = await prisma.proyectoUsuario.findMany({
        where: { userId, estadoRelacion: "ACTIVA" },
        select: { proyectoId: true },
    });
    const relacionIds = relaciones.map(r => r.proyectoId);

    // 2. Legacy fallback: projects created by user with no relation row
    const legacyProyectos = await prisma.proyecto.findMany({
        where: {
            creadoPorId: userId,
            deletedAt: null,
            NOT: { usuariosRelaciones: { some: { userId } } },
        },
        select: { id: true },
    });
    const legacyIds = legacyProyectos.map(p => p.id);

    const allProyectoIds = [...relacionIds, ...legacyIds];

    // If developer has no projects, show empty dashboard
    if (allProyectoIds.length === 0) {
        return (
            <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
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
        proyectosRaw,
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

        prisma.proyecto.findMany({
            where: { id: { in: allProyectoIds }, deletedAt: null },
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
        }),
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

    // ── Inventory (from all projects' units) ──────────────────────────────────
    let unidadesDisponibles = 0, unidadesReservadas = 0, unidadesVendidas = 0;
    for (const p of proyectosRaw)
        for (const e of p.etapas)
            for (const m of e.manzanas)
                for (const u of m.unidades) {
                    if (u.estado === "DISPONIBLE") unidadesDisponibles++;
                    else if (u.estado === "RESERVADA") unidadesReservadas++;
                    else if (u.estado === "VENDIDA") unidadesVendidas++;
                }

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
