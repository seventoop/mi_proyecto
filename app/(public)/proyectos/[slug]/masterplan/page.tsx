import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Globe, LayoutTemplate } from "lucide-react";
import { getPublicProjectShowcaseBySlug } from "@/lib/project-showcase";
import MasterplanViewer from "@/components/masterplan/masterplan-viewer";

const MasterplanMap = dynamic(
    () => import("@/components/masterplan/masterplan-map"),
    { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-slate-500">Cargando mapa...</div> }
);

async function getProject(slugOrId: string) {
    return getPublicProjectShowcaseBySlug(slugOrId);
}

export const metadata: Metadata = {
    title: "Masterplan | Seventoop",
};

export default async function PublicMasterplanPage({
    params,
    searchParams,
}: {
    params: { slug: string };
    searchParams: { view?: string };
}) {
    const project = await getProject(params.slug);
    if (!project) notFound();

    // Default to "mapa" (Google Maps) when arriving from "Mapa Interactivo"
    const view = searchParams.view === "plano" ? "plano" : "mapa";

    const tours360ForMap = (project.tours ?? []).map((t: any) => ({
        tourId: t.id,
        nombre: t.nombre,
        thumbnailUrl: t.scenes?.[0]?.imageUrl ?? t.previewImages?.[0] ?? null,
        lat: null,
        lng: null,
        unidadId: "",
    }));

    return (
        <div className="h-screen w-screen bg-[#080808] flex flex-col overflow-hidden">
            {/* ── Header ── */}
            <div className="h-14 flex-shrink-0 border-b border-white/8 flex items-center justify-between px-4 sm:px-6 bg-[#0E0E0E] z-50">
                <div className="flex items-center gap-3 min-w-0">
                    <Link
                        href={`/proyectos/${params.slug}`}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500 truncate">{project.nombre}</p>
                        <p className="text-sm font-bold text-white leading-tight">
                            {view === "mapa" ? "Mapa Interactivo" : "Masterplan del Proyecto"}
                        </p>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/8">
                    <Link
                        href={`/proyectos/${params.slug}/masterplan?view=mapa`}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            view === "mapa"
                                ? "bg-brand-500 text-white shadow-glow"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mapa</span>
                    </Link>
                    <Link
                        href={`/proyectos/${params.slug}/masterplan?view=plano`}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            view === "plano"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Plano</span>
                    </Link>
                </div>

                {/* Legend + CTA */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Disponible</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />Reservado</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />Vendido</span>
                    </div>
                    <Link
                        href={`/proyectos/${params.slug}#contacto`}
                        className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold shadow-glow transition-all"
                    >
                        Reservar lote
                    </Link>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 relative overflow-hidden">
                {view === "mapa" ? (
                    <MasterplanMap
                        proyectoId={project.id}
                        modo="public"
                        canEdit={false}
                        centerLat={project.mapCenterLat ?? undefined}
                        centerLng={project.mapCenterLng ?? undefined}
                        mapZoom={project.mapZoom ?? undefined}
                        tours360={tours360ForMap}
                    />
                ) : (
                    <div className="w-full h-full">
                        <MasterplanViewer
                            proyectoId={project.id}
                            modo="public"
                            canEdit={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
