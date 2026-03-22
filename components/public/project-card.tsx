"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, MapPin } from "lucide-react";
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

const EDITOR_ROLES = ["ADMIN", "DESARROLLADOR", "VENDEDOR"] as const;

export default function ProjectCard({ project }: { project: ProjectListItem }) {
    const { data: session } = useSession();

    const canEdit = !!session?.user?.role && EDITOR_ROLES.includes(session.user.role as (typeof EDITOR_ROLES)[number]);
    const publicHref = `/proyectos/${project.slug || project.id}`;
    const editHref = `/dashboard/proyectos/${project.slug || project.id}/editar`;

    return (
        <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] transition-all duration-400 hover:border-brand-orange/30 hover:bg-white/[0.05]">
            <Link href={publicHref} className="block">
                <div className="relative aspect-[16/10] overflow-hidden">
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#060a19] via-transparent to-transparent" />
                    <img
                        src={project.imagenPortada || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop"}
                        alt={project.nombre}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 z-20 flex gap-2">
                        {project.tipo && (
                            <span className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                                {TYPE_LABELS[project.tipo] || project.tipo}
                            </span>
                        )}
                        {project.invertible && (
                            <span className="rounded-lg bg-emerald-500/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                                Invertible
                            </span>
                        )}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 z-20">
                        <h3 className="text-lg font-black leading-tight text-white transition-colors duration-300 group-hover:text-brand-orange">
                            {project.nombre}
                        </h3>
                        {project.ubicacion && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-300/80">
                                <MapPin className="h-3 w-3 text-brand-orange/80" />
                                {project.ubicacion}
                            </p>
                        )}
                    </div>
                </div>
            </Link>

            <div className="flex flex-1 flex-col p-4">
                <Link href={publicHref} className="block flex-1 space-y-3">
                    {project.descripcion && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {project.descripcion}
                        </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="text-lg font-black leading-none text-white">{project.availableUnits}</p>
                                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">disponibles</p>
                            </div>
                            {project.minPrice && (
                                <div className="border-l border-white/10 pl-4">
                                    <p className="text-sm font-bold leading-none text-slate-200">
                                        ${project.minPrice.toLocaleString()}
                                    </p>
                                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                        desde · {project.currency}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Link>

                {canEdit && (
                    <Link
                        href={editHref}
                        className="mt-4 inline-flex self-end rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-brand-orangeDark hover:scale-[1.02] active:scale-95"
                    >
                        <span className="flex items-center gap-2">
                            Editar proyecto
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
}
