"use client";

import { X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMasterplanStore } from "@/lib/masterplan-store";

const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
    { key: "DISPONIBLE", label: "Disponible", color: "#10b981" },
    { key: "BLOQUEADO", label: "Bloqueado", color: "#f59e0b" },
    { key: "RESERVADO", label: "Reservado", color: "#f97316" },
    { key: "VENDIDO", label: "Vendido", color: "#ef4444" },
];

const etapas = [
    { id: "e1", nombre: "Etapa 1" },
    { id: "e2", nombre: "Etapa 2" },
];

const manzanas = [
    { id: "m1", nombre: "Mza A", etapaId: "e1" },
    { id: "m2", nombre: "Mza B", etapaId: "e1" },
    { id: "m3", nombre: "Mza C", etapaId: "e1" },
    { id: "m4", nombre: "Mza D", etapaId: "e2" },
    { id: "m5", nombre: "Mza E", etapaId: "e2" },
];

interface FiltersProps {
    onClose: () => void;
}

export default function MasterplanFilters({ onClose }: FiltersProps) {
    const { filters, setFilter, resetFilters } = useMasterplanStore();

    const activeCount = [
        filters.estado.length > 0,
        filters.etapaId !== null,
        filters.manzanaId !== null,
        filters.precioMin !== null,
        filters.precioMax !== null,
        filters.superficieMin !== null,
        filters.superficieMax !== null,
        filters.soloEsquina,
    ].filter(Boolean).length;

    const inputClass = "w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all";

    const filteredManzanas = filters.etapaId
        ? manzanas.filter((m) => m.etapaId === filters.etapaId)
        : manzanas;

    return (
        <div className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Filtros</h4>
                    {activeCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold">
                            {activeCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {activeCount > 0 && (
                        <button onClick={resetFilters} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Resetear">
                            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Estado */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Estado</label>
                    <div className="flex flex-wrap gap-1.5">
                        {STATUS_CONFIG.map((s) => {
                            const active = filters.estado.includes(s.key);
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => {
                                        const next = active
                                            ? filters.estado.filter((e) => e !== s.key)
                                            : [...filters.estado, s.key];
                                        setFilter("estado", next);
                                    }}
                                    className={cn(
                                        "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                        active ? "text-white shadow" : "text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    )}
                                    style={active ? { backgroundColor: s.color } : undefined}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Etapa */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Etapa</label>
                    <select
                        value={filters.etapaId || ""}
                        onChange={(e) => {
                            setFilter("etapaId", e.target.value || null);
                            setFilter("manzanaId", null); // reset manzana on etapa change
                        }}
                        className={inputClass}
                    >
                        <option value="">Todas las etapas</option>
                        {etapas.map((e) => (
                            <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Manzana */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Manzana</label>
                    <select
                        value={filters.manzanaId || ""}
                        onChange={(e) => setFilter("manzanaId", e.target.value || null)}
                        className={inputClass}
                    >
                        <option value="">Todas las manzanas</option>
                        {filteredManzanas.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Precio range */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Rango de precio (USD)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Min"
                            value={filters.precioMin ?? ""}
                            onChange={(e) => setFilter("precioMin", e.target.value ? parseFloat(e.target.value) : null)}
                            className={inputClass}
                        />
                        <span className="text-slate-400 text-xs">—</span>
                        <input
                            type="number"
                            placeholder="Max"
                            value={filters.precioMax ?? ""}
                            onChange={(e) => setFilter("precioMax", e.target.value ? parseFloat(e.target.value) : null)}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Superficie range */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Superficie (m²)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Min"
                            value={filters.superficieMin ?? ""}
                            onChange={(e) => setFilter("superficieMin", e.target.value ? parseFloat(e.target.value) : null)}
                            className={inputClass}
                        />
                        <span className="text-slate-400 text-xs">—</span>
                        <input
                            type="number"
                            placeholder="Max"
                            value={filters.superficieMax ?? ""}
                            onChange={(e) => setFilter("superficieMax", e.target.value ? parseFloat(e.target.value) : null)}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Solo esquina */}
                <div>
                    <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <input
                            type="checkbox"
                            checked={filters.soloEsquina}
                            onChange={(e) => setFilter("soloEsquina", e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                        />
                        <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Solo esquinas</p>
                            <p className="text-[10px] text-slate-400">Mostrar únicamente lotes en esquina</p>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
}
