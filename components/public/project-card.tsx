"use client";

import Link from "next/link";
import { ArrowRight, MapPin, TrendingUp } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import type { PublicProjectCard } from "@/lib/project-showcase";

interface ProjectCardProps {
    project: PublicProjectCard;
}

export default function ProjectCard({ project }: ProjectCardProps) {
    const { dictionary: t } = useLanguage();
    const pricedUnits = (project.inventoryPreview ?? []).filter(
        (unit) => typeof unit.precio === "number"
    );
    const minPrice = pricedUnits.length
        ? Math.min(...pricedUnits.map((u) => u.precio as number))
        : 0;
    const currency = pricedUnits[0]?.moneda || project.inventoryPreview?.[0]?.moneda || "USD";
    const unitCount = project.availableUnits || 0;

    return (
        <Link
            href={`/proyectos/${project.slug || project.id}`}
            className="group block relative rounded-[2rem] overflow-hidden bg-white dark:bg-black border border-slate-200 dark:border-white/5 hover:border-brand-orange/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-orange/10 h-full flex flex-col"
        >
            {/* Image */}
            <div className="aspect-[4/3] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                <img
                    src={project.imageUrl || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop"}
                    alt={project.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 rounded-xl backdrop-blur-md bg-brand-orange text-[10px] font-bold text-white border border-white/20 uppercase tracking-widest shadow-lg">
                        {project.tipo === "URBANIZACION" ? t.search.typeUrbanization :
                         project.tipo === "BARRIO_PRIVADO" ? t.search.typePrivateNeighborhood :
                         project.tipo === "EDIFICIO" ? t.search.typeBuilding :
                         project.tipo === "CONDOMINIO" ? t.search.typeCondo :
                         project.tipo}
                    </span>
                    {project.estado === "EN_DESARROLLO" && (
                        <span className="px-3 py-1.5 rounded-xl backdrop-blur-md bg-brand-yellow text-[10px] font-bold text-brand-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {t.projects.card.launch}
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-black text-brand-gray dark:text-brand-surface mb-2 group-hover:text-brand-orange transition-colors line-clamp-1">
                    {project.nombre}
                </h3>
                <p className="text-sm text-brand-muted flex items-center gap-1.5 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                    {project.ubicacion || t.projects.card.locationPending}
                </p>

                <p className="text-sm text-foreground/60 line-clamp-2 mb-6 flex-1 leading-relaxed">
                    {project.descripcion || t.projects.card.defaultDescription}
                </p>

                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-2xl font-black text-brand-orange leading-none block">{unitCount}</span>
                            <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">{t.projects.card.available}</span>
                        </div>
                        {minPrice > 0 && (
                            <div className="text-right">
                                <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider block">{t.projects.card.from}</span>
                                <span className="text-xl font-black text-brand-gray dark:text-brand-surface">
                                    {minPrice.toLocaleString()} {currency}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-brand-orange uppercase tracking-widest">{t.projects.card.viewProject}</span>
                        <div className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white transition-all shadow-lg shadow-brand-orange/20 group-hover:bg-brand-orangeDark">
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
