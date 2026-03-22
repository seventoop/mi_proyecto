"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Search, MapPin, SlidersHorizontal, X, Building2,
    TrendingUp, Heart, Layers, Tag, CheckCircle2, Clock, Hammer,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toggleFavorito } from "@/lib/actions/investor-actions";
import { toast } from "sonner";
import { useTransition } from "react";

const TIPOS: { value: string; label: string }[] = [
    { value: "TODOS", label: "Todos los tipos" },
    { value: "URBANIZACION", label: "Urbanización" },
    { value: "CHACRA", label: "Chacra" },
    { value: "EDIFICIO", label: "Edificio" },
    { value: "BARRIO_CERRADO", label: "Barrio cerrado" },
    { value: "COUNTRIES", label: "Countries" },
    { value: "LOTE", label: "Lote" },
];

const ESTADOS: { value: string; label: string; icon: any; color: string }[] = [
    { value: "TODOS", label: "Todos", icon: Layers, color: "" },
    { value: "PLANIFICACION", label: "Planificación", icon: Clock, color: "text-blue-500" },
    { value: "EN_DESARROLLO", label: "En desarrollo", icon: Hammer, color: "text-amber-500" },
    { value: "ENTREGADO", label: "Entregado", icon: CheckCircle2, color: "text-emerald-500" },
];

const SORT_OPTIONS = [
    { value: "recent", label: "Más recientes" },
    { value: "price_asc", label: "Precio ↑" },
    { value: "price_desc", label: "Precio ↓" },
    { value: "name", label: "Nombre A-Z" },
];

type Proyecto = {
    id: string; nombre: string; slug: string | null; ubicacion: string | null;
    descripcion: string | null; imagenPortada: string | null;
    tipo: string | null; estado: string | null;
    precioM2Inversor: any; precioM2Mercado: any;
    metaM2Objetivo: any; m2VendidosInversores: any;
    invertible: boolean; isDemo: boolean; isFavorite: boolean;
    _count: { etapas: number };
};

