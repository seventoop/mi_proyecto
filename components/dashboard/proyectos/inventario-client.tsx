"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMasterplanStore, MasterplanUnit } from "@/lib/masterplan-store";
import { getProjectBlueprintData } from "@/lib/actions/unidades";
import { Search, Tag, X, Check } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDO: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDO: "Suspendido",
};

interface InventarioClientProps {
    proyectoId: string;
}

export default function InventarioClient({ proyectoId }: InventarioClientProps) {
    const { units, setUnits, updateUnitState } = useMasterplanStore();
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [filterEstado, setFilterEstado] = useState("");
    const [filterManzana, setFilterManzana] = useState("");
    const [filterEtapa, setFilterEtapa] = useState("");

    // Inline editing
    const [editingPrecio, setEditingPrecio] = useState<{ id: string; value: string } | null>(null);
    const [savingPrecio, setSavingPrecio] = useState<string | null>(null);
    const [savingEstado, setSavingEstado] = useState<string | null>(null);

    // Tags — persisted in localStorage per project
    const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({});
    const [editingTag, setEditingTag] = useState<{ id: string; value: string } | null>(null);

    // Load units if store is empty (e.g. user landed directly on inventory without MasterplanViewer running)
    useEffect(() => {
        if (units.length === 0) {
            setIsLoading(true);
            getProjectBlueprintData(proyectoId).then(res => {
                if (res.success && res.data) setUnits(res.data as any);
                setIsLoading(false);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proyectoId]);

    // Load tags from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`mp_tags_${proyectoId}`);
            if (saved) setTagsMap(JSON.parse(saved));
        } catch {}
    }, [proyectoId]);

    const saveTagsToStorage = useCallback((newMap: Record<string, string[]>) => {
        setTagsMap(newMap);
        try { localStorage.setItem(`mp_tags_${proyectoId}`, JSON.stringify(newMap)); } catch {}
    }, [proyectoId]);

    // Derive unique manzana / etapa options from loaded units
    const manzanas = useMemo(() => {
        const set = new Set<string>();
        units.forEach(u => {
            const n = (u as any).manzana?.nombre || u.manzanaNombre;
            if (n) set.add(n);
        });
        return Array.from(set).sort();
    }, [units]);

    const etapas = useMemo(() => {
        const set = new Set<string>();
        units.forEach(u => {
            const n = (u as any).manzana?.etapa?.nombre || u.etapaNombre;
            if (n) set.add(n);
        });
        return Array.from(set).sort();
    }, [units]);

    // Filtered + sorted units
    const filtered = useMemo(() => {
        return units.filter(u => {
            const manzana = (u as any).manzana?.nombre || u.manzanaNombre || "";
            const etapa = (u as any).manzana?.etapa?.nombre || u.etapaNombre || "";
            if (search) {
                const q = search.toLowerCase();
                if (!u.numero.toLowerCase().includes(q) && !manzana.toLowerCase().includes(q) && !etapa.toLowerCase().includes(q)) return false;
            }
            if (filterEstado && u.estado !== filterEstado) return false;
            if (filterManzana && manzana !== filterManzana) return false;
            if (filterEtapa && etapa !== filterEtapa) return false;
            return true;
        });
    }, [units, search, filterEstado, filterManzana, filterEtapa]);

    // Estado change — optimistic, with revert on failure; also syncs MasterplanViewer via store
    const handleEstadoChange = useCallback(async (unit: MasterplanUnit, nuevoEstado: string) => {
        if (nuevoEstado === unit.estado || savingEstado === unit.id) return;
        const prevEstado = unit.estado;
        setSavingEstado(unit.id);
        updateUnitState(unit.id, { estado: nuevoEstado as MasterplanUnit["estado"] });
        try {
            const res = await fetch(`/api/unidades/${unit.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado, previousEstado: prevEstado }),
            });
            if (!res.ok) updateUnitState(unit.id, { estado: prevEstado });
        } catch {
            updateUnitState(unit.id, { estado: prevEstado });
        } finally {
            setSavingEstado(null);
        }
    }, [savingEstado, updateUnitState]);

    // Precio save
    const handlePrecioSave = useCallback(async (unit: MasterplanUnit) => {
        if (!editingPrecio || editingPrecio.id !== unit.id) return;
        const raw = editingPrecio.value.replace(/[^0-9.]/g, "");
        const newPrecio = parseFloat(raw);
        if (isNaN(newPrecio) || newPrecio < 0) { setEditingPrecio(null); return; }
        setSavingPrecio(unit.id);
        updateUnitState(unit.id, { precio: newPrecio });
        try {
            await fetch(`/api/unidades/${unit.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ precio: newPrecio }),
            });
        } catch {}
        setSavingPrecio(null);
        setEditingPrecio(null);
    }, [editingPrecio, updateUnitState]);

    // Tags
    const addTag = useCallback((unitId: string, tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) { setEditingTag(null); return; }
        const current = tagsMap[unitId] || [];
        if (current.includes(trimmed)) { setEditingTag(null); return; }
        saveTagsToStorage({ ...tagsMap, [unitId]: [...current, trimmed] });
        setEditingTag(null);
    }, [tagsMap, saveTagsToStorage]);

    const removeTag = useCallback((unitId: string, tag: string) => {
        saveTagsToStorage({ ...tagsMap, [unitId]: (tagsMap[unitId] || []).filter(t => t !== tag) });
    }, [tagsMap, saveTagsToStorage]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (units.length === 0) {
        return (
            <p className="text-xs text-slate-400 italic text-center py-8">
                Cargando inventario... asegurate de estar en el paso Masterplan para que los datos se carguen.
            </p>
        );
    }

    const hasActiveFilter = search || filterEstado || filterManzana || filterEtapa;

    return (
        <div className="space-y-3">
            {/* ── Filter bar ── */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar lote, manzana, etapa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                </div>

                <select
                    value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value)}
                    className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-brand-500"
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>

                {manzanas.length > 1 && (
                    <select
                        value={filterManzana}
                        onChange={e => setFilterManzana(e.target.value)}
                        className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-brand-500"
                    >
                        <option value="">Todas las manzanas</option>
                        {manzanas.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                )}

                {etapas.length > 1 && (
                    <select
                        value={filterEtapa}
                        onChange={e => setFilterEtapa(e.target.value)}
                        className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-brand-500"
                    >
                        <option value="">Todas las etapas</option>
                        {etapas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                )}

                {hasActiveFilter && (
                    <button
                        onClick={() => { setSearch(""); setFilterEstado(""); setFilterManzana(""); setFilterEtapa(""); }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 hover:border-red-300 dark:text-slate-400 transition-colors"
                    >
                        <X className="w-3 h-3" />Limpiar
                    </button>
                )}

                <span className="ml-auto text-xs text-slate-400">
                    {filtered.length} de {units.length} lotes
                </span>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            {["Lote", "Tipo", "Etapa", "Manzana", "Superficie", "Precio", "Estado", "Etiquetas"].map(h => (
                                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map(unit => {
                            const manzana = (unit as any).manzana?.nombre || unit.manzanaNombre || "—";
                            const etapa = (unit as any).manzana?.etapa?.nombre || unit.etapaNombre || "—";
                            const tags = tagsMap[unit.id] || [];
                            const isEditingThisPrice = editingPrecio?.id === unit.id;

                            return (
                                <tr key={unit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                                        {unit.numero}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">
                                        {unit.tipo?.toLowerCase() || "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{etapa}</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{manzana}</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                        {unit.superficie ? `${unit.superficie} m²` : "—"}
                                    </td>

                                    {/* Precio — inline editable */}
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        {isEditingThisPrice ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-slate-400">$</span>
                                                <input
                                                    type="number"
                                                    value={editingPrecio.value}
                                                    onChange={e => setEditingPrecio({ id: unit.id, value: e.target.value })}
                                                    onBlur={() => handlePrecioSave(unit)}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") handlePrecioSave(unit);
                                                        if (e.key === "Escape") setEditingPrecio(null);
                                                    }}
                                                    autoFocus
                                                    className="w-24 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                                                />
                                                <button onClick={() => handlePrecioSave(unit)} className="text-brand-500 flex-shrink-0">
                                                    {savingPrecio === unit.id
                                                        ? <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                                                        : <Check className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingPrecio({ id: unit.id, value: String(unit.precio ?? "") })}
                                                className="text-xs font-semibold text-slate-700 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 transition-colors group-hover:underline decoration-dashed underline-offset-2"
                                            >
                                                {unit.precio
                                                    ? `$${unit.precio.toLocaleString()}`
                                                    : <span className="text-slate-400 font-normal italic text-xs">— editar —</span>}
                                            </button>
                                        )}
                                    </td>

                                    {/* Estado — dropdown, syncs with map */}
                                    <td className="px-4 py-2.5">
                                        <select
                                            value={unit.estado}
                                            onChange={e => handleEstadoChange(unit, e.target.value)}
                                            disabled={savingEstado === unit.id}
                                            className={cn(
                                                "text-xs font-bold uppercase rounded-lg px-2 py-1 border-2 cursor-pointer disabled:opacity-60 focus:outline-none transition-all"
                                            )}
                                            style={{
                                                borderColor: STATUS_COLORS[unit.estado] || "#94a3b8",
                                                color: STATUS_COLORS[unit.estado] || "#94a3b8",
                                                backgroundColor: `${STATUS_COLORS[unit.estado]}18`,
                                            }}
                                        >
                                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                                <option key={k} value={k} style={{ color: "inherit", backgroundColor: "white" }}>
                                                    {v}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Etiquetas */}
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap items-center gap-1 min-w-[80px]">
                                            {tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-medium"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => removeTag(unit.id, tag)}
                                                        className="ml-0.5 hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </span>
                                            ))}
                                            {editingTag?.id === unit.id ? (
                                                <input
                                                    type="text"
                                                    value={editingTag.value}
                                                    onChange={e => setEditingTag({ id: unit.id, value: e.target.value })}
                                                    onBlur={() => addTag(unit.id, editingTag.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") addTag(unit.id, editingTag.value);
                                                        if (e.key === "Escape") setEditingTag(null);
                                                    }}
                                                    autoFocus
                                                    placeholder="etiqueta..."
                                                    className="w-20 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setEditingTag({ id: unit.id, value: "" })}
                                                    className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-brand-500 hover:border-brand-500 text-xs transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Agregar etiqueta"
                                                >
                                                    <Tag className="w-2.5 h-2.5" />+
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400 italic">
                                    No hay lotes que coincidan con los filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Stats bar ── */}
            <div className="flex flex-wrap items-center gap-4 px-1">
                {Object.entries(STATUS_LABELS).map(([estado, label]) => {
                    const count = units.filter(u => u.estado === estado).length;
                    if (count === 0) return null;
                    return (
                        <div key={estado} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[estado] }} />
                            <span className="text-slate-500 dark:text-slate-400">{label}:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
