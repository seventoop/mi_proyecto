"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Movimiento {
    id: string;
    fecha: Date;
    tipo: string;
    proyecto: string;
    monto: number;
    estado: string;
}

interface MovementsTableProps {
    movimientos: Movimiento[];
}

export default function InvestorMovementsTable({ movimientos }: MovementsTableProps) {
    return (
        <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historial de Movimientos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Registro detallado de inversiones y pagos</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-white/[0.02] text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Proyecto</th>
                            <th className="px-6 py-4">Monto</th>
                            <th className="px-6 py-4">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {movimientos.length > 0 ? (
                            movimientos.map((mov) => (
                                <tr key={mov.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {format(mov.fecha, "dd MMM, yyyy", { locale: es })}
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    {format(mov.fecha, "HH:mm 'hs'")}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {mov.tipo === "Inversión" ? (
                                                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <ArrowDownLeft className="w-4 h-4 text-brand-500" />
                                            )}
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {mov.tipo}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {mov.proyecto}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "text-sm font-black",
                                            mov.tipo === "Inversión" ? "text-slate-900 dark:text-white" : "text-brand-500"
                                        )}>
                                            ${mov.monto.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black w-fit uppercase tracking-tighter",
                                            mov.estado === "ESCROW" || mov.estado === "APROBADO" || mov.estado === "RELEASED"
                                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                                : mov.estado === "PENDIENTE" || mov.estado === "PENDING"
                                                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                                    : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                        )}>
                                            {mov.estado === "ESCROW" || mov.estado === "RELEASED" || mov.estado === "APROBADO" ? (
                                                <CheckCircle2 className="w-3 h-3" />
                                            ) : (
                                                <AlertCircle className="w-3 h-3" />
                                            )}
                                            {mov.estado}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                    No se registran movimientos financieros aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
