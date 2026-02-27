"use client";

import { motion } from "framer-motion";
import { X, ExternalLink, History, Clock, User, MapPin, Maximize2, Bookmark } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { MasterplanUnit, useMasterplanStore } from "@/lib/masterplan-store";

const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#f59e0b",
    RESERVADO: "#f97316",
    VENDIDO: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADO: "Reservado",
    VENDIDO: "Vendido",
};

// Demo history
const demoHistory = [
    { date: "2025-01-15", user: "Juan Pérez", from: "DISPONIBLE", to: "RESERVADO", motivo: "Reserva cliente #142" },
    { date: "2024-12-22", user: "Sistema", from: "BLOQUEADO", to: "DISPONIBLE", motivo: "Liberación automática" },
    { date: "2024-12-18", user: "Admin", from: "DISPONIBLE", to: "BLOQUEADO", motivo: "Revisión de precios" },
];

interface SidePanelProps {
    unit: MasterplanUnit;
    modo: "admin" | "public";
    onClose: () => void;
}

import ReservaModal from "@/components/dashboard/reservas/reserva-modal";
import { useState } from "react";

export default function MasterplanSidePanel({ unit, modo, onClose }: SidePanelProps) {
    const { comparisonIds, toggleComparison } = useMasterplanStore();
    const isComparing = comparisonIds.includes(unit.id);
    const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);

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
                            <h3 className="font-bold text-slate-800 dark:text-white">{unit.numero}</h3>
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
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

                    {/* Details */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detalles</h4>
                        <div className="space-y-1.5">
                            {[
                                { label: "Tipo", value: unit.tipo === "LOTE" ? "Lote" : "Departamento" },
                                { label: "Frente", value: unit.frente ? `${unit.frente} m` : "—" },
                                { label: "Fondo", value: unit.fondo ? `${unit.fondo} m` : "—" },
                                { label: "Orientación", value: unit.orientacion || "—" },
                                { label: "Esquina", value: unit.esEsquina ? "Sí ★" : "No" },
                                { label: "Moneda", value: unit.moneda },
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

                    {/* Responsible */}
                    {unit.responsable && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                                <User className="w-4 h-4 text-brand-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Responsable</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-white">{unit.responsable}</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                        {unit.estado === "DISPONIBLE" && (
                            <button
                                onClick={() => setIsReservaModalOpen(true)}
                                className="w-full px-4 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all"
                            >
                                Reservar esta unidad
                            </button>
                        )}
                        {unit.tour360Url && (
                            <button className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Ver Tour 360°
                            </button>
                        )}
                        <button
                            onClick={() => toggleComparison(unit.id)}
                            className={cn(
                                "w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                                isComparing
                                    ? "bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            {isComparing ? "✓ En comparación" : "+ Agregar a comparación"}
                        </button>
                    </div>

                    {/* History (admin only) */}
                    {modo === "admin" && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <History className="w-3 h-3" />Historial de cambios
                            </h4>
                            <div className="space-y-2">
                                {demoHistory.map((entry, i) => (
                                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />{entry.date}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{entry.user}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                style={{ backgroundColor: `${STATUS_COLORS[entry.from]}15`, color: STATUS_COLORS[entry.from] }}>
                                                {entry.from}
                                            </span>
                                            <span className="text-slate-400 text-[10px]">→</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                style={{ backgroundColor: `${STATUS_COLORS[entry.to]}15`, color: STATUS_COLORS[entry.to] }}>
                                                {entry.to}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400">{entry.motivo}</p>
                                    </div>
                                ))}
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
                    // Could trigger a refresh here if needed, but the server action revalidates
                    // and store might need update or page reload. 
                    window.location.reload(); // Simple brute force update for now to reflect status change
                }}
            />
        </>
    );
}
