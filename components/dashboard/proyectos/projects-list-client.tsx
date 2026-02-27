"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Building2, Plus, Search, MapPin, ChevronRight, LayoutList, Map as MapIcon, Layers, Filter, Satellite, Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet map to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const LayersControl = dynamic(() => import("react-leaflet").then(mod => mod.LayersControl), { ssr: false });
import { DeleteProjectDialog } from "./delete-project-dialog";
import { SuspendProjectDialog } from "./suspend-project-dialog";

const estadoConfig: Record<string, { label: string; class: string }> = {
    PLANIFICACION: { label: "Planificación", class: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20" },
    EN_VENTA: { label: "En Venta", class: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" },
    FINALIZADO: { label: "Finalizado", class: "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20" },
    SUSPENDIDO: { label: "Suspendido", class: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20" },
};

const tipoLabels: Record<string, string> = {
    URBANIZACION: "Urbanización",
    DEPARTAMENTOS: "Departamentos",
};

interface ProjectsListClientProps {
    projects: any[];
    metadata?: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
    newProjectPath?: string;
}

export default function ProjectsListClient({ projects, newProjectPath = "/dashboard/admin/proyectos/new" }: ProjectsListClientProps) {
    const [activeProjects, setActiveProjects] = useState(projects);
    const [view, setView] = useState<"list" | "map">("list");
    const [search, setSearch] = useState("");
    const [mapStyle, setMapStyle] = useState<"standard" | "satellite" | "hybrid">("satellite");

    // Filter projects
    const filteredProjects = useMemo(() => {
        const list = activeProjects;
        if (!search.trim()) return list;
        const lowerSearch = search.toLowerCase();
        return list.filter(p =>
            p.nombre.toLowerCase().includes(lowerSearch) ||
            p.ubicacion?.toLowerCase().includes(lowerSearch)
        );
    }, [activeProjects, search]);

    const handleOptimisticDelete = (id: string) => {
        setActiveProjects(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div className="space-y-6 animate-fade-in p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Proyectos</h1>
                    <p className="text-slate-900 dark:text-slate-400 font-bold mt-1">
                        {filteredProjects.length} proyectos encontrados
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button onClick={() => setView("list")}
                            className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-500" : "text-slate-400 hover:text-slate-600")}>
                            <LayoutList className="w-5 h-5" />
                        </button>
                        <button onClick={() => setView("map")}
                            className={cn("p-2 rounded-lg transition-all", view === "map" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-500" : "text-slate-400 hover:text-slate-600")}>
                            <MapIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {newProjectPath && (
                        <Link href={newProjectPath}
                            className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nuevo Proyecto</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o ubicación..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
                />
            </div>

            {/* Content */}
            {view === "list" ? (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                    <th className="text-left px-5 py-4 text-xs font-semibold text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider">Proyecto</th>
                                    <th className="text-left px-5 py-4 text-xs font-semibold text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider">Tipo</th>
                                    <th className="text-left px-5 py-4 text-xs font-semibold text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider">Estado</th>
                                    <th className="text-center px-5 py-4 text-xs font-semibold text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider">Total</th>
                                    <th className="text-center px-5 py-4 text-xs font-semibold text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider">Disp.</th>
                                    <th className="text-center px-5 py-4 text-xs font-semibold text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider">Res.</th>
                                    <th className="text-center px-5 py-4 text-xs font-semibold text-slate-900 dark:text-slate-400 font-bold uppercase tracking-wider">Vend.</th>
                                    <th className="px-5 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProjects.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-5 py-4">
                                            <Link href={`/dashboard/proyectos/${p.id}`} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/30 flex items-center justify-center flex-shrink-0">
                                                    {p.imagenPortada ? (
                                                        <Image
                                                            src={p.imagenPortada}
                                                            alt={p.nombre}
                                                            width={40}
                                                            height={40}
                                                            className="w-full h-full object-cover rounded-xl"
                                                        />
                                                    ) : (
                                                        <Building2 className="w-5 h-5 text-brand-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-700 dark:text-white group-hover:text-brand-400 transition-colors">{p.nombre}</p>
                                                    {p.ubicacion && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3" /> {p.ubicacion}
                                                        </p>
                                                    )}
                                                    {p.isDemo && (
                                                        <div className="mt-1 flex items-center gap-1.5">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded">DEMO 48h</span>
                                                            {p.demoExpiresAt && (
                                                                <span className="text-[9px] text-slate-400 font-bold italic">
                                                                    Vence: {new Date(p.demoExpiresAt).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{tipoLabels[p.tipo] || p.tipo}</td>
                                        <td className="px-5 py-4">
                                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", estadoConfig[p.estado]?.class || "bg-slate-100 text-slate-500")}>
                                                {estadoConfig[p.estado]?.label || p.estado}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center text-sm font-semibold">{p.unidades?.total || 0}</td>
                                        <td className="px-5 py-4 text-center text-sm font-semibold text-emerald-500">{p.unidades?.disponibles || 0}</td>
                                        <td className="px-5 py-4 text-center text-sm font-semibold text-amber-500">{p.unidades?.reservadas || 0}</td>
                                        <td className="px-5 py-4 text-center text-sm font-semibold text-rose-500">{p.unidades?.vendidas || 0}</td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/dashboard/proyectos/${p.id}`} className="p-2 inline-flex rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500 transition-colors">
                                                    <Edit3 className="w-4 h-4" />
                                                </Link>
                                                <SuspendProjectDialog
                                                    projectId={p.id}
                                                    projectTitle={p.nombre}
                                                    currentStatus={p.estado}
                                                />
                                                <DeleteProjectDialog
                                                    projectId={p.id}
                                                    projectTitle={p.nombre}
                                                    onDeleteOptimistic={() => handleOptimisticDelete(p.id)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredProjects.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                No se encontraron proyectos.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-[750px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0 group">

                    {/* Floating Controls Overlay (Inspired by User's Image) */}
                    <div className="absolute top-4 left-4 z-[400] flex gap-2">
                        {/* Filter Button */}
                        <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-full shadow-lg hover:bg-slate-50 transition-colors text-sm font-bold border border-slate-200">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>

                        {/* Map Mode Buttons */}
                        <div className="flex bg-white rounded-full shadow-lg p-1 border border-slate-200">
                            <button
                                onClick={() => setMapStyle("standard")}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                                    mapStyle === "standard"
                                        ? "bg-earth-500 text-white shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <MapIcon className="w-3.5 h-3.5" />
                                Plano
                            </button>

                            <button className="px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 border-l border-slate-100">
                                <Edit3 className="w-3.5 h-3.5" />
                                Editar Plano
                            </button>

                            <button
                                onClick={() => setMapStyle("satellite")}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 border-l border-slate-100",
                                    (mapStyle === "satellite" || mapStyle === "hybrid")
                                        ? "bg-earth-500 text-white shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <Satellite className="w-3.5 h-3.5" />
                                Satélite
                            </button>

                            <button
                                onClick={() => setMapStyle("hybrid")}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 border-l border-slate-100",
                                    mapStyle === "hybrid"
                                        ? "text-earth-600 bg-earth-50"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                Híbrido
                            </button>
                        </div>
                    </div>


                    <MapContainer center={[-34.6037, -58.3816]} zoom={12} style={{ height: "100%", width: "100%" }} className="z-0">
                        {/* Standard: Voyager */}
                        {mapStyle === "standard" && (
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                        )}

                        {/* Satellite: Esri World Imagery */}
                        {(mapStyle === "satellite" || mapStyle === "hybrid") && (
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                            />
                        )}

                        {/* Hybrid Labels: Stamen Toner Labels or similar transparent layer */}
                        {mapStyle === "hybrid" && (
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                        )}

                        {filteredProjects.map((p) => (
                            p.mapCenterLat && p.mapCenterLng && (
                                <Marker key={p.id} position={[p.mapCenterLat, p.mapCenterLng]}>
                                    <Popup>
                                        <div className="p-1 min-w-[200px]">
                                            <div className="h-24 rounded-lg bg-slate-100 mb-2 overflow-hidden relative">
                                                {p.imagenPortada ? (
                                                    <Image
                                                        src={p.imagenPortada}
                                                        alt={p.nombre}
                                                        width={200}
                                                        height={100}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                                        <Building2 className="w-8 h-8" />
                                                    </div>
                                                )}
                                                <span className={cn("absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase", "bg-white/80 text-slate-800")}>
                                                    {p.estado}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-sm mb-0.5">{p.nombre}</h3>
                                            <p className="text-xs text-slate-500 mb-2 truncate">{p.ubicacion}</p>
                                            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-3 border-t pt-2">
                                                <span>{p.unidades?.disponibles || 0} Disponibles</span>
                                                <span className="font-bold">{p.unidades?.total || 0} Total</span>
                                            </div>
                                            <Link href={`/dashboard/proyectos/${p.id}`} className="block w-full py-1.5 text-center bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors">
                                                Ver Proyecto
                                            </Link>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        ))}
                    </MapContainer>
                </div>
            )}
        </div>
    );
}

function safeCall<T>(fn: () => T, fallback: T): T {
    try { return fn(); } catch { return fallback; }
}
