"use client";

import { useState, useEffect } from "react";
import {
    DollarSign, CheckCircle, XCircle, Clock, FileText,
    Search, Filter, ChevronLeft, ChevronRight, ExternalLink
} from "lucide-react";
import { getAllPayments, updatePaymentStatusAdmin } from "@/lib/actions/pagos";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default function AdminPagosPage() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState({ total: 0, page: 1, totalPages: 1 });
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [previewDoc, setPreviewDoc] = useState<string | null>(null);

    const fetchPagos = async () => {
        setLoading(true);
        const res = await getAllPayments(page, 10, statusFilter);
        if (res.success && res.data) {
            setPagos(res.data.pagos);
            setMetadata(res.data.metadata);
        }
        setLoading(false);
    };

    useEffect(() => {
        setPage(1);
        fetchPagos();
    }, [statusFilter]);

    useEffect(() => {
        fetchPagos();
    }, [page]);

    const handleStatusChange = async (id: string, status: "APROBADO" | "RECHAZADO") => {
        if (!confirm(`¿Confirmar ${status} este pago?`)) return;
        const res = await updatePaymentStatusAdmin(id, status);
        if (res.success) fetchPagos();
        else alert("Error al actualizar");
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminPagos} />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mt-1 px-4 py-2.5 bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded-xl text-xs font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                        <option value="ALL">TODOS LOS ESTADOS</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="APROBADO">APROBADO</option>
                        <option value="RECHAZADO">RECHAZADO</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/[0.06] text-xs uppercase text-slate-500 font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Concepto</th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Monto</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4" colSpan={6}><div className="h-4 bg-white/[0.02] rounded w-full border border-white/[0.06]" /></td>
                                    </tr>
                                ))
                            ) : pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                                        No hay pagos registrados.
                                    </td>
                                </tr>
                            ) : (
                                pagos.map((pago) => (
                                    <tr key={pago.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-[12px] font-black uppercase tracking-tight text-slate-900 dark:text-white">{pago.concepto || "Sin concepto"}</div>
                                            <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                                                {pago.proyecto?.nombre ? `PROYECTO: ${pago.proyecto.nombre}` :
                                                    pago.banner?.titulo ? `BANNER: ${pago.banner.titulo}` : "GENERAL"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{pago.usuario.nombre}</div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{pago.usuario.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-[12px] font-black uppercase tracking-widest text-emerald-500">
                                            {pago.moneda} {pago.monto.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black tracking-widest uppercase",
                                                pago.estado === "APROBADO" ? "bg-emerald-500/10 text-emerald-500" :
                                                    pago.estado === "RECHAZADO" ? "bg-rose-500/10 text-rose-500" :
                                                        "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {pago.estado === "APROBADO" && <CheckCircle className="w-3 h-3" />}
                                                {pago.estado === "RECHAZADO" && <XCircle className="w-3 h-3" />}
                                                {pago.estado === "PENDIENTE" && <Clock className="w-3 h-3" />}
                                                {pago.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">
                                            {new Date(pago.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            {pago.comprobanteUrl && (
                                                <button
                                                    onClick={() => setPreviewDoc(pago.comprobanteUrl)}
                                                    className="p-2 text-slate-400 border border-white/[0.06] hover:text-brand-500 hover:bg-brand-500/10 hover:border-brand-500/30 rounded-xl transition-all"
                                                    title="Ver Comprobante"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                            {pago.estado === "PENDIENTE" && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(pago.id, "APROBADO")}
                                                        className="p-2 text-emerald-500 border border-white/[0.06] hover:bg-emerald-500/10 hover:border-emerald-500/30 rounded-xl transition-all"
                                                        title="Aprobar"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(pago.id, "RECHAZADO")}
                                                        className="p-2 text-rose-500 border border-white/[0.06] hover:bg-rose-500/10 hover:border-rose-500/30 rounded-xl transition-all"
                                                        title="Rechazar"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                        PÁGINA {metadata.page} DE {metadata.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                            disabled={page === metadata.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
                <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-black/90 border-none">
                    <div className="w-full h-full flex items-center justify-center relative">
                        <button
                            onClick={() => setPreviewDoc(null)}
                            className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                        {previewDoc && (
                            <img src={previewDoc} alt="Comprobante" className="max-w-full max-h-full object-contain" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
