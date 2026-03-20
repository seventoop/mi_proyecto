import { Building2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProjectRankingRow {
    id: string;
    nombre: string;
    leads: number;
    reservasActivas: number;
    unidadesDisponibles: number;
    unidadesVendidas: number;
    unidadesTotal: number;
}

interface Props {
    rows: ProjectRankingRow[];
}

export function ProjectsRankingTable({ rows }: Props) {
    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-white/10 mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-white/30">Sin proyectos para mostrar</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                        <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 pb-3 pr-4">#</th>
                        <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 pb-3 pr-4">Proyecto</th>
                        <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 pb-3 pr-4">Leads</th>
                        <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 pb-3 pr-4">Reservas</th>
                        <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 pb-3 pr-4">Disponibles</th>
                        <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 pb-3">Vendidas</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.04]">
                    {rows.map((row, idx) => {
                        const pctVendidas = row.unidadesTotal > 0
                            ? Math.round((row.unidadesVendidas / row.unidadesTotal) * 100)
                            : 0;

                        return (
                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 pr-4">
                                    <span className={cn(
                                        "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black",
                                        idx === 0 ? "bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400" :
                                        idx === 1 ? "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/60" :
                                        idx === 2 ? "bg-amber-500/10 text-amber-600 dark:text-amber-500/80" :
                                                    "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/30"
                                    )}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                                            <Building2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-500" />
                                        </div>
                                        <span className="font-semibold text-slate-900 dark:text-white/90 truncate max-w-[180px]">{row.nombre}</span>
                                    </div>
                                </td>
                                <td className="py-3 pr-4 text-right">
                                    <span className="font-bold text-slate-900 dark:text-white/80">{row.leads}</span>
                                </td>
                                <td className="py-3 pr-4 text-right">
                                    <span className={cn(
                                        "font-bold",
                                        row.reservasActivas > 0 ? "text-amber-500 dark:text-amber-400" : "text-slate-400 dark:text-white/30"
                                    )}>
                                        {row.reservasActivas}
                                    </span>
                                </td>
                                <td className="py-3 pr-4 text-right">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.unidadesDisponibles}</span>
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="font-bold text-slate-900 dark:text-white/80">{row.unidadesVendidas}</span>
                                        {pctVendidas > 0 && (
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">({pctVendidas}%)</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
