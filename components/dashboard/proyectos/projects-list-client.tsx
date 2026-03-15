"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Building2, Plus, Search, MapPin, LayoutList, LayoutGrid,
    Map as MapIcon, Filter, Satellite, Edit3, TrendingUp, Users, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { SuspendProjectDialog } from "./suspend-project-dialog";
import FeatureGate from "@/components/saas/FeatureGate";

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
    projectBasePath?: string;
    usage?: { current: number; limit: number };
}

export default function ProjectsListClient({
    projects,
    newProjectPath = "/dashboard/admin/proyectos/new",
    projectBasePath = "/dashboard/proyectos",
    usage,
}: ProjectsListClientProps) {
    const [activeProjects, setActiveProjects] = useState(projects);
    const [view, setView] = useState<"cards" | "list">("cards");
    const [search, setSearch] = useState("");

    const filteredProjects = useMemo(() => {
        if (!search.trim()) return activeProjects;
        const lowerSearch = search.toLowerCase();
        return activeProjects.filter(p =>
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
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        {filteredProjects.length} {filteredProjects.length === 1 ? "proyecto" : "proyectos"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setView("cards")}
                            className={cn("p-2 rounded-lg transition-all", view === "cards" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-500" : "text-slate-400 hover:text-slate-600")}
                            title="Vista cards"
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-500" : "text-slate-400 hover:text-slate-600")}
                            title="Vista lista"
                        >
                            <LayoutList className="w-5 h-5" />
                        </button>
                    </div>
                    <FeatureGate
                        feature="proyectos"
                        max={usage?.limit}
                        current={usage?.current}
                        showUpgradeCard={false}
                    >
                        {newProjectPath && (
                            <Link
                                href={newProjectPath}
                                className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Nuevo Proyecto</span>
                            </Link>
                        )}
                    </FeatureGate>
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
            {filteredProjects.length === 0 ? (
                <div className="glass-card py-20 text-center">
                    <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No se encontraron proyectos.</p>
                </div>
            ) : view === "cards" ? (
                <CardGrid
                    projects={filteredProjects}
                    projectBasePath={projectBasePath}
                    onDelete={handleOptimisticDelete}
                />
            ) : (
                <TableList
                    projects={filteredProjects}
                    projectBasePath={projectBasePath}
                    onDelete={handleOptimisticDelete}
                />
            )}
        </div>
    );
}

// ─── Card Grid ────────────────────────────────────────────────────────────────

function CardGrid({ projects, projectBasePath, onDelete }: {
    projects: any[];
    projectBasePath: string;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map(p => (
                <ProjectCard key={p.id} p={p} projectBasePath={projectBasePath} onDelete={onDelete} />
            ))}
        </div>
    );
}

function ProjectCard({ p, projectBasePath, onDelete }: {
    p: any;
    projectBasePath: string;
    onDelete: (id: string) => void;
}) {
    const estado = estadoConfig[p.estado];
    const total = p.unidades?.total || 0;
    const disponibles = p.unidades?.disponibles || 0;
    const reservadas = p.unidades?.reservadas || 0;
    const vendidas = p.unidades?.vendidas || 0;
    const ocupadas = reservadas + vendidas;
    const pct = total > 0 ? Math.round((ocupadas / total) * 100) : 0;
    const href = `${projectBasePath}/${p.id}`;

    return (
        <div className="glass-card overflow-hidden flex flex-col group hover:border-brand-orange/30 transition-all duration-200 hover:shadow-[0_4px_24px_rgba(249,115,22,0.08)]">
            {/* Cover image */}
            <Link href={href} className="block relative h-44 bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0 overflow-hidden">
                {p.imagenPortada ? (
                    <Image
                        src={p.imagenPortada}
                        alt={p.nombre}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-slate-700" />
                    </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* Status badge on image */}
                {estado && (
                    <span className={cn("absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm", estado.class)}>
                        {estado.label}
                    </span>
                )}
                {p.isDemo && (
                    <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest text-brand-500 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
                        DEMO 48h
                    </span>
                )}
            </Link>

            {/* Body */}
            <div className="flex flex-col flex-1 p-5 gap-4">
                {/* Title + location */}
                <div>
                    <Link href={href} className="block">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-brand-orange transition-colors leading-tight">
                            {p.nombre}
                        </h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {p.ubicacion && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {p.ubicacion}
                            </span>
                        )}
                        {p.tipo && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Tag className="w-3 h-3 flex-shrink-0" />
                                {tipoLabels[p.tipo] || p.tipo}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                {total > 0 && (
                    <div className="space-y-2">
                        {/* Progress bar */}
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Avance de ventas</span>
                            <span className="font-bold text-slate-700 dark:text-white">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-orange to-brand-orangeDark transition-all"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        {/* Unit stats */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                            <StatPill label="Total" value={total} color="text-slate-700 dark:text-slate-200" />
                            <StatPill label="Disp." value={disponibles} color="text-emerald-500" />
                            <StatPill label="Res." value={reservadas} color="text-amber-500" />
                            <StatPill label="Vend." value={vendidas} color="text-rose-500" />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <Link
                        href={href}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white transition-all"
                    >
                        Ver proyecto →
                    </Link>
                    <div className="flex items-center gap-1">
                        <Link
                            href={href}
                            className="p-1.5 inline-flex rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500 transition-colors"
                            title="Editar"
                        >
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
                            onDeleteOptimistic={() => onDelete(p.id)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="text-center bg-slate-50 dark:bg-slate-800/60 rounded-lg py-1.5">
            <p className={cn("text-sm font-bold leading-none", color)}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
        </div>
    );
}

// ─── Table List (compact view) ────────────────────────────────────────────────

function TableList({ projects, projectBasePath, onDelete }: {
    projects: any[];
    projectBasePath: string;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proyecto</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                            <th className="text-center px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                            <th className="text-center px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Disp.</th>
                            <th className="text-center px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Res.</th>
                            <th className="text-center px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vend.</th>
                            <th className="px-5 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {projects.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-5 py-4">
                                    <Link href={`${projectBasePath}/${p.id}`} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {p.imagenPortada ? (
                                                <Image src={p.imagenPortada} alt={p.nombre} width={40} height={40} className="w-full h-full object-cover" />
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
                                        <Link href={`${projectBasePath}/${p.id}`} className="p-2 inline-flex rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500 transition-colors">
                                            <Edit3 className="w-4 h-4" />
                                        </Link>
                                        <SuspendProjectDialog projectId={p.id} projectTitle={p.nombre} currentStatus={p.estado} />
                                        <DeleteProjectDialog projectId={p.id} projectTitle={p.nombre} onDeleteOptimistic={() => onDelete(p.id)} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function safeCall<T>(fn: () => T, fallback: T): T {
    try { return fn(); } catch { return fallback; }
}
