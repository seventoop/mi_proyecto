"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CreditCard, CalendarClock, XCircle, ArrowRightCircle,
    FileDown, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservaActionsProps {
    reservaId: string;
    estado: string;
    estadoPago: string;
    onAction: (action: string, data?: any) => void;
}

export default function ReservaActions({ reservaId, estado, estadoPago, onAction }: ReservaActionsProps) {
    const [showExtender, setShowExtender] = useState(false);
    const [showCancelar, setShowCancelar] = useState(false);
    const [nuevaFecha, setNuevaFecha] = useState("");
    const [motivoCancelacion, setMotivoCancelacion] = useState("");
    const [montoSenaInput, setMontoSenaInput] = useState("");
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (action: string, data?: any) => {
        setLoading(action);
        try {
            const res = await fetch(`/api/reservas/${reservaId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...data }),
            });
            if (res.ok) {
                onAction(action, data);
                setShowExtender(false);
                setShowCancelar(false);
            } else {
                const err = await res.json();
                alert(err.error || "Error al ejecutar la acción");
            }
        } catch {
            alert("Error de conexión");
        } finally {
            setLoading(null);
        }
    };

    const handleDownloadPDF = async () => {
        setLoading("pdf");
        try {
            const res = await fetch(`/api/reservas/${reservaId}/documento`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `reserva-${reservaId.slice(-8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch {
            alert("Error al descargar el documento");
        } finally {
            setLoading(null);
        }
    };

    if (estado !== "ACTIVA") {
        return (
            <div className="space-y-3">
                <button
                    onClick={handleDownloadPDF}
                    disabled={loading === "pdf"}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    {loading === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    Descargar documento
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Register Payment */}
            {estadoPago === "PENDIENTE" && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Registrar pago de seña
                    </h4>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                            <input
                                type="number"
                                value={montoSenaInput}
                                onChange={(e) => setMontoSenaInput(e.target.value)}
                                placeholder="Monto"
                                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            />
                        </div>
                        <button
                            onClick={() => handleAction("registrarPago", { montoSena: parseFloat(montoSenaInput) || undefined })}
                            disabled={loading === "registrarPago"}
                            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                            {loading === "registrarPago" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
                        </button>
                    </div>
                </div>
            )}

            {/* Extend */}
            <button
                onClick={() => setShowExtender(!showExtender)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-500/30 text-sm font-semibold text-brand-500 hover:bg-brand-500/5 transition-colors"
            >
                <CalendarClock className="w-4 h-4" />
                Extender vencimiento
            </button>
            <AnimatePresence>
                {showExtender && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                            <input
                                type="datetime-local"
                                value={nuevaFecha}
                                onChange={(e) => setNuevaFecha(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                            />
                            <button
                                onClick={() => handleAction("extender", { nuevaFechaVencimiento: nuevaFecha })}
                                disabled={!nuevaFecha || loading === "extender"}
                                className="w-full px-4 py-2 rounded-lg gradient-brand text-white text-sm font-semibold disabled:opacity-50 transition-all"
                            >
                                {loading === "extender" ? "Extendiendo..." : "Confirmar nueva fecha"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cancel */}
            <button
                onClick={() => setShowCancelar(!showCancelar)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 text-sm font-semibold text-rose-500 hover:bg-rose-500/5 transition-colors"
            >
                <XCircle className="w-4 h-4" />
                Cancelar reserva
            </button>
            <AnimatePresence>
                {showCancelar && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-rose-500/5 rounded-xl space-y-3">
                            <textarea
                                value={motivoCancelacion}
                                onChange={(e) => setMotivoCancelacion(e.target.value)}
                                placeholder="Motivo de cancelación..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-rose-500/20 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                            />
                            <button
                                onClick={() => handleAction("cancelar", { motivo: motivoCancelacion })}
                                disabled={loading === "cancelar"}
                                className="w-full px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors"
                            >
                                {loading === "cancelar" ? "Cancelando..." : "Confirmar cancelación"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Convert to sale */}
            <button
                onClick={() => {
                    if (confirm("¿Confirmar conversión a venta? La unidad cambiará a estado VENDIDO.")) {
                        handleAction("convertir");
                    }
                }}
                disabled={loading === "convertir"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-brand text-white text-sm font-bold shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50"
            >
                {loading === "convertir" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightCircle className="w-4 h-4" />}
                Convertir a venta
            </button>

            {/* Download PDF */}
            <button
                onClick={handleDownloadPDF}
                disabled={loading === "pdf"}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
                {loading === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Descargar documento de reserva
            </button>
        </div>
    );
}