function ProjectCard({ proyecto, showFavorite }: { proyecto: Proyecto; showFavorite: boolean }) {
    const [isFavorite, setIsFavorite] = useState(proyecto.isFavorite);
    const [, startTransition] = useTransition();

    const progress = proyecto.metaM2Objetivo
        ? Math.min((Number(proyecto.m2VendidosInversores) / Number(proyecto.metaM2Objetivo)) * 100, 100)
        : 0;

    const roi = proyecto.precioM2Inversor && proyecto.precioM2Mercado && Number(proyecto.precioM2Inversor) > 0
        ? ((Number(proyecto.precioM2Mercado) - Number(proyecto.precioM2Inversor)) / Number(proyecto.precioM2Inversor)) * 100
        : null;

    const estadoDef = ESTADOS.find(e => e.value === proyecto.estado);
    const tipoDef = TIPOS.find(t => t.value === proyecto.tipo);

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        startTransition(async () => {
            const res = await toggleFavorito(proyecto.id);
            if (res.success) {
                setIsFavorite((res as any).isFavorite);
                toast.success((res as any).isFavorite ? "Añadido a favoritos" : "Eliminado de favoritos");
            } else {
                toast.error("Error al actualizar favoritos");
            }
        });
    };

    const href = proyecto.slug
        ? `/proyectos/${proyecto.slug}`
        : `/dashboard/portafolio/marketplace/${proyecto.id}`;

    return (
        <div className="glass-card overflow-hidden hover:border-brand-500/40 hover:-translate-y-0.5 transition-all duration-200 group flex flex-col h-full relative">
            {showFavorite && (
                <button onClick={handleToggleFavorite}
                    className={cn(
                        "absolute top-3 right-3 z-10 p-2 rounded-xl transition-all shadow-md",
                        isFavorite ? "bg-rose-500 text-white" : "bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-rose-500 backdrop-blur-sm"
                    )}>
                    <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                </button>
            )}

            <Link href={href} className="flex-1 flex flex-col">
                <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {proyecto.imagenPortada ? (
                        <Image src={proyecto.imagenPortada} alt={proyecto.nombre}
                            fill sizes="(max-width:768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <Building2 className="w-14 h-14 text-slate-300 dark:text-slate-600" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                        {tipoDef && tipoDef.value !== "TODOS" && (
                            <span className="px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest border border-white/20">
                                {tipoDef.label}
                            </span>
                        )}
                        {estadoDef && estadoDef.value !== "TODOS" && (
                            <span className={cn("px-2 py-0.5 rounded-lg bg-slate-950/60 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest border border-white/10", estadoDef.color)}>
                                {estadoDef.label}
                            </span>
                        )}
                    </div>

                    {roi !== null && roi > 0 && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-black">
                            <TrendingUp className="w-3 h-3" />
                            ROI +{roi.toFixed(1)}%
                        </div>
                    )}

                    {proyecto.invertible && (
                        <div className="absolute top-3 left-3 mt-8 flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500/90 backdrop-blur-sm text-white text-xs font-black">
                            Invertible
                        </div>
                    )}
                </div>

                <div className="p-4 flex flex-col flex-1 gap-2">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors leading-tight">
                            {proyecto.nombre}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{proyecto.ubicacion || "Ubicación por definir"}</span>
                        </p>
                    </div>

                    {proyecto.descripcion && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 flex-1">
                            {proyecto.descripcion}
                        </p>
                    )}

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 mt-auto">
                        {proyecto.precioM2Inversor || proyecto.precioM2Mercado ? (
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Precio M²</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">
                                        {formatCurrency(Number(proyecto.precioM2Inversor || proyecto.precioM2Mercado) || 0)}
                                    </p>
                                </div>
                                {proyecto.metaM2Objetivo && (
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Fondeado</p>
                                        <p className="text-sm font-black text-brand-500">{progress.toFixed(0)}%</p>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {proyecto.metaM2Objetivo && (
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={cn("h-full transition-all", progress >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-brand-500 to-brand-600")}
                                    style={{ width: `${progress}%` }} />
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
}

export default function MarketplaceExplorer({
    proyectos, userRole,
}: { proyectos: Proyecto[]; userRole: string; }) {
    const [search, setSearch] = useState("");
    const [tipo, setTipo] = useState("TODOS");
    const [estado, setEstado] = useState("TODOS");
    const [sort, setSort] = useState("recent");
    const [showFilters, setShowFilters] = useState(false);

    const filtered = useMemo(() => {
        let list = [...proyectos];

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.nombre.toLowerCase().includes(q) ||
                (p.ubicacion || "").toLowerCase().includes(q) ||
                (p.descripcion || "").toLowerCase().includes(q)
            );
        }
        if (tipo !== "TODOS") list = list.filter(p => p.tipo === tipo);
        if (estado !== "TODOS") list = list.filter(p => p.estado === estado);

        list.sort((a, b) => {
            if (sort === "price_asc") return Number(a.precioM2Inversor || 0) - Number(b.precioM2Inversor || 0);
            if (sort === "price_desc") return Number(b.precioM2Inversor || 0) - Number(a.precioM2Inversor || 0);
            if (sort === "name") return a.nombre.localeCompare(b.nombre);
            return 0;
        });

        return list;
    }, [proyectos, search, tipo, estado, sort]);

    const activeFilters = (tipo !== "TODOS" ? 1 : 0) + (estado !== "TODOS" ? 1 : 0);
    const clearAll = () => { setTipo("TODOS"); setEstado("TODOS"); setSearch(""); };

    const showFavorite = ["INVERSOR", "ADMIN", "SUPERADMIN", "CLIENTE"].includes(userRole);

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, ubicación o descripción..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setShowFilters(v => !v)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors",
                            showFilters || activeFilters > 0
                                ? "bg-brand-500 text-white border-brand-500"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-400"
                        )}>
                        <SlidersHorizontal className="w-4 h-4" />
                        Filtros
                        {activeFilters > 0 && (
                            <span className="ml-0.5 bg-white/30 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">
                                {activeFilters}
                            </span>
                        )}
                    </button>

                    <select value={sort} onChange={e => setSort(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {showFilters && (
                <div className="glass-card p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-brand-500" /> Tipo de proyecto
                        </p>
                        {activeFilters > 0 && (
                            <button onClick={clearAll} className="text-xs text-brand-500 hover:underline font-semibold">
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TIPOS.map(t => (
                            <button key={t.value} onClick={() => setTipo(t.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                                    tipo === t.value
                                        ? "bg-brand-500 text-white border-brand-500"
                                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400"
                                )}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-brand-500" /> Estado
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {ESTADOS.map(e => {
                                const Icon = e.icon;
                                return (
                                    <button key={e.value} onClick={() => setEstado(e.value)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                                            estado === e.value
                                                ? "bg-brand-500 text-white border-brand-500"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400"
                                        )}>
                                        <Icon className={cn("w-3.5 h-3.5", estado !== e.value && e.color)} />
                                        {e.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span>{" "}
                    {filtered.length === 1 ? "proyecto encontrado" : "proyectos encontrados"}
                    {proyectos.length !== filtered.length && (
                        <span className="text-slate-400"> de {proyectos.length}</span>
                    )}
                </p>
                {(search || activeFilters > 0) && (
                    <button onClick={clearAll} className="text-xs text-slate-400 hover:text-brand-500 flex items-center gap-1">
                        <X className="w-3 h-3" /> Limpiar todo
                    </button>
                )}
            </div>

            {filtered.length === 0 ? (
                <div className="glass-card p-16 text-center border-dashed border-2">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Sin resultados</h3>
                    <p className="text-sm text-slate-500 mb-4">No encontramos proyectos con esos filtros.</p>
                    <button onClick={clearAll} className="text-sm text-brand-500 font-semibold hover:underline">
                        Ver todos los proyectos
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map(p => (
                        <ProjectCard key={p.id} proyecto={p} showFavorite={showFavorite} />
                    ))}
                </div>
            )}
        </div>
    );
}
