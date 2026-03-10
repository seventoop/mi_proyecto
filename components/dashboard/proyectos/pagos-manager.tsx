"use client";

import { useState } from "react";
import { 
    DollarSign, Clock, CreditCard, CheckCircle, XCircle, 
    TrendingUp, ArrowUpRight, Wallet, History, Search 
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Pago {
    id: string;
    monto: number | any;
    moneda: string;
    concepto?: string | null;
    estado: string;
    comprobanteUrl?: string | null;
    fechaPago: Date | string;
    usuario?: { nombre: string } | null;
    metodo?: string;
}

interface PagosManagerProps {
    proyectoId: string;
    pagos: Pago[];
    userRole: string;
}

export default function PagosManager({ proyectoId, pagos, userRole }: PagosManagerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("TODOS");

    const isAdmin = userRole === "ADMIN";
    
    // Stats calculation
    const total = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const cobrado = pagos.filter(p => p.estado === "APROBADO").reduce((s, p) => s + Number(p.monto), 0);
    const pendiente = pagos.filter(p => p.estado === "PENDIENTE").reduce((s, p) => s + Number(p.monto), 0);

    const filteredPagos = filter === "TODOS" 
        ? pagos 
        : pagos.filter(p => p.estado === filter);

    const handleUpdateStatus = async (pagoId: string, status: string) => {
        setLoading(true);
        try {
            // We use the existing pagos action if available, or a generic one
            const { updatePaymentStatusAdmin } = await import("@/lib/actions/pagos");
            const res = await updatePaymentStatusAdmin(pagoId, status as any);
            
            if (res.success) {
                toast.success(`Pago marcado como ${status}`);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (e: any) {
            toast.error("Error al actualizar pago");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Total Proyectado</p>
                        <Wallet className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{formatCurrency(total)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Suma de todos los registros</p>
                </div>

                <div className="glass-card p-5 border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Cobrado / Aprobado</p>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(cobrado)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <p className="text-[10px] text-emerald-500/70 font-bold">{total > 0 ? Math.round((cobrado/total)*100) : 0}% del total</p>
                    </div>
                </div>

                <div className="glass-card p-5 border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pendiente Revisión</p>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black text-amber-400">{formatCurrency(pendiente)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{pagos.filter(p => p.estado === "PENDIENTE").length} pagos esperando acción</p>
                </div>
            </div>

            {/* List and Actions */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-brand-500" />
                        <h3 className="font-bold text-white">Historial de Transacciones</h3>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                        {["TODOS", "PENDIENTE", "APROBADO", "RECHAZADO"].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                    filter === f 
                                        ? "bg-brand-500 text-white shadow-glow" 
                                        : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {filteredPagos.length === 0 ? (
                        <div className="p-20 text-center">
                            <DollarSign className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                            <p className="text-slate-500 font-medium">No se encontraron pagos con este filtro.</p>
                        </div>
                    ) : (
                        filteredPagos.map((pago) => (
                            <div key={pago.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
                                        pago.estado === "APROBADO" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                        pago.estado === "RECHAZADO" ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                        "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                    )}>
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-black text-white">{formatCurrency(Number(pago.monto))}</p>
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded italic">{pago.moneda}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span className="font-medium text-slate-400">{pago.concepto || pago.metodo || "Transferencia"}</span>
                                            <span>•</span>
                                            <span>{new Date(pago.fechaPago).toLocaleDateString()}</span>
                                            {pago.usuario && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-brand-400/70 font-bold uppercase text-[9px]">{pago.usuario.nombre}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                    {pago.comprobanteUrl && (
                                        <a 
                                            href={pago.comprobanteUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-brand-400 hover:bg-slate-700 transition-all text-xs font-bold flex items-center gap-2"
                                        >
                                            <ArrowUpRight className="w-3.5 h-3.5" /> COMPROBANTE
                                        </a>
                                    )}

                                    <div className="flex items-center gap-2">
                                        {pago.estado === "PENDIENTE" && isAdmin ? (
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => handleUpdateStatus(pago.id, "RECHAZADO")}
                                                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(pago.id, "APROBADO")}
                                                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                                                >
                                                    APROBAR
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                                                pago.estado === "APROBADO" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                pago.estado === "RECHAZADO" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {pago.estado}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
