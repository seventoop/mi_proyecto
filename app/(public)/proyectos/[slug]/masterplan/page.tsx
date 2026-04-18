import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera, Globe, LayoutTemplate, MapPin } from "lucide-react";
import { getPublicProjectShowcaseBySlug } from "@/lib/project-showcase";

function formatCurrency(value: number | null, currency = "USD") {
    if (value == null || !Number.isFinite(value)) return "Consultar";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

function getStateTone(estado: string) {
    switch (estado) {
        case "DISPONIBLE":
            return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        case "RESERVADA":
            return "bg-amber-500/10 text-amber-600 border-amber-500/20";
        case "VENDIDA":
            return "bg-rose-500/10 text-rose-600 border-rose-500/20";
        case "BLOQUEADA":
            return "bg-slate-400/15 text-slate-600 border-slate-400/20";
        default:
            return "bg-slate-600/10 text-slate-500 border-slate-500/20";
    }
}

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
    const planAsset = project.masterplanSvg || project.overlayUrl || null;
    const planAssetIsSvg = Boolean(project.masterplanSvg);
    const visibleUnits = [...project.units].sort((a, b) => {
        const byStage = (a.etapaNombre || "").localeCompare(b.etapaNombre || "", "es");
        if (byStage !== 0) return byStage;
        const byBlock = (a.manzanaNombre || "").localeCompare(b.manzanaNombre || "", "es");
        if (byBlock !== 0) return byBlock;
        return a.numero.localeCompare(b.numero, "es", { numeric: true });
    });

    return (
        <div className="min-h-screen bg-background pt-24 pb-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-3">
                            <Link
                                href={`/proyectos/${params.slug}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Volver al proyecto
                            </Link>
                        </div>
                        <p className="text-sm text-muted-foreground">{project.nombre}</p>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                            {view === "mapa" ? "Ubicación del proyecto" : "Masterplan del proyecto"}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground">
                            {view === "mapa"
                                ? "Ubicación general del proyecto y acceso al masterplan público."
                                : "Plano público del proyecto con estados visibles para compradores."}
                        </p>
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
                            <LayoutTemplate className="w-4 h-4" />
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
                                <Globe className="w-4 h-4" />
                                Mapa
                            </Link>
                        )}
                    </div>
                </div>

                {view === "plano" && (
                    <>
                        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
                            {[
                                ["Disponible", "bg-emerald-500"],
                                ["Reservado", "bg-amber-500"],
                                ["Vendido", "bg-rose-500"],
                                ["Bloqueado", "bg-slate-400"],
                                ["Suspendido", "bg-slate-600"],
                            ].map(([label, tone]) => (
                                <span key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-muted-foreground">
                                    <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
                                    {label}
                                </span>
                            ))}
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                                <div className="border-b border-border px-5 py-4">
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                        Plano cargado
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Se muestra el plano real publicado desde el dashboard del proyecto.
                                    </p>
                                </div>
                                <div className="flex min-h-[560px] items-center justify-center bg-slate-950/95 p-4">
                                    {planAsset ? (
                                        planAssetIsSvg ? (
                                            <iframe
                                                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(planAsset)}`}
                                                title={`Plano de ${project.nombre}`}
                                                className="h-[72vh] min-h-[520px] w-full rounded-2xl bg-white"
                                            />
                                        ) : (
                                            <img
                                                src={planAsset}
                                                alt={`Plano de ${project.nombre}`}
                                                className="max-h-[72vh] w-full rounded-2xl object-contain"
                                            />
                                        )
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-slate-700 text-slate-400">
                                            Este proyecto aún no tiene un plano público visible.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-border bg-card shadow-sm">
                                <div className="border-b border-border px-5 py-4">
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                        Lotes y unidades
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Listado público simple con estado, superficie y precio.
                                    </p>
                                </div>
                                <div className="max-h-[72vh] overflow-y-auto p-4">
                                    <div className="space-y-3">
                                        {visibleUnits.length > 0 ? (
                                            visibleUnits.map((unit) => (
                                                <Link
                                                    key={unit.id}
                                                    href={`/proyectos/${params.slug}/unidades/${unit.id}`}
                                                    className="block rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-bold text-foreground">Unidad {unit.numero}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {[unit.etapaNombre, unit.manzanaNombre].filter(Boolean).join(" · ")}
                                                            </p>
                                                        </div>
                                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${getStateTone(unit.estado)}`}>
                                                            {unit.estado.replace(/_/g, " ")}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Superficie</p>
                                                            <p className="font-semibold text-foreground">
                                                                {unit.superficie ? `${unit.superficie} m²` : "Consultar"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Precio</p>
                                                            <p className="font-semibold text-foreground">
                                                                {formatCurrency(unit.precio, unit.moneda)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                                                No hay lotes o unidades públicas visibles para este proyecto.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
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
                                <LayoutTemplate className="w-4 h-4" />
                                Ver plano
                            </Link>
                            {hasTours && (
                                <Link
                                    href={`/proyectos/${params.slug}/tour360`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 font-bold text-foreground transition-colors hover:bg-muted"
                                >
                                    <Camera className="w-4 h-4" />
                                    Ir al tour 360
                                </Link>
                            )}
                            <a
                                href={`/proyectos/${params.slug}#contacto`}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 font-bold text-foreground transition-colors hover:bg-muted"
                            >
                                <MapPin className="w-4 h-4" />
                                Consultar proyecto
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
