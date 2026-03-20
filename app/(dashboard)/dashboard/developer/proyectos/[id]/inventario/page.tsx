"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft, Search, Filter, Download, Upload, Plus, Edit3,
    History, MoreHorizontal, ChevronDown, X, ArrowUpDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
const UnitEditorModal = dynamic(() => import("@/components/dashboard/unit-editor-modal"), {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="w-10 h-10 border-4 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" /></div>
});

// Types
interface Unidad {
    id: string;
    numero: string;
    tipo: string;
    etapa: string;
    etapaId: string;
    manzana: string;
    manzanaId: string;
    superficie: number | null;
    frente: number | null;
    fondo: number | null;
    esEsquina: boolean;
    precio: number | null;
    moneda: string;
    estado: string;
    responsable: string | null;
}

// Demo data
const demoUnidades: Unidad[] = [
    { id: "u1", numero: "A-01", tipo: "LOTE", etapa: "Etapa 1", etapaId: "e1", manzana: "Mza A", manzanaId: "m1", superficie: 450, frente: 15, fondo: 30, esEsquina: true, precio: 45000, moneda: "USD", estado: "DISPONIBLE", responsable: null },
    { id: "u2", numero: "A-02", tipo: "LOTE", etapa: "Etapa 1", etapaId: "e1", manzana: "Mza A", manzanaId: "m1", superficie: 500, frente: 20, fondo: 25, esEsquina: false, precio: 52000, moneda: "USD", estado: "RESERVADO", responsable: "Juan Pérez" },
    { id: "u3", numero: "A-03", tipo: "LOTE", etapa: "Etapa 1", etapaId: "e1", manzana: "Mza A", manzanaId: "m1", superficie: 420, frente: 14, fondo: 30, esEsquina: false, precio: 38000, moneda: "USD", estado: "VENDIDO", responsable: "María López" },
    { id: "u4", numero: "B-01", tipo: "LOTE", etapa: "Etapa 1", etapaId: "e1", manzana: "Mza B", manzanaId: "m2", superficie: 480, frente: 16, fondo: 30, esEsquina: true, precio: 42000, moneda: "USD", estado: "DISPONIBLE", responsable: null },
    { id: "u5", numero: "B-02", tipo: "LOTE", etapa: "Etapa 1", etapaId: "e1", manzana: "Mza B", manzanaId: "m2", superficie: 510, frente: 17, fondo: 30, esEsquina: false, precio: 55000, moneda: "USD", estado: "DISPONIBLE", responsable: null },
    { id: "u6", numero: "C-01", tipo: "LOTE", etapa: "Etapa 1", etapaId: "e1", manzana: "Mza C", manzanaId: "m3", superficie: 600, frente: 20, fondo: 30, esEsquina: true, precio: 65000, moneda: "USD", estado: "DISPONIBLE", responsable: null },
    { id: "u7", numero: "D-01", tipo: "LOTE", etapa: "Etapa 2", etapaId: "e2", manzana: "Mza D", manzanaId: "m4", superficie: 550, frente: 18, fondo: 30, esEsquina: false, precio: 48000, moneda: "USD", estado: "BLOQUEADO", responsable: null },
    { id: "u8", numero: "D-02", tipo: "LOTE", etapa: "Etapa 2", etapaId: "e2", manzana: "Mza D", manzanaId: "m4", superficie: 470, frente: 15, fondo: 31, esEsquina: false, precio: 41000, moneda: "USD", estado: "DISPONIBLE", responsable: null },
    { id: "u9", numero: "E-01", tipo: "LOTE", etapa: "Etapa 2", etapaId: "e2", manzana: "Mza E", manzanaId: "m5", superficie: 530, frente: 18, fondo: 29, esEsquina: true, precio: 58000, moneda: "USD", estado: "RESERVADO", responsable: "Carlos Díaz" },
    { id: "u10", numero: "F-01", tipo: "LOTE", etapa: "Etapa 3", etapaId: "e3", manzana: "Mza F", manzanaId: "m6", superficie: 700, frente: 20, fondo: 35, esEsquina: true, precio: 72000, moneda: "USD", estado: "DISPONIBLE", responsable: null },
];

