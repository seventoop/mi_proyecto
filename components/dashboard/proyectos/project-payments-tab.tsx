"use client";

import { useState } from "react";
import { DollarSign, Upload, CheckCircle, XCircle, Clock, CreditCard, Image as ImageIcon } from "lucide-react";
import { createPayment, updatePaymentStatusAdmin } from "@/lib/actions/pagos";
import { cn, formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface ProjectPaymentsTabProps {
    proyectoId: string;
    pagos: any[];
    userRole?: string;
}

export default function ProjectPaymentsTab({ proyectoId, pagos, userRole = "DESARROLLADOR" }: ProjectPaymentsTabProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);

    // Form state
    const [monto, setMonto] = useState("");
    const [metodo, setMetodo] = useState("TRANSFERENCIA");
    const [comprobanteUrl, setComprobanteUrl] = useState("");

    const handleUploadPayment = async () => {
        if (!monto || !comprobanteUrl) { toast.error("Completa todos los campos"); return; }

        const usuarioId = (session?.user as any)?.id;
        if (!usuarioId) { toast.error("Debes iniciar sesión"); return; }

        setLoading(true);
        const res = await createPayment({
            proyectoId,
            usuarioId,
            monto: parseFloat(monto),
            comprobanteUrl,
            metodo
        });

        if (res.success) {
            setMonto("");
            setComprobanteUrl("");
            toast.success("Pago registrado correctamente. Esperando verificación.");
            router.refresh();
        } else {
            toast.error("Error al registrar pago: " + (res.error || "Desconocido"));
        }
        setLoading(false);
    };

    const handleVerify = async (pagoId: string, status: "APROBADO" | "RECHAZADO") => {
        if (!confirm(`¿Confirmas ${status} el pago?`)) return;
        await updatePaymentStatusAdmin(pagoId, status);
        router.refresh();
    };

    const isAdmin = userRole === "ADMIN";

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Form (User) */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-brand-500" /> Registrar Nuevo Pago
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Monto (USD)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Método</label>
                                <select
                                    value={metodo}
                                    onChange={(e) => setMetodo(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                >
                                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                    <option value="USDT">USDT / Cripto</option>
                                    <option value="CASH">Efectivo</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Comprobante URL</label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={comprobanteUrl}
                                        onChange={(e) => setComprobanteUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Sube el comprobante a un servicio de almacenamiento y pega el link.</p>
                            </div>

                            <button
                                onClick={handleUploadPayment}
                                disabled={loading || !monto || !comprobanteUrl}
                                className="w-full py-2.5 rounded-xl gradient-brand text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? "Registrando..." : "Registrar Pago"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" /> Historial de Pagos
                    </h3>

                    {pagos.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                            No hay pagos registrados para este proyecto.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pagos.map((pago: any) => (
                                <div key={pago.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                                            pago.estado === "APROBADO" ? "bg-emerald-500/10 text-emerald-500" :
                                                pago.estado === "RECHAZADO" ? "bg-rose-500/10 text-rose-500" :
                                                    "bg-amber-500/10 text-amber-500"
                                        )}>
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white text-lg">{formatCurrency(pago.monto)}</p>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>{pago.metodo}</span>
                                                <span>•</span>
                                                <a href={pago.comprobanteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-500 hover:underline">
                                                    <ImageIcon className="w-3 h-3" /> Comprobante
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        {pago.estado === "PENDIENTE" && isAdmin ? (
                                            <>
                                                <button onClick={() => handleVerify(pago.id, "RECHAZADO")}
                                                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 transition-colors" title="Rechazar">
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleVerify(pago.id, "APROBADO")}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shadow-md transition-all flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4" /> Aprobar
                                                </button>
                                            </>
                                        ) : (
                                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase",
                                                pago.estado === "APROBADO" ? "bg-emerald-500/10 text-emerald-600" :
                                                    pago.estado === "RECHAZADO" ? "bg-rose-500/10 text-rose-600" :
                                                        "bg-amber-500/10 text-amber-600"
                                            )}>
                                                {pago.estado}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
