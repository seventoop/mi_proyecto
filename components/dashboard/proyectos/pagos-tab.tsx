"use client";

import { DollarSign, Clock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface PagoItem {
    id: string;
    concepto?: string | null;
    monto: number | string;
    moneda?: string;
    estado: string;
    fechaPago: string | Date;
    usuario?: { nombre: string } | null;
    tipo?: string | null;
}

interface PagosTabProps {
    pagos: PagoItem[];
    userRole: string;
}

export default function PagosTab({ pagos, userRole }: PagosTabProps) {
    const total = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const cobrado = pagos.filter(p => p.estado === "APROBADO").reduce((s, p) => s + Number(p.monto), 0);
    const pendiente = pagos.filter(p => p.estado === "PENDIENTE").reduce((s, p) => s + Number(p.monto), 0);

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Total proyectado", value: formatCurrency(total), color: "text-slate-700 dark:text-white" },
                    { label: "Cobrado", value: formatCurrency(cobrado), color: "text-emerald-500" },
                    { label: "Pendiente", value: formatCurrency(pendiente), color: "text-amber-500" },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4">
                        <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Historial de Pagos</h3>
                </div>
                {pagos.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p>No hay pagos registrados aún.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    {["Concepto", "Monto", "Estado", "Fecha", "Usuario"].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {pagos.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{p.concepto || p.tipo || "—"}</td>
                                        <td className="px-4 py-3 font-bold">{formatCurrency(Number(p.monto))} {p.moneda || "USD"}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                                                p.estado === "APROBADO" ? "bg-emerald-500/10 text-emerald-500" :
                                                    p.estado === "RECHAZADO" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                                            )}>{p.estado}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.fechaPago).toLocaleDateString("es-AR")}</td>
                                        <td className="px-4 py-3 text-slate-500">{p.usuario?.nombre || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
