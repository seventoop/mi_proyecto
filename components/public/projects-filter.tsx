"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ArrowDownUp } from "lucide-react";
import { Proyecto } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import ProjectCard from "./project-card";
import { useLanguage } from "@/components/providers/language-provider";

interface ProjectsFilterProps {
    initialProjects: (Proyecto & {
        _count: { unidades: number };
        unidades: { precio: number; moneda: string }[];
    })[];
}

export default function ProjectsFilter({ initialProjects }: ProjectsFilterProps) {
    const { dictionary: t } = useLanguage();
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("TODOS");
    const [filterStatus, setFilterStatus] = useState<string>("TODOS");

    // Derived state
    const filteredProjects = initialProjects.filter((p) => {
        const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
            p.ubicacion?.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === "TODOS" || p.tipo === filterType;
        const matchStatus = filterStatus === "TODOS" || p.estado === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    return (
        <div className="space-y-8">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
                {/* Search */}
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t.projects.filter.searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
                    />
                </div>

                {/* Type Filter */}
                <div className="relative">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
                    >
                        <option value="TODOS">{t.projects.filter.typeAll}</option>
                        <option value="URBANIZACION">{t.projects.filter.typeUrbanization}</option>
                        <option value="EDIFICIO">{t.projects.filter.typeBuilding}</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:outline-none focus:border-brand-500/50 appearance-none cursor-pointer"
                    >
                        <option value="TODOS">{t.projects.filter.statusAll}</option>
                        <option value="PLANIFICACION">{t.projects.filter.statusPlanning}</option>
                        <option value="EN_DESARROLLO">{t.projects.filter.statusDeveloping}</option>
                        <option value="ENTREGADO">{t.projects.filter.statusDelivered}</option>
                    </select>
                </div>
            </div>

            {/* Results Grid */}
            <div className="min-h-[400px]">
                {filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProjects.map((project, idx) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <ProjectCard project={project} />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t.projects.filter.noResults}</h3>
                        <p className="text-slate-400">{t.projects.filter.noResultsDesc}</p>
                        <button
                            onClick={() => { setSearch(""); setFilterType("TODOS"); setFilterStatus("TODOS"); }}
                            className="mt-4 text-brand-400 hover:text-brand-300 font-medium"
                        >
                            {t.projects.filter.clearFilters}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
