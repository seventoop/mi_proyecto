import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPublicProjectShowcaseBySlug } from "@/lib/project-showcase";
import { stripSvgLabels } from "@/lib/svg-strip-labels";
import MasterplanCanvas from "@/components/public/masterplan-canvas";
import UnitsGridPublic, { type PublicUnitItem } from "@/components/public/units-grid-public";
import ContactForm from "@/components/public/contact-form";
import type { MasterplanUnit } from "@/lib/masterplan-store";

export const metadata: Metadata = {
    title: "Masterplan | Seventoop",
};

export default async function PublicMasterplanPage({ params }: { params: { slug: string } }) {
    const project = await getPublicProjectShowcaseBySlug(params.slug);
    if (!project) notFound();

    const hasMap = project.mapCenterLat != null && project.mapCenterLng != null;
    const hasTour360 = project.tours.some((tour) => tour.sceneCount > 0);

    // Single source of truth for the plan asset. Strip <text>/labels and
    // colored fills from the SVG so it never duplicates the colored unit
    // polygons that are drawn on top of it.
    const cleanedSvg = stripSvgLabels(project.masterplanSvg);
    const planAsset = cleanedSvg
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanedSvg)}`
        : project.overlayUrl || null;

    const initialUnits: MasterplanUnit[] = project.units.map((unit): MasterplanUnit => {
        let parsed: any = null;
        if (unit.coordenadasMasterplan) {
            try { parsed = JSON.parse(unit.coordenadasMasterplan); } catch {}
        }
        return {
            ...unit,
            estado: unit.estado as MasterplanUnit["estado"],
            path: parsed?.path,
            cx: parsed?.cx ?? parsed?.center?.x,
            cy: parsed?.cy ?? parsed?.center?.y,
            geoJSON: unit.coordenadasMasterplan,
        };
    });

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
            <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <Link
                            href={`/proyectos/${params.slug}`}
                            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al proyecto
                        </Link>
                        <p className="text-sm text-muted-foreground">{project.nombre}</p>
                        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                            Masterplan interactivo
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Cambiá entre <strong className="text-foreground">Plano</strong> y{" "}
                            <strong className="text-foreground">Mapa</strong> para ver los lotes sobre el plano técnico
                            o sobre la ubicación real. Hacé click en cualquier lote para consultar.
                        </p>
                    </div>
                </div>

                <MasterplanCanvas
                    proyectoId={project.id}
                    units={initialUnits}
                    planAsset={planAsset}
                    mapCenterLat={project.mapCenterLat}
                    mapCenterLng={project.mapCenterLng}
                    mapZoom={project.mapZoom}
                    hasMap={hasMap}
                    hasTour360={hasTour360}
                    slug={params.slug}
                />

                <section className="mt-14">
                    <div className="mb-6 max-w-2xl">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                            Lotes y unidades
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                            Listado completo del proyecto
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Filtrá por estado, buscá por código, ordená por precio o superficie y consultá el lote que te interese.
                        </p>
                    </div>
                    <UnitsGridPublic
                        units={gridUnits}
                        slug={params.slug}
                        mode="full"
                        pageSize={12}
                    />
                </section>

                <section id="contacto" className="mt-16 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <div className="mb-6 max-w-2xl">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                            Consultá un lote
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                            Hablemos de {project.nombre}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Si seleccionás un lote desde el plano o la grilla, lo vamos a anclar acá automáticamente.
                        </p>
                    </div>
                    <ContactForm proyectoId={project.id} origen="WEB_MASTERPLAN" />
                </section>
            </div>
        </div>
    );
}
