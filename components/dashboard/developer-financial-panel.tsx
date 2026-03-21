"use client";

import {
    DollarSign,
    ShieldCheck,
    TrendingUp,
    PieChart,
    Landmark,
    Users,
    Target,
    AlertTriangle,
    PlusCircle,
    ChevronRight,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProjectStat {
    id: string;
    nombre: string;
    etapaActual: string;
    leadsActivos: number;
    conversion: number;
    nivelDemanda: "ALTA" | "MEDIA" | "BAJA";
    recaudado: number;
    proximoHito: any;
}

interface FinancialPanelProps {
    global: {
        totalRecaudado: number;
        montoEnEscrow: number;
        soldPercentage: number;
        flujoProyectado: number;
        leadsThisMonth?: number;
        conversionRate?: number;
        reservasActivas?: number;
        revenueThisMonth?: number;
    };
    projectStats: ProjectStat[];
    kycStatus: string;
}

export default function DeveloperFinancialPanel({ global, projectStats, kycStatus }: FinancialPanelProps) {
    const isKycApproved = kycStatus === "VERIFICADO" || kycStatus === "APROBADO";

    const financialCards = [
        { label: "Total Recaudado", value: `$${global.totalRecaudado.toLocaleString()}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", barColor: "bg-emerald-500", barWidth: `${Math.min(100, global.soldPercentage || 0)}%` },
        { label: "En Escrow", value: `$${global.montoEnEscrow.toLocaleString()}`, icon: ShieldCheck, color: "text-brand-500", bg: "bg-brand-500/10", note: "Fondos sujetos a hitos" },
        { label: "Unidades Vendidas", value: `${global.soldPercentage}%`, icon: PieChart, color: "text-amber-500", bg: "bg-amber-500/10", note: "Avance comercial global" },
        { label: "Flujo Proyectado", value: `$${global.flujoProyectado.toLocaleString()}`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", note: "Por cobrar pendiente" },
    ];

    return (
        <div className="space-y-4">
            {/* KYC Restriction Banner */}
            {!isKycApproved && (
                <div className="flex items-center justify-between gap-4 px-4 py-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-rose-800 dark:text-rose-400">Acceso Restringido</p>
                            <p className="text-sm text-rose-600 dark:text-rose-500/80 font-medium">Completá tu KYC para publicar proyectos.</p>
                        </div>
                    </div>
                    <button
                        disabled
                        className="shrink-0 px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20 rounded-lg text-sm font-bold uppercase tracking-wider cursor-not-allowed flex items-center gap-1.5"
                    >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Publicar
                    </button>
                </div>
            )}

            {/* Financial Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {financialCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between mb-3">
                            <p className="text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest leading-tight">{card.label}</p>
                            <div className={cn("p-1.5 rounded-lg", card.bg)}>
                                <card.icon className={cn("w-3.5 h-3.5", card.color)} />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter leading-none">{card.value}</p>
                        {card.barWidth && (
                            <div className="mt-3 h-1 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", card.barColor)} style={{ width: card.barWidth }} />
                            </div>
                        )}
                        {card.note && <p className="text-xs text-slate-400 dark:text-white/30 font-medium mt-2">{card.note}</p>}
                    </div>
                ))}
            </div>

            {/* Projects Health Table */}
            {projectStats.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                        <p className="text-sm font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest">Salud de Proyectos</p>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-200 dark:border-white/[0.06]">
                            <Search className="w-3 h-3 text-slate-400 dark:text-white/30" />
                            <span className="text-xs text-slate-400 dark:text-white/30 font-medium">Filtrar...</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/[0.06]">
                                    {["Proyecto", "Etapa", "Leads", "Conv. %", "Demanda", "Recaudado", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                {projectStats.map((project) => (
                                    <tr key={project.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-[12px] font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate max-w-[160px]">{project.nombre}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-tighter border",
                                                project.etapaActual === "ESTRUCTURACION" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    project.etapaActual === "PREVENTA" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                        project.etapaActual === "LANZAMIENTO" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                            "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                            )}>
                                                {project.etapaActual}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3 text-slate-400 dark:text-white/30" />
                                                <span className="text-[12px] font-bold text-slate-700 dark:text-zinc-200">{project.leadsActivos}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Target className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[12px] font-bold text-slate-700 dark:text-zinc-200">{project.conversion}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    project.nivelDemanda === "ALTA" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" :
                                                        project.nivelDemanda === "MEDIA" ? "bg-amber-500" : "bg-rose-500"
                                                )} />
                                                <span className="text-xs font-bold text-slate-500 dark:text-white/40">{project.nivelDemanda}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="text-[12px] font-black text-slate-900 dark:text-zinc-100">${project.recaudado.toLocaleString()}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/dashboard/developer/proyectos/${project.id}`} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg inline-flex transition-colors">
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-white/20 group-hover:text-brand-400 transition-colors" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bottom Cards: Próximas Liberaciones + Optimization Tip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5">
                    <h2 className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Landmark className="w-3 h-3" />
                        Próximas Liberaciones de Fondos
                    </h2>
                    <div className="space-y-2.5">
                        {projectStats.filter(p => p.proximoHito).slice(0, 2).map((p) => (
                            <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                                <div>
                                    <p className="text-sm font-bold text-brand-500 dark:text-brand-400 uppercase tracking-tight">{p.proximoHito.titulo}</p>
                                    <p className="text-xs text-slate-400 dark:text-white/30 font-medium">{p.nombre}</p>
                                </div>
                                <span className="text-[12px] font-black text-slate-900 dark:text-zinc-100">{p.proximoHito.porcentaje}%</span>
                            </div>
                        ))}
                        {projectStats.filter(p => p.proximoHito).length === 0 && (
                            <p className="text-[12px] text-slate-400 dark:text-white/30 font-medium py-3 text-center">No hay liberaciones próximas.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-brand-500/20 bg-gradient-to-br from-brand-500/[0.07] to-brand-500/[0.03] p-5 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-2">Optimización Sugerida</p>
                        <p className="text-[13px] text-slate-600 dark:text-white/60 font-medium leading-relaxed">
                            {projectStats[0]?.nombre
                                ? <>El proyecto <span className="font-bold text-brand-500 dark:text-brand-400">"{projectStats[0]?.nombre}"</span> tiene demanda {projectStats[0]?.nivelDemanda} con conversión de {projectStats[0]?.conversion}%. Revisá el flujo de seguimiento.</>
                                : "Creá tu primer proyecto para comenzar a ver sugerencias de optimización."}
                        </p>
                    </div>
                    {isKycApproved && (
                        <Link
                            href="/dashboard/developer/proyectos/new"
                            className="mt-5 flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-black uppercase tracking-wider transition-colors shadow-md shadow-brand-500/20"
                        >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Publicar Nuevo Proyecto
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
