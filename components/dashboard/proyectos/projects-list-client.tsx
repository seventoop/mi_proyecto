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

const estadoConfig: Record<string, { label: string; class: string }> = {
    PLANIFICACION: { label: "Planificación", class: "bg-blue-500/10 text-blue-500 border border-blue-500/20" },
    EN_VENTA: { label: "En Venta", class: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" },
    FINALIZADO: { label: "Finalizado", class: "bg-slate-500/10 text-slate-400 border border-slate-500/20" },
    SUSPENDIDO: { label: "Suspendido", class: "bg-rose-500/10 text-rose-500 border border-rose-500/20" },
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
}

export default function ProjectsListClient({
    projects,
    newProjectPath = "/dashboard/admin/proyectos/new",
    projectBasePath = "/dashboard/proyectos",
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
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-slate-500 dark:text-white/40 text-sm font-black uppercase tracking-widest">
                    {filteredProjects.length} {filteredProjects.length === 1 ? "proyecto cargado" : "proyectos cargados"}
                </p>
                <div className="flex items-center gap-3">
                    {/* View toggle */}
                    <div className="flex bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                        <button
                            onClick={() => setView("cards")}
                            className={cn("p-1.5 rounded-lg transition-all duration-300", view === "cards" ? "bg-white dark:bg-white/[0.08] shadow-sm text-brand-500 dark:text-zinc-100" : "text-slate-400 hover:text-slate-600 dark:hover:text-white/60")}
                            title="Vista cards"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn("p-1.5 rounded-lg transition-all duration-300", view === "list" ? "bg-white dark:bg-white/[0.08] shadow-sm text-brand-500 dark:text-zinc-100" : "text-slate-400 hover:text-slate-600 dark:hover:text-white/60")}
                            title="Vista lista"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                    </div>
                    {newProjectPath && (
                        <Link
                            href={newProjectPath}
                            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-brand-500/10 active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Nuevo Proyecto</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o ubicación..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-zinc-100"
                />
            </div>

            {/* Content */}
            {filteredProjects.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-white/[0.06]">
                        <Building2 className="w-7 h-7 text-slate-400 dark:text-white/20" />
                    </div>
                    <p className="text-slate-500 dark:text-zinc-200 font-bold">No se encontraron proyectos</p>
                    <p className="text-[12px] text-slate-400 dark:text-white/30 mt-1 max-w-[240px] mx-auto">Prueba ajustando los términos de búsqueda o crea uno nuevo.</p>
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
        <div className="flex flex-col flex-1 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden group hover:border-slate-300 dark:hover:border-white/[0.12] hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            {/* Cover image */}
            <Link href={href} className="block relative h-48 bg-slate-100 dark:bg-white/[0.04] flex-shrink-0 overflow-hidden border-b border-slate-100 dark:border-white/[0.06]">
                {p.imagenPortada ? (
                    <Image
                        src={p.imagenPortada}
                        alt={p.nombre}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-slate-300 dark:text-white/10" />
                    </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
                
                {/* Status badge on image */}
                {estado && (
                    <div className="absolute top-4 right-4">
                        <span className={cn("text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm border", estado.class)}>
                            {estado.label}
                        </span>
                    </div>
                )}
                
                {p.isDemo && (
                    <div className="absolute top-4 left-4">
                        <span className="text-xs font-black uppercase tracking-widest text-brand-500 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-brand-500/30">
                            DEMO 48h
                        </span>
                    </div>
                )}
            </Link>

            {/* Body */}
            <div className="flex flex-col flex-1 p-5 gap-4">
                {/* Title + location */}
                <div>
                    <Link href={href} className="block group/title">
                        <h3 className="text-[17px] font-black text-slate-900 dark:text-zinc-100 group-hover/title:text-brand-500 transition-colors leading-tight tracking-tight uppercase italic">
                            {p.nombre}
                        </h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {p.ubicacion && (
                            <span className="text-sm font-bold text-slate-500 dark:text-white/40 flex items-center gap-1.5 uppercase tracking-tight">
                                <MapPin className="w-3 h-3 text-slate-400 dark:text-white/20" />
                                {p.ubicacion}
                            </span>
                        )}
                        {p.tipo && (
                            <span className="text-sm font-bold text-slate-500 dark:text-white/40 flex items-center gap-1.5 uppercase tracking-tight">
                                <Tag className="w-3 h-3 text-slate-400 dark:text-white/20" />
                                {tipoLabels[p.tipo] || p.tipo}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                {total > 0 && (
                    <div className="space-y-3 pt-1">
                        {/* Progress bar */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Ventas</span>
                            <span className="text-sm font-black text-slate-900 dark:text-brand-400 italic">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] overflow-hidden border border-slate-200 dark:border-white/[0.06]">
                            <div
                                className="h-full rounded-full bg-brand-500 transition-all duration-1000"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        {/* Unit stats */}
                        <div className="grid grid-cols-4 gap-2">
                            <StatPill label="Total" value={total} color="text-slate-900 dark:text-zinc-100" />
                            <StatPill label="Disp." value={disponibles} color="text-emerald-500" />
                            <StatPill label="Res." value={reservadas} color="text-amber-500" />
                            <StatPill label="Vend." value={vendidas} color="text-rose-500" />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06] mt-auto">
                    <Link
                        href={href}
                        className="px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white transition-all duration-300"
                    >
                        Gestionar
                    </Link>
                    <div className="flex items-center gap-1.5">
                        <Link
                            href={href}
                            className="p-2 inline-flex rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-white/30 hover:text-brand-500 transition-colors"
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
        <div className="text-center bg-slate-50 dark:bg-white/[0.04] rounded-xl py-2 px-1 border border-slate-100 dark:border-white/[0.06]">
            <p className={cn("text-xs font-black leading-none italic", color)}>{value}</p>
            <p className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-tighter mt-1">{label}</p>
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
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm dark:shadow-none">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.01]">
                            <th className="text-left px-5 py-4 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Proyecto</th>
                            <th className="text-left px-5 py-4 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Tipo</th>
                            <th className="text-left px-5 py-4 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Estado</th>
                            <th className="text-center px-5 py-4 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Total</th>
                            <th className="text-center px-5 py-4 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Disp.</th>
                            <th className="text-center px-5 py-4 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Res.</th>
                            <th className="text-center px-5 py-4 text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Vend.</th>
                            <th className="px-5 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {projects.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-5 py-4">
                                    <Link href={`${projectBasePath}/${p.id}`} className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-500/5 flex items-center justify-center flex-shrink-0 overflow-hidden border border-brand-500/10 shadow-sm shadow-brand-500/5 group-hover:scale-105 transition-transform">
                                            {p.imagenPortada ? (
                                                <Image src={p.imagenPortada} alt={p.nombre} width={44} height={44} className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-5 h-5 text-brand-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-black text-slate-900 dark:text-zinc-100 group-hover:text-brand-500 transition-colors uppercase tracking-tight italic">{p.nombre}</p>
                                            {p.ubicacion && (
                                                <p className="text-xs font-bold text-slate-400 dark:text-white/20 flex items-center gap-1.5 uppercase tracking-tight mt-0.5">
                                                    <MapPin className="w-3 h-3" /> {p.ubicacion}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                </td>
                                <td className="px-5 py-4 text-[13px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-tight italic">{tipoLabels[p.tipo] || p.tipo}</td>
                                <td className="px-5 py-4">
                                    <span className={cn("text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-tighter border shadow-sm", estadoConfig[p.estado]?.class || "bg-slate-500/10 text-slate-400 border-slate-500/20")}>
                                        {estadoConfig[p.estado]?.label || p.estado}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-center text-[13px] font-black italic">{p.unidades?.total || 0}</td>
                                <td className="px-5 py-4 text-center text-[13px] font-black text-emerald-500 italic">{p.unidades?.disponibles || 0}</td>
                                <td className="px-5 py-4 text-center text-[13px] font-black text-amber-500 italic">{p.unidades?.reservadas || 0}</td>
                                <td className="px-5 py-4 text-center text-[13px] font-black text-rose-500 italic">{p.unidades?.vendidas || 0}</td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Link href={`${projectBasePath}/${p.id}`} className="p-2 inline-flex rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-white/30 hover:text-brand-500 transition-colors">
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
