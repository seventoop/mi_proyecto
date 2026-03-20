"use client";

import { useState } from "react";
import { Users, BookmarkCheck, TrendingUp, Package } from "lucide-react";
import { MetricCard } from "./metric-card";
import { LeadsTimeline, LeadsDayBucket } from "./leads-timeline";
import { InventoryComposition } from "./inventory-composition";
import { ProjectsRankingTable, ProjectRankingRow } from "./projects-ranking-table";
import { PeriodSelector, Period } from "./period-selector";

interface CommercialDashboardProps {
    // Leads (full 30d buckets — filtered client-side per period)
    leadsTimeline: LeadsDayBucket[];
    totalLeads: number;
    // Reservas
    reservasActivas: number;
    reservasTotal: number;
    // Inventory
    unidadesDisponibles: number;
    unidadesReservadas: number;
    unidadesVendidas: number;
    // Projects ranking
    rankings: ProjectRankingRow[];
    // Context label (admin shows "Global", developer shows org name)
    contextLabel?: string;
}

export function CommercialDashboardClient({
    leadsTimeline,
    totalLeads,
    reservasActivas,
    reservasTotal,
    unidadesDisponibles,
    unidadesReservadas,
    unidadesVendidas,
    rankings,
    contextLabel,
}: CommercialDashboardProps) {
    const [period, setPeriod] = useState<Period>("30d");

    // Derive period-scoped metrics from timeline
    const days = period === "7d" ? 7 : 30;
    const leadsEnPeriodo = leadsTimeline.slice(-days).reduce((s, d) => s + d.count, 0);

    // Conversion: leads with at least one reserva (approximation via reservasTotal / totalLeads)
    const conversionPct = totalLeads > 0
        ? Math.round((reservasTotal / totalLeads) * 100)
        : 0;

    const totalUnidades = unidadesDisponibles + unidadesReservadas + unidadesVendidas;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 mb-1">
                        {contextLabel ?? "Vista comercial"}
                    </p>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white/90">Dashboard Comercial</h2>
                </div>
                <PeriodSelector period={period} onChangePeriod={setPeriod} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Leads en período"
                    value={leadsEnPeriodo}
                    subtitle={`${totalLeads} total acumulados`}
                    icon={Users}
                    color="brand"
                />
                <MetricCard
                    title="Reservas activas"
                    value={reservasActivas}
                    subtitle={`${reservasTotal} total históricas`}
                    icon={BookmarkCheck}
                    color="amber"
                />
                <MetricCard
                    title="Conversión"
                    value={`${conversionPct}%`}
                    subtitle="Leads → Reservas"
                    icon={TrendingUp}
                    color="emerald"
                />
                <MetricCard
                    title="Unidades disponibles"
                    value={unidadesDisponibles}
                    subtitle={`${totalUnidades} totales`}
                    icon={Package}
                    color="sky"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline — spans 2 cols */}
                <div className="lg:col-span-2 bg-white dark:bg-[#09090b] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm dark:shadow-lg">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 mb-0.5">Timeline</p>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white/80">Leads por día</h3>
                        </div>
                        <span className="text-2xl font-black text-brand-400">{leadsEnPeriodo}</span>
                    </div>
                    <LeadsTimeline data={leadsTimeline} period={period} />
                </div>

                {/* Inventory Donut */}
                <div className="bg-white dark:bg-[#09090b] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm dark:shadow-lg">
                    <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 mb-0.5">Inventario</p>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white/80">Composición de unidades</h3>
                    </div>
                    <InventoryComposition
                        disponibles={unidadesDisponibles}
                        reservadas={unidadesReservadas}
                        vendidas={unidadesVendidas}
                    />
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {[
                            { label: "Disp.", value: unidadesDisponibles, color: "text-emerald-400" },
                            { label: "Res.", value: unidadesReservadas,  color: "text-amber-400" },
                            { label: "Vend.", value: unidadesVendidas,   color: "text-indigo-400" },
                        ].map(item => (
                            <div key={item.label} className="text-center">
                                <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rankings Table */}
            {rankings.length > 0 && (
                <div className="bg-white dark:bg-[#09090b] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm dark:shadow-lg">
                    <div className="mb-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 mb-0.5">Performance</p>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white/80">Ranking de Proyectos</h3>
                    </div>
                    <ProjectsRankingTable rows={rankings} />
                </div>
            )}
        </div>
    );
}
