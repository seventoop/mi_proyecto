"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Layers } from "lucide-react";
import type { ProjectListItem } from "@/app/(public)/proyectos/page";

const TYPE_LABELS: Record<string, string> = {
    URBANIZACION: "Urbanización",
    BARRIO_PRIVADO: "Barrio Privado",
    BARRIO_CERRADO: "Barrio Cerrado",
    EDIFICIO: "Edificio",
    CONDOMINIO: "Condominio",
    LOTEO: "Loteo",
    CHACRA: "Chacra",
    COUNTRY: "Country",
};

export default function ProjectCard({ project }: { project: ProjectListItem }) {
    return (
        <Link
            href={`/proyectos/${project.slug || project.id}`}
            className="group block rounded-2xl overflow-hidden bg-white/[0.03] border border-white/8 hover:border-brand-orange/30 transition-all duration-400 hover:bg-white/[0.05] h-full"
        >
            <div className="aspect-[16/10] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[#060a19] via-transparent to-transparent z-10" />
                <img
                    src={project.imagenPortada || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop"}
                    alt={project.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-3 left-3 z-20 flex gap-2">
                    {project.tipo && (
                        <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                            {TYPE_LABELS[project.tipo] || project.tipo}
                        </span>
                    )}
                    {project.invertible && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/80 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                            Invertible
                        </span>
                    )}
                </div>
                <div className="absolute bottom-3 left-3 right-3 z-20">
                    <h3 className="text-lg font-black text-white leading-tight group-hover:text-brand-orange transition-colors duration-300">
                        {project.nombre}
                    </h3>
                    {project.ubicacion && (
                        <p className="text-xs text-slate-300/80 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-brand-orange/80" />
                            {project.ubicacion}
                        </p>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-3">
                {project.descripcion && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {project.descripcion}
                    </p>
                )}

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-lg font-black text-white leading-none">{project.availableUnits}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">disponibles</p>
                        </div>
                        {project.minPrice && (
                            <div className="pl-4 border-l border-white/10">
                                <p className="text-sm font-bold text-slate-200 leading-none">
                                    ${project.minPrice.toLocaleString()}
                                </p>
                                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                                    desde · {project.currency}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-brand-orange group-hover:border-brand-orange transition-all">
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