const estadoBadge: Record<string, { label: string; class: string }> = {
    DISPONIBLE: { label: "Disponible", class: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" },
    RESERVADO: { label: "Reservado", class: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20" },
    VENDIDO: { label: "Vendido", class: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20" },
    BLOQUEADO: { label: "Bloqueado", class: "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20" },
};

const etapas = ["Etapa 1", "Etapa 2", "Etapa 3"];
const manzanas = ["Mza A", "Mza B", "Mza C", "Mza D", "Mza E", "Mza F"];

export default function InventarioPage({ params }: { params: { id: string } }) {
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [filterEstado, setFilterEstado] = useState<string | null>(null);
    const [filterEtapa, setFilterEtapa] = useState<string | null>(null);
    const [filterManzana, setFilterManzana] = useState<string | null>(null);
    const [precioMin, setPrecioMin] = useState("");
    const [precioMax, setPrecioMax] = useState("");
    const [superficieMin, setSuperficieMin] = useState("");
    const [superficieMax, setSuperficieMax] = useState("");
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    // Modal state
    const [editingUnit, setEditingUnit] = useState<Unidad | null>(null);
    const [showNewUnit, setShowNewUnit] = useState(false);
    const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
    const [showStatusChange, setShowStatusChange] = useState<string | null>(null);

    // Filter
    let filtered = demoUnidades.filter((u) => {
        if (search && !u.numero.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterEstado && u.estado !== filterEstado) return false;
        if (filterEtapa && u.etapa !== filterEtapa) return false;
        if (filterManzana && u.manzana !== filterManzana) return false;
        if (precioMin && (u.precio || 0) < parseFloat(precioMin)) return false;
        if (precioMax && (u.precio || 0) > parseFloat(precioMax)) return false;
        if (superficieMin && (u.superficie || 0) < parseFloat(superficieMin)) return false;
        if (superficieMax && (u.superficie || 0) > parseFloat(superficieMax)) return false;
        return true;
    });

    // Sort
    if (sortCol) {
        filtered = [...filtered].sort((a: any, b: any) => {
            const va = a[sortCol!] ?? 0;
            const vb = b[sortCol!] ?? 0;
            if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortDir === "asc" ? va - vb : vb - va;
        });
    }

    const handleSort = (col: string) => {
        if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortCol(col); setSortDir("asc"); }
    };

    const activeFilters = [filterEstado, filterEtapa, filterManzana, precioMin, precioMax, superficieMin, superficieMax].filter(Boolean).length;

    const stats = {
        total: demoUnidades.length,
        disponibles: demoUnidades.filter((u) => u.estado === "DISPONIBLE").length,
        reservadas: demoUnidades.filter((u) => u.estado === "RESERVADO").length,
        vendidas: demoUnidades.filter((u) => u.estado === "VENDIDO").length,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Breadcrumb */}
            <div>
                <Link href={`/dashboard/proyectos/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Proyecto
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestión de Inventario</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {filtered.length} unidades encontradas de {demoUnidades.length} totales
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-brand-500/30 flex items-center gap-2 transition-all">
                        <Download className="w-4 h-4" />Exportar
                    </button>
                    <button className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-brand-500/30 flex items-center gap-2 transition-all">
                        <Upload className="w-4 h-4" />Importar
                    </button>
                    <button
                        onClick={() => setShowNewUnit(true)}
                        className="px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold shadow-glow flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />Nueva Unidad
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: stats.total, color: "text-slate-700 dark:text-white", bg: "from-slate-500/10 to-slate-600/5" },
                    { label: "Disponibles", value: stats.disponibles, color: "text-emerald-500", bg: "from-emerald-500/10 to-emerald-600/5" },
                    { label: "Reservadas", value: stats.reservadas, color: "text-amber-500", bg: "from-amber-500/10 to-amber-600/5" },
                    { label: "Vendidas", value: stats.vendidas, color: "text-rose-500", bg: "from-rose-500/10 to-rose-600/5" },
                ].map((s) => (
                    <div key={s.label} className={`p-4 rounded-xl bg-gradient-to-br ${s.bg} border border-slate-200/50 dark:border-slate-700/50`}>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Buscar por número..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all" />
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                    className={cn("px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2",
                        activeFilters > 0 ? "bg-brand-500/10 border-brand-500/30 text-brand-400" : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    )}>
                    <Filter className="w-4 h-4" />Filtros
                    {activeFilters > 0 && (
                        <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">{activeFilters}</span>
                    )}
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="glass-card p-5 animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filtros Avanzados</h3>
                        {activeFilters > 0 && (
                            <button onClick={() => { setFilterEstado(null); setFilterEtapa(null); setFilterManzana(null); setPrecioMin(""); setPrecioMax(""); setSuperficieMin(""); setSuperficieMax(""); }}
                                className="text-xs text-brand-400 hover:text-brand-300 font-medium">Limpiar todos</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Estado filter */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Estado</label>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(estadoBadge).map(([key, cfg]) => (
                                    <button key={key} onClick={() => setFilterEstado(filterEstado === key ? null : key)}
                                        className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                                            filterEstado === key ? cfg.class : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                                        {cfg.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Etapa filter */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Etapa</label>
                            <select value={filterEtapa || ""} onChange={(e) => setFilterEtapa(e.target.value || null)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                                <option value="">Todas</option>
                                {etapas.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                        {/* Manzana filter */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Manzana</label>
                            <select value={filterManzana || ""} onChange={(e) => setFilterManzana(e.target.value || null)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                                <option value="">Todas</option>
                                {manzanas.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        {/* Precio range */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Rango de Precio (USD)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" placeholder="Mín" value={precioMin} onChange={(e) => setPrecioMin(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                                <span className="text-slate-400">—</span>
                                <input type="number" placeholder="Máx" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                            </div>
                        </div>

                        {/* Superficie range */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Superficie (m²)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" placeholder="Mín" value={superficieMin} onChange={(e) => setSuperficieMin(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                                <span className="text-slate-400">—</span>
                                <input type="number" placeholder="Máx" value={superficieMax} onChange={(e) => setSuperficieMax(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                {[
                                    { key: "numero", label: "Nº" }, { key: "tipo", label: "Tipo" },
                                    { key: "etapa", label: "Etapa" }, { key: "manzana", label: "Manzana" },
                                    { key: "superficie", label: "Superficie" }, { key: "precio", label: "Precio" },
                                    { key: "estado", label: "Estado" },
                                ].map((col) => (
                                    <th key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-400 transition-colors select-none">
                                        <span className="flex items-center gap-1">
                                            {col.label}
                                            <ArrowUpDown className={cn("w-3 h-3", sortCol === col.key ? "text-brand-400" : "text-slate-400/50")} />
                                        </span>
                                    </th>
                                ))}
                                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filtered.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-5 py-3.5">
                                        <span className="text-sm font-bold text-slate-700 dark:text-white">{u.numero}</span>
                                        {u.esEsquina && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">ESQ</span>}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{u.tipo === "LOTE" ? "Lote" : "Depto"}</td>
                                    <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{u.etapa}</td>
                                    <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{u.manzana}</td>
                                    <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">{u.superficie} m²</td>
                                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-700 dark:text-white">{formatCurrency(u.precio || 0)}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", estadoBadge[u.estado]?.class)}>
                                            {estadoBadge[u.estado]?.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingUnit(u)} title="Editar"
                                                className="p-1.5 rounded-lg hover:bg-brand-500/10 text-slate-400 hover:text-brand-400 transition-all">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setShowStatusChange(u.id)} title="Cambiar estado"
                                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 transition-all">
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setShowHistoryId(u.id)} title="Ver historial"
                                                className="p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-all">
                                                <History className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Status change dropdown */}
                                        {showStatusChange === u.id && (
                                            <div className="absolute mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 min-w-[160px] animate-slide-up">
                                                {Object.entries(estadoBadge).filter(([k]) => k !== u.estado).map(([key, cfg]) => (
                                                    <button key={key} onClick={() => setShowStatusChange(null)}
                                                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", key === "DISPONIBLE" ? "bg-emerald-500" : key === "RESERVADO" ? "bg-amber-500" : key === "VENDIDO" ? "bg-rose-500" : "bg-slate-500")} />
                                                        {cfg.label}
                                                    </button>
                                                ))}
                                                <button onClick={() => setShowStatusChange(null)} className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                                                    Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                                        No se encontraron unidades con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History Modal */}
            {showHistoryId && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md p-0 animate-slide-up">
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-brand-400" />
                                Historial de Cambios
                            </h2>
                            <button onClick={() => setShowHistoryId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                            {[
                                { date: "2025-01-15 14:32", user: "Juan Pérez", from: "DISPONIBLE", to: "RESERVADO", motivo: "Reserva del cliente Carlos Gómez" },
                                { date: "2024-12-20 10:15", user: "Sistema", from: "BLOQUEADO", to: "DISPONIBLE", motivo: "Liberación automática por vencimiento" },
                                { date: "2024-12-15 09:00", user: "Admin", from: "DISPONIBLE", to: "BLOQUEADO", motivo: "Bloqueo temporal por revisión de precios" },
                            ].map((entry, i) => (
                                <div key={i} className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-slate-400">{entry.date}</span>
                                        <span className="text-xs text-slate-500">{entry.user}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", estadoBadge[entry.from]?.class)}>{entry.from}</span>
                                        <span className="text-slate-400">→</span>
                                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", estadoBadge[entry.to]?.class)}>{entry.to}</span>
                                    </div>
                                    {entry.motivo && <p className="text-xs text-slate-500 dark:text-slate-400">{entry.motivo}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Unit Editor Modal */}
            {(editingUnit || showNewUnit) && (
                <UnitEditorModal
                    unit={editingUnit}
                    onClose={() => { setEditingUnit(null); setShowNewUnit(false); }}
                    onSave={(data) => { setEditingUnit(null); setShowNewUnit(false); }}
                />
            )}
        </div>
    );
}
