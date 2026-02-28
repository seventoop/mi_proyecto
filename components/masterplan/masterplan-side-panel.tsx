"use client";

import { motion } from "framer-motion";
import { X, ExternalLink, History, Clock, User, MapPin, Maximize2, Bookmark, FileText } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { MasterplanUnit, useMasterplanStore } from "@/lib/masterplan-store";
import { useState, useEffect } from "react";
import ReservaModal from "@/components/dashboard/reservas/reserva-modal";
import { generateUnitPDF } from "@/lib/export-utils";
import { getUnidadHistorial } from "@/lib/actions/unidades";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDA: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDA: "Suspendida",
};

interface SidePanelProps {
    unit: MasterplanUnit;
    modo: "admin" | "public";
    onClose: () => void;
}

export default function MasterplanSidePanel({ unit, modo, onClose }: SidePanelProps) {
    const { comparisonIds, toggleComparison } = useMasterplanStore();
    const isComparing = comparisonIds.includes(unit.id);
    const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);
    const [historial, setHistorial] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    useEffect(() => {
        if (modo === "admin" && unit.id) {
            const fetchHistorial = async () => {
                setLoadingHistorial(true);
                const res = await getUnidadHistorial(unit.id);
                if (res.success && res.data) {
                    setHistorial(res.data);
                }
                setLoadingHistorial(false);
            };
            fetchHistorial();
        }
    }, [unit.id, modo]);

    return (
        <>
            <motion.div
                initial={{ x: 360, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 360, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="absolute top-0 right-0 bottom-0 w-[340px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-700 z-30 flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                            style={{ backgroundColor: STATUS_COLORS[unit.estado] }}
                        >
                            {unit.numero.split("-")[1] || unit.numero}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Lote {unit.numero}</h3>
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                style={{ backgroundColor: `${STATUS_COLORS[unit.estado]}15`, color: STATUS_COLORS[unit.estado] }}
                            >
                                {STATUS_LABELS[unit.estado]}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { label: "Superficie", value: unit.superficie ? `${unit.superficie} m²` : "—", icon: Maximize2 },
                            { label: "Precio", value: unit.precio ? formatCurrency(unit.precio) : "—", icon: Bookmark },
                            { label: "Etapa", value: unit.etapaNombre, icon: MapPin },
                            { label: "Manzana", value: unit.manzanaNombre, icon: MapPin },
                        ].map((s) => (
                            <div key={s.label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <s.icon className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400">{s.label}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-700 dark:text-white">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        {unit.estado === "DISPONIBLE" && (
                            <button
                                onClick={() => setIsReservaModalOpen(true)}
                                className="col-span-2 px-4 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all"
                            >
                                Reservar unidad
                            </button>
                        )}
                        <button
                            onClick={() => generateUnitPDF(unit)}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Ficha PDF
                        </button>
                        <button
                            onClick={() => toggleComparison(unit.id)}
                            className={cn(
                                "px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2",
                                isComparing
                                    ? "bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            {isComparing ? "✓ Comparando" : "+ Comparar"}
                        </button>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detalles Técnicos</h4>
                        <div className="space-y-1.5">
                            {[
                                { label: "Tipo", value: unit.tipo },
                                { label: "Frente", value: unit.frente ? `${unit.frente} m` : "—" },
                                { label: "Fondo", value: unit.fondo ? `${unit.fondo} m` : "—" },
                                { label: "Orientación", value: unit.orientacion || "—" },
                                { label: "Esquina", value: unit.esEsquina ? "Sí ★" : "No" },
                                { label: "ID Técnico", value: unit.id.slice(-8).toUpperCase() },
                            ].map((d) => (
                                <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-400">{d.label}</span>
                                    <span className={cn("text-xs font-medium text-slate-700 dark:text-slate-200", d.value.includes("★") && "text-amber-500")}>
                                        {d.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* History (admin only) */}
                    {modo === "admin" && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <History className="w-3 h-3" />Historial Real
                            </h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {loadingHistorial ? (
                                    <div className="flex flex-col items-center py-8 gap-2">
                                        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[10px] text-slate-500">Cargando eventos...</p>
                                    </div>
                                ) : historial.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 text-center py-4 italic">No hay cambios registrados todavía.</p>
                                ) : (
                                    historial.map((entry, i) => (
                                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                                                </span>
                                                <span className="text-[10px] text-brand-500 font-medium">{entry.usuario?.nombre || "Sistema"}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                                    style={{ backgroundColor: `${STATUS_COLORS[entry.anterior]}10`, color: STATUS_COLORS[entry.anterior] }}>
                                                    {entry.anterior}
                                                </span>
                                                <span className="text-slate-400 text-[10px]">→</span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                                    style={{ backgroundColor: `${STATUS_COLORS[entry.nuevo]}10`, color: STATUS_COLORS[entry.nuevo] }}>
                                                    {entry.nuevo}
                                                </span>
                                            </div>
                                            {entry.motivo && <p className="text-[10px] text-slate-500 leading-tight">{entry.motivo}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            <ReservaModal
                isOpen={isReservaModalOpen}
                onClose={() => setIsReservaModalOpen(false)}
                unidad={{
                    id: unit.id,
                    numero: unit.numero,
                    precio: unit.precio,
                    moneda: unit.moneda
                }}
                onSuccess={() => {
                    setIsReservaModalOpen(false);
                }}
            />
        </>
    );
}
