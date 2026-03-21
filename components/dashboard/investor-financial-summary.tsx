"use client";

import { Wallet, TrendingUp, PieChart, Landmark, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DistributionItem {
    proyectoId: string;
    nombre: string;
    monto: number;
}

interface FinancialSummaryProps {
    stats: {
        totalInvertido: number;
        saldoDisponible: number;
        roiPromedio: number;
    };
    distribution: DistributionItem[];
    nextMilestone?: {
        titulo: string;
        proyecto: { nombre: string };
        porcentaje: number;
    } | null;
}

export default function InvestorFinancialSummary({ stats, distribution, nextMilestone }: FinancialSummaryProps) {
    const totalAsset = stats.totalInvertido + stats.saldoDisponible;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Main Stats Card */}
            <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between min-h-[240px]">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">
                            Resumen Financiero Total
                        </h3>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">
                                ${totalAsset.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                                USD
                            </span>
                        </div>
                    </div>
                    <div className="p-3 bg-brand-500/10 rounded-2xl">
                        <Wallet className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10 mt-6">
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">Invertido</p>
                        <p className="font-bold text-slate-900 dark:text-white">${stats.totalInvertido.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">Disponible</p>
                        <p className="font-bold text-brand-500">${stats.saldoDisponible.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">ROI Histórico</p>
                        <p className={cn(
                            "font-bold",
                            stats.totalInvertido > 0 ? "text-emerald-500" : "text-slate-400"
                        )}>
                            {stats.totalInvertido > 0 ? `${stats.roiPromedio}%` : "Sin datos aún"}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">Proyectos</p>
                        <p className="font-bold text-slate-900 dark:text-white">{distribution.length}</p>
                    </div>
                </div>
            </div>

            {/* Distribution Map (Mini Chart) */}
            <div className="glass-card p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                    <PieChart className="w-4 h-4 text-brand-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Distribución
                    </h3>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-4">
                    {distribution.length > 0 ? (
                        <>
                            {/* Simple Stacked Horizontal Bar */}
                            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                                {distribution.map((item, i) => (
                                    <div
                                        key={item.proyectoId}
                                        style={{ width: `${(item.monto / stats.totalInvertido) * 100}%` }}
                                        className={cn(
                                            "h-full transition-all hover:opacity-80",
                                            i === 0 ? "bg-brand-500" :
                                                i === 1 ? "bg-earth-500" :
                                                    i === 2 ? "bg-emerald-500" : "bg-slate-400"
                                        )}
                                        title={`${item.nombre}: ${Math.round((item.monto / stats.totalInvertido) * 100)}%`}
                                    />
                                ))}
                            </div>
                            <div className="space-y-2">
                                {distribution.slice(0, 3).map((item, i) => (
                                    <div key={item.proyectoId} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                i === 0 ? "bg-brand-500" :
                                                    i === 1 ? "bg-earth-500" :
                                                        i === 2 ? "bg-emerald-500" : "bg-slate-400"
                                            )} />
                                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                                                {item.nombre}
                                            </span>
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {Math.round((item.monto / stats.totalInvertido) * 100)}%
                                        </span>
                                    </div>
                                ))}
                                {distribution.length > 3 && (
                                    <p className="text-xs text-slate-500 text-center font-bold">
                                        + {distribution.length - 3} proyectos más
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-xs text-slate-500 italic">No hay inversiones registradas</p>
                        </div>
                    )}
                </div>

                {/* Next Milestone Card */}
                {nextMilestone && (
                    <div className="mt-4 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 uppercase">
                                <Landmark className="w-3 h-3" />
                                Próximo Hito
                            </div>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                                {nextMilestone.porcentaje}% liberado
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {nextMilestone.titulo}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                            {nextMilestone.proyecto.nombre}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
