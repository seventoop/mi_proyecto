"use client";

import { motion } from "framer-motion";
import { X, Trash2, ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { MasterplanUnit } from "@/lib/masterplan-store";

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

interface ComparatorProps {
    units: MasterplanUnit[];
    onClose: () => void;
    onRemove: (id: string) => void;
}

const fields: { key: string; label: string; format?: (u: MasterplanUnit) => string }[] = [
    { key: "tipo", label: "Tipo", format: (u) => u.tipo === "LOTE" ? "Lote" : "Departamento" },
    { key: "superficie", label: "Superficie", format: (u) => u.superficie ? `${u.superficie} m²` : "—" },
    { key: "frente", label: "Frente", format: (u) => u.frente ? `${u.frente} m` : "—" },
    { key: "fondo", label: "Fondo", format: (u) => u.fondo ? `${u.fondo} m` : "—" },
    { key: "precio", label: "Precio", format: (u) => u.precio ? formatCurrency(u.precio) : "—" },
    { key: "precioM2", label: "Precio/m²", format: (u) => u.precio && u.superficie ? formatCurrency(Math.round(u.precio / u.superficie)) : "—" },
    { key: "moneda", label: "Moneda", format: (u) => u.moneda || "—" },
    { key: "orientacion", label: "Orientación", format: (u) => u.orientacion || "—" },
    { key: "esquina", label: "Esquina", format: (u) => u.esEsquina ? "Sí ★" : "No" },
    { key: "etapa", label: "Etapa", format: (u) => u.etapaNombre || "—" },
    { key: "manzana", label: "Manzana", format: (u) => u.manzanaNombre || "—" },
    { key: "tour360", label: "Tour 360°", format: (u) => u.tour360Url ? "Disponible" : "—" },
];

export default function MasterplanComparator({ units, onClose, onRemove }: ComparatorProps) {
    if (units.length === 0) return null;

    // Find best values for highlighting
    const bestPrecio = Math.min(...units.filter((u) => u.precio).map((u) => u.precio!));
    const bestSuperficie = Math.max(...units.filter((u) => u.superficie).map((u) => u.superficie!));
    const bestPrecioM2 = Math.min(
        ...units.filter((u) => u.precio && u.superficie).map((u) => Math.round(u.precio! / u.superficie!))
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Comparar Unidades</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{units.length} unidad{units.length > 1 ? "es" : ""} seleccionada{units.length > 1 ? "s" : ""}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-5">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider w-28" />
                                {units.map((unit) => (
                                    <th key={unit.id} className="px-3 py-2 text-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg"
                                                style={{ backgroundColor: STATUS_COLORS[unit.estado] }}
                                            >
                                                {unit.numero.split("-")[1] || unit.numero}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-white">{unit.numero}</span>
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                style={{ backgroundColor: `${STATUS_COLORS[unit.estado]}15`, color: STATUS_COLORS[unit.estado] }}
                                            >
                                                {STATUS_LABELS[unit.estado]}
                                            </span>
                                            <button
                                                onClick={() => onRemove(unit.id)}
                                                className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors"
                                                title="Quitar de comparación"
                                            >
                                                <Trash2 className="w-3 h-3 text-rose-400" />
                                            </button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((field, fi) => (
                                <tr key={field.key} className={fi % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/20" : ""}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">{field.label}</td>
                                    {units.map((unit) => {
                                        const value = field.format ? field.format(unit) : "";
                                        // Highlight best values
                                        let isBest = false;
                                        if (field.key === "precio" && unit.precio === bestPrecio) isBest = true;
                                        if (field.key === "superficie" && unit.superficie === bestSuperficie) isBest = true;
                                        if (field.key === "precioM2" && unit.precio && unit.superficie && Math.round(unit.precio / unit.superficie) === bestPrecioM2) isBest = true;

                                        return (
                                            <td key={unit.id} className="px-3 py-2.5 text-center">
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    isBest ? "text-emerald-500 font-bold" : "text-slate-700 dark:text-slate-200",
                                                    value.includes("★") && "text-amber-500"
                                                )}>
                                                    {value}
                                                    {isBest && " ✓"}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <p className="text-xs text-slate-400">✓ indica el mejor valor para ese campo</p>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow"
                    >
                        Cerrar comparador
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
