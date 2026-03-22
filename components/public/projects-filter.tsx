"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, MapPin, Grid3X3, Map } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProjectCard from "./project-card";
import type { ProjectListItem } from "@/app/(public)/proyectos/page";

interface ProjectsFilterProps {
    projects: ProjectListItem[];
}

const TYPE_LABELS: Record<string, string> = {
    URBANIZACION: "Urbanización",
    BARRIO_PRIVADO: "Barrio Privado",
    EDIFICIO: "Edificio",
    CONDOMINIO: "Condominio",
    LOTEO: "Loteo",
};

const STATUS_LABELS: Record<string, string> = {
    EN_VENTA: "En venta",
    PLANIFICACION: "Planificación",
    EN_DESARROLLO: "En desarrollo",
    ENTREGADO: "Entregado",
    ACTIVO: "Activo",
};

export default function ProjectsFilter({ projects }: ProjectsFilterProps) {
    const [search, setSearch] = useState("");
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

    const allTypes = useMemo(() =>
        Array.from(new Set(projects.map((p) => p.tipo).filter(Boolean))) as string[],
        [projects]
    );

    const allStatuses = useMemo(() =>
        Array.from(new Set(projects.map((p) => p.estado).filter(Boolean))) as string[],
        [projects]
    );

    const globalPriceRange = useMemo(() => {
        const prices = projects.filter((p) => p.minPrice).map((p) => p.minPrice!);
        return prices.length ? [Math.min(...prices), Math.max(...prices)] as [number, number] : [0, 0] as [number, number];
    }, [projects]);

    const hasActiveFilters = search || selectedTypes.length > 0 || selectedStatuses.length > 0
        || (priceRange[0] > 0 || priceRange[1] > 0);

    const filtered = useMemo(() => {
        return projects.filter((p) => {
            if (search) {
                const q = search.toLowerCase();
                if (!p.nombre.toLowerCase().includes(q) && !(p.ubicacion || "").toLowerCase().includes(q)) return false;
            }
            if (selectedTypes.length > 0 && !selectedTypes.includes(p.tipo || "")) return false;
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.estado || "")) return false;
            if (priceRange[1] > 0 && p.minPrice) {
                if (p.minPrice < priceRange[0] || p.minPrice > priceRange[1]) return false;
            }
            return true;
        });
    }, [projects, search, selectedTypes, selectedStatuses, priceRange]);

    const clearAll = () => {
        setSearch("");
        setSelectedTypes([]);
        setSelectedStatuses([]);
        setPriceRange([0, 0]);
    };

    const toggleType = (t: string) => {
        setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    };
    const toggleStatus = (s: string) => {
        setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    };

    return (
        <div className="space-y-6">
            {/* Search + Controls bar */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o ubicación..."
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange/40 focus:bg-white/8 transition-all text-sm"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10"
                        >
                            <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border text-sm font-medium transition-all ${
                        showFilters || hasActiveFilters
                            ? "bg-brand-orange/10 border-brand-orange/30 text-brand-orange"
                            : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                    }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtros
                    {hasActiveFilters && (
                        <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center">
                            {selectedTypes.length + selectedStatuses.length + (priceRange[1] > 0 ? 1 : 0)}
                        </span>
                    )}
                </button>

                <div className="flex rounded-2xl border border-white/10 overflow-hidden">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-3.5 transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("map")}
                        className={`p-3.5 transition-all ${viewMode === "map" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
                    >
                        <Map className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Expandable filters panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
                            {/* Type pills */}
                            {allTypes.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Tipo de proyecto</p>
                                    <div className="flex flex-wrap gap-2">
                                        {allTypes.map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => toggleType(t)}
                                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                                    selectedTypes.includes(t)
                                                        ? "bg-brand-orange text-white"
                                                        : "bg-white/5 text-slate-300 border border-white/10 hover:border-white/20"
                                                }`}
                                            >
                                                {TYPE_LABELS[t] || t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Status pills */}
                            {allStatuses.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Estado</p>
                                    <div className="flex flex-wrap gap-2">
                                        {allStatuses.map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => toggleStatus(s)}
                                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                                    selectedStatuses.includes(s)
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-white/5 text-slate-300 border border-white/10 hover:border-white/20"
                                                }`}
                                            >
                                                {STATUS_LABELS[s] || s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Price range */}
                            {globalPriceRange[1] > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
                                        Rango de precio
                                        {priceRange[1] > 0 && (
                                            <span className="text-brand-orange ml-2 normal-case tracking-normal">
                                                ${priceRange[0].toLocaleString()} — ${priceRange[1].toLocaleString()}
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="range"
                                                min={globalPriceRange[0]}
                                                max={globalPriceRange[1]}
                                                value={priceRange[0] || globalPriceRange[0]}
                                                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1] || globalPriceRange[1]])}
                                                className="w-full accent-brand-orange"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                                <span>${globalPriceRange[0].toLocaleString()}</span>
                                                <span>Desde</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="range"
                                                min={globalPriceRange[0]}
                                                max={globalPriceRange[1]}
                                                value={priceRange[1] || globalPriceRange[1]}
                                                onChange={(e) => setPriceRange([priceRange[0] || globalPriceRange[0], Number(e.target.value)])}
                                                className="w-full accent-brand-orange"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                                <span>${globalPriceRange[1].toLocaleString()}</span>
                                                <span>Hasta</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {hasActiveFilters && (
                                <button
                                    onClick={clearAll}
                                    className="text-xs font-semibold text-brand-orange hover:text-brand-orangeDark transition-colors"
                                >
                                    Limpiar todos los filtros
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    <span className="font-black text-white text-lg">{filtered.length}</span>{" "}
                    {filtered.length === 1 ? "proyecto" : "proyectos"}
                    {hasActiveFilters && <span className="text-slate-600"> (filtrado)</span>}
                </p>
            </div>

            {/* Grid view */}
            {viewMode === "grid" && (
                <div className="min-h-[400px]">
                    {filtered.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((project, idx) => (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                                >
                                    <ProjectCard project={project} />
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <Search className="w-7 h-7 text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Sin resultados</h3>
                            <p className="text-slate-500 mb-4">Probá ajustando los filtros o el texto de búsqueda.</p>
                            <button
                                onClick={clearAll}
                                className="text-brand-orange hover:text-brand-orangeDark font-semibold text-sm"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Map view */}
            {viewMode === "map" && (
                <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-[600px]">
                        <div className="relative bg-slate-900 flex items-center justify-center">
                            <div className="text-center space-y-3">
                                <Map className="w-12 h-12 text-slate-600 mx-auto" />
                                <p className="text-slate-500 text-sm">Mapa interactivo</p>
                                <p className="text-slate-600 text-xs max-w-xs mx-auto">
                                    Vista de mapa con todos los proyectos geolocalizados — próximamente
                                </p>
                            </div>
                            {/* Project markers overlay */}
                            {filtered.filter((p) => p.mapCenterLat && p.mapCenterLng).length > 0 && (
                                <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/10">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                                        <span className="text-xs text-slate-300">
                                            {filtered.filter((p) => p.mapCenterLat && p.mapCenterLng).length} proyectos con ubicación
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="border-l border-white/10 overflow-y-auto max-h-[600px] p-4 space-y-3">
                            {filtered.map((project) => (
                                <a
                                    key={project.id}
                                    href={`/proyectos/${project.slug || project.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                                >
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                                        <img
                                            src={project.imagenPortada || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=400"}
                                            alt={project.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate group-hover:text-brand-orange transition-colors">
                                            {project.nombre}
                                        </p>
                                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" />
                                            {project.ubicacion || "Ubicación por confirmar"}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {project.availableUnits} lotes · {project.minPrice ? `desde $${project.minPrice.toLocaleString()}` : "Consultar"}
                                        </p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CTA */}
            <div className="mt-16 mb-8 rounded-2xl bg-gradient-to-br from-brand-orange/8 via-transparent to-transparent border border-white/8 p-10 md:p-14 text-center space-y-5">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    ¿Tenés un desarrollo para lanzar?
                </h2>
                <p className="text-slate-400 text-base leading-relaxed max-w-xl mx-auto">
                    Publicá tu proyecto con infraestructura profesional, visibilidad desde el día uno y comunidad activa.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <a
                        href="/contacto"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl font-black transition-all shadow-lg shadow-brand-orange/20 hover:scale-[1.02] active:scale-95 text-sm"
                    >
                        Soy Desarrollador
                    </a>
                    <a
                        href="/#comunidad"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/10 text-slate-300 hover:bg-white/5 rounded-2xl font-bold transition-all active:scale-95 text-sm"
                    >
                        Unirme a la Comunidad
                    </a>
                </div>
            </div>
        </div>
    );
}
