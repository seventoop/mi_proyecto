import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera, Globe, LayoutTemplate, MapPin } from "lucide-react";
import { getPublicProjectShowcaseBySlug } from "@/lib/project-showcase";
import MasterplanViewer from "@/components/masterplan/masterplan-viewer";
import UnitsGridPublic, { type PublicUnitItem } from "@/components/public/units-grid-public";
import type { MasterplanUnit } from "@/lib/masterplan-store";

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

    const view = searchParams.view === "mapa" ? "mapa" : "plano";
    const hasMap = project.mapCenterLat != null && project.mapCenterLng != null;
    const hasTours = project.tours.some((tour) => tour.sceneCount > 0);
    // Single-source plan asset: prefer real masterplan SVG, fallback to overlay image.
    // Never both (avoids duplicated/misaligned layers in the viewer).
    const planAsset = project.masterplanSvg
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(project.masterplanSvg)}`
        : project.overlayUrl || null;

    const gridUnits: PublicUnitItem[] = project.units.map((u) => ({
        id: u.id,
        numero: u.numero,
        estado: u.estado,
        superficie: u.superficie,
        precio: u.precio,
        moneda: u.moneda,
        orientacion: u.orientacion,
        esEsquina: u.esEsquina,
        etapaNombre: u.etapaNombre,
        manzanaNombre: u.manzanaNombre,
    }));

    return (
        <div className="min-h-screen bg-background pt-24 pb-16">
            <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-3">
                            <Link
                                href={`/proyectos/${params.slug}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver al proyecto
                            </Link>
                        </div>
                        <p className="text-sm text-muted-foreground">{project.nombre}</p>
                        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                            {view === "mapa" ? "Ubicación del proyecto" : "Masterplan del proyecto"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1">
                        <Link
                            href={`/proyectos/${params.slug}/masterplan?view=plano`}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                                view === "plano"
                                    ? "bg-brand-500 text-white"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <LayoutTemplate className="h-4 w-4" />
                            Plano
                        </Link>
                        {hasMap && (
                            <Link
                                href={`/proyectos/${params.slug}/masterplan?view=mapa`}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                                    view === "mapa"
                                        ? "bg-brand-500 text-white"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Globe className="h-4 w-4" />
                                Mapa
                            </Link>
                        )}
                        {hasTours && (
                            <Link
                                href={`/proyectos/${params.slug}/tour360`}
                                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground transition-all hover:text-foreground"
                            >
                                <Camera className="h-4 w-4" />
                                Tour 360
                            </Link>
                        )}
                    </div>
                </div>

                {view === "plano" && (
                    <>
                        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
                            {[
                                ["Disponible", "bg-emerald-500"],
                                ["Reservado", "bg-amber-500"],
                                ["Vendido", "bg-rose-500"],
                                ["Bloqueado", "bg-slate-400"],
                            ].map(([label, tone]) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground"
                                >
                                    <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
                                    {label}
                                </span>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-sm">
                            {planAsset ? (
                                <div className="h-[78vh] min-h-[560px] w-full bg-white">
                                    <MasterplanViewer
                                        proyectoId={project.id}
                                        modo="public"
                                        canEdit={false}
                                        initialUnits={project.units.map((unit): MasterplanUnit => {
                                            let parsedCoords: any = null;
                                            if (unit.coordenadasMasterplan) {
                                                try {
                                                    parsedCoords = JSON.parse(unit.coordenadasMasterplan);
                                                } catch {}
                                            }
                                            return {
                                                ...unit,
                                                estado: unit.estado as MasterplanUnit["estado"],
                                                path: parsedCoords?.path,
                                                cx: parsedCoords?.cx ?? parsedCoords?.center?.x,
                                                cy: parsedCoords?.cy ?? parsedCoords?.center?.y,
                                                geoJSON: unit.coordenadasMasterplan,
                                            };
                                        })}
                                        backgroundAssetUrl={planAsset}
                                    />
                                </div>
                            ) : (
                                <div className="flex h-[60vh] min-h-[400px] w-full items-center justify-center text-slate-400">
                                    Este proyecto aún no tiene un plano público visible.
                                </div>
                            )}
                        </div>

                        <div className="mt-12">
                            <div className="mb-6 max-w-2xl">
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    Lotes y unidades
                                </p>
                                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                    Listado completo del proyecto
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Filtrá por estado, ordená por precio o superficie y abrí cada lote para ver el detalle.
                                </p>
                            </div>
                            <UnitsGridPublic
                                units={gridUnits}
                                slug={params.slug}
                                mode="full"
                                pageSize={12}
                            />
                        </div>
                    </>
                )}

                {view === "mapa" && hasMap && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                            <iframe
                                src={`https://maps.google.com/maps?q=${project.mapCenterLat},${project.mapCenterLng}&z=${project.mapZoom || 16}&output=embed`}
                                className="h-[75vh] min-h-[560px] w-full border-0"
                                loading="lazy"
                                title={`Mapa de ${project.nombre}`}
                            />
                        </div>
                        <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div>
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    Ubicación
                                </p>
                                <h2 className="mt-2 text-2xl font-black text-foreground">{project.nombre}</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {project.ubicacion || "Ubicación general del proyecto"}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-background p-4">
                                <p className="font-bold text-foreground">Inventario visible</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {project.stats.availableUnits} disponibles, {project.stats.reservedUnits} reservados y {project.stats.soldUnits} vendidos.
                                </p>
                            </div>
                            <Link
                                href={`/proyectos/${params.slug}/masterplan?view=plano`}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 font-bold text-white transition-colors hover:bg-brand-400"
                            >
                                <LayoutTemplate className="h-4 w-4" />
                                Ver plano
                            </Link>
                            <Link
                                href={`/proyectos/${params.slug}#contacto`}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 font-bold text-foreground transition-colors hover:bg-muted"
                            >
                                <MapPin className="h-4 w-4" />
                                Consultar proyecto
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
