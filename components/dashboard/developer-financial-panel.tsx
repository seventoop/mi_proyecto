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

    return (
        <div className="space-y-6">
            {/* KYC Blocking Overlay Alert (if not approved) */}
            {!isKycApproved && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Acceso Restringido</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">Debes completar tu KYC para publicar nuevos proyectos.</p>
                        </div>
                    </div>
                    <button
                        disabled
                        className="px-4 py-2 bg-slate-200 dark:bg-white/5 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider cursor-not-allowed flex items-center gap-2"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Publicar Proyecto
                    </button>
                </div>
            )}

            {/* Global Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Recaudado</p>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">${global.totalRecaudado.toLocaleString()}</p>
                    <div className="mt-2 w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[70%]" />
                    </div>
                </div>

                <div className="glass-card p-5">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto en Escrow</p>
                        <ShieldCheck className="w-4 h-4 text-brand-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">${global.montoEnEscrow.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">Fondos sujetos a hitos</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">% Unidades Vendidas</p>
                        <PieChart className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{global.soldPercentage}%</p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">Avance comercial global</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Flujo Proyectado</p>
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">${global.flujoProyectado.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">Saldo pendiente por cobrar</p>
                </div>
            </div>

            {/* Projects Health Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Estado de Salud de Proyectos</h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                        <Search className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500 font-bold">Filtrar...</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Proyecto</th>
                                <th className="px-6 py-4">Etapa</th>
                                <th className="px-6 py-4 text-center">Leads</th>
                                <th className="px-6 py-4 text-center">Conv. %</th>
                                <th className="px-6 py-4">Demanda</th>
                                <th className="px-6 py-4 text-right">Recaudado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {projectStats.map((project) => (
                                <tr key={project.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{project.nombre}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border",
                                            project.etapaActual === "ESTRUCTURACION" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                project.etapaActual === "PREVENTA" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                    project.etapaActual === "LANZAMIENTO" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                        "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                        )}>
                                            {project.etapaActual}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Users className="w-3 h-3 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{project.leadsActivos}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Target className="w-3 h-3 text-emerald-500" />
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{project.conversion}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                project.nivelDemanda === "ALTA" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                                    project.nivelDemanda === "MEDIA" ? "bg-amber-500" : "bg-rose-500"
                                            )} />
                                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{project.nivelDemanda}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-xs font-black text-slate-900 dark:text-white">${project.recaudado.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Link href={`/dashboard/developer/proyectos/${project.id}`} className="p-1.5 hover:bg-white/10 rounded-lg inline-block transition-colors">
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Next Milestones (Simplified Horizontal List) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Landmark className="w-3 h-3" />
                        Próximas Liberaciones de Fondos
                    </h2>
                    <div className="space-y-3">
                        {projectStats.filter(p => p.proximoHito).slice(0, 2).map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-tighter">{p.proximoHito.titulo}</p>
                                    <p className="text-[9px] text-slate-500 font-bold">{p.nombre}</p>
                                </div>
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                    {p.proximoHito.porcentaje}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-brand-500/10 border border-brand-500/20 p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-black text-brand-600 dark:text-brand-400 uppercase tracking-tight mb-2">Consejo de Optimización</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                            El proyecto <span className="text-brand-400">"{projectStats[0]?.nombre}"</span> tiene una demanda ALTA pero una conversión del {projectStats[0]?.conversion}%.
                            Considera revisar el flujo de seguimiento de leads.
                        </p>
                    </div>
                    {isKycApproved && (
                        <button className="mt-4 w-full py-2 bg-brand-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-600 transition-colors flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(245,158,11,0.2)]">
                            <PlusCircle className="w-4 h-4" />
                            Publicar Nuevo Proyecto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
