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
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Pagos</h1>
                    <p className="text-slate-500 text-sm">Conciliación de pagos de proyectos y publicidad.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="APROBADO">Aprobado</option>
                        <option value="RECHAZADO">Rechazado</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-3">Concepto</th>
                                <th className="px-6 py-3">Usuario</th>
                                <th className="px-6 py-3">Monto</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4" colSpan={6}><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                                        No hay pagos registrados.
                                    </td>
                                </tr>
                            ) : (
                                pagos.map((pago) => (
                                    <tr key={pago.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 dark:text-white">{pago.concepto || "Sin concepto"}</div>
                                            <div className="text-xs text-slate-500">
                                                {pago.proyecto?.nombre ? `Proyecto: ${pago.proyecto.nombre}` :
                                                    pago.banner?.titulo ? `Banner: ${pago.banner.titulo}` : "General"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900 dark:text-white">{pago.usuario.nombre}</div>
                                            <div className="text-xs text-slate-500">{pago.usuario.email}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                            {pago.moneda} {pago.monto.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold",
                                                pago.estado === "APROBADO" ? "bg-emerald-100 text-emerald-600" :
                                                    pago.estado === "RECHAZADO" ? "bg-rose-100 text-rose-600" :
                                                        "bg-amber-100 text-amber-600"
                                            )}>
                                                {pago.estado === "APROBADO" && <CheckCircle className="w-3 h-3" />}
                                                {pago.estado === "RECHAZADO" && <XCircle className="w-3 h-3" />}
                                                {pago.estado === "PENDIENTE" && <Clock className="w-3 h-3" />}
                                                {pago.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(pago.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            {pago.comprobanteUrl && (
                                                <button
                                                    onClick={() => setPreviewDoc(pago.comprobanteUrl)}
                                                    className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-brand-50 rounded"
                                                    title="Ver Comprobante"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                            {pago.estado === "PENDIENTE" && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(pago.id, "APROBADO")}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                                        title="Aprobar"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(pago.id, "RECHAZADO")}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
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
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        Página {metadata.page} de {metadata.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={page === metadata.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
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
