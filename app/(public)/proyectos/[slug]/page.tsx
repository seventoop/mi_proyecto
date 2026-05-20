import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowRight,
    Building2,
    Camera,
    CheckCircle2,
    FileText,
    Globe,
    Image as ImageIcon,
    LayoutGrid,
    MapPin,
    MessageSquare,
    Quote,
    ShieldCheck,
    Trees,
} from "lucide-react";
import ContactActions from "@/components/public/contact-actions";
import ContactForm from "@/components/public/contact-form";
import PublicProjectGallery from "@/components/public/project-gallery";
import ProjectPreviewViewer from "@/components/public/project-preview-viewer";
import UnitsGridPublic, { type PublicUnitItem } from "@/components/public/units-grid-public";
import {
    NORMALIZED_UNIT_ESTADO,
    type NormalizedUnitEstado,
} from "@/lib/public-projects";
import {
    getPublicProjectShowcaseBySlug,
    type PublicProjectShowcase,
} from "@/lib/project-showcase";
import { stripSvgLabels, extractSvgViewBox } from "@/lib/svg-strip-labels";
import { getRequestDictionary, getRequestLocale } from "@/lib/i18n/server";
import { formatMessage, formatCurrency as formatLocaleCurrency } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

const DUMMY_CONTENT_PATTERN = /(dummy|demo|brochure|placeholder|sample|test|archivo de ejemplo|pdf file)/i;

function isLikelyDummyContent(value: string | null | undefined) {
    if (!value) return false;
    return DUMMY_CONTENT_PATTERN.test(value);
}

function getInventorySummary(project: PublicProjectShowcase) {
    const summary: Record<NormalizedUnitEstado, number> = {
        [NORMALIZED_UNIT_ESTADO.DISPONIBLE]: 0,
        [NORMALIZED_UNIT_ESTADO.RESERVADA]: 0,
        [NORMALIZED_UNIT_ESTADO.VENDIDA]: 0,
        [NORMALIZED_UNIT_ESTADO.BLOQUEADA]: 0,
        [NORMALIZED_UNIT_ESTADO.SUSPENDIDO]: 0,
    };
    for (const unit of project.units) {
        const estado = unit.estado as NormalizedUnitEstado;
        summary[estado] = (summary[estado] ?? 0) + 1;
    }
    return {
        total: project.stats.totalUnits,
        available: summary[NORMALIZED_UNIT_ESTADO.DISPONIBLE],
        reserved: summary[NORMALIZED_UNIT_ESTADO.RESERVADA],
        sold: summary[NORMALIZED_UNIT_ESTADO.VENDIDA],
        blocked:
            summary[NORMALIZED_UNIT_ESTADO.BLOQUEADA] +
            summary[NORMALIZED_UNIT_ESTADO.SUSPENDIDO],
    };
}

function getProjectHighlights(
    project: PublicProjectShowcase,
    copy: Dictionary["projectDetail"],
    locale: ReturnType<typeof getRequestLocale>,
) {
    const highlights: Array<{ label: string; value: string; icon: typeof Building2 }> = [];
    if (project.stats.totalUnits > 0) {
        highlights.push({ label: copy.unitsPublished, value: `${project.stats.totalUnits}`, icon: Building2 });
    }
    if (project.stats.availableUnits > 0) {
        highlights.push({ label: copy.inventoryStatuses.available, value: `${project.stats.availableUnits}`, icon: CheckCircle2 });
    }
    if (project.stats.minPrice != null) {
        highlights.push({
            label: copy.unitPriceFrom,
            value: formatLocaleCurrency(project.stats.minPrice, locale, "USD"),
            icon: ShieldCheck,
        });
    }
    if (project.stats.minSurface != null) {
        highlights.push({ label: copy.unitSurfaceFrom, value: `${project.stats.minSurface} m²`, icon: Trees });
    }
    return highlights.slice(0, 4);
}

async function getProject(slugOrId: string) {
    return getPublicProjectShowcaseBySlug(slugOrId);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const dictionary = await getRequestDictionary();
    const copy = dictionary.projectDetail;
    const project = await getProject(params.slug);
    if (!project) return { title: "SevenToop" };

    const location = project.ubicacion
        ? formatMessage(copy.locationJoiner, { location: project.ubicacion })
        : "";

    return {
        title: project.nombre,
        description:
            project.descripcion?.slice(0, 160) ||
            formatMessage(copy.metadataFallback, { projectName: project.nombre, location }),
        openGraph: { images: [project.imageUrl] },
    };
}

export default async function ProjectLandingPage({ params }: { params: { slug: string } }) {
    const locale = getRequestLocale();
    const dictionary = await getRequestDictionary();
    const copy = dictionary.projectDetail;
    console.info("[public-project-page] request", { routeParam: params.slug });
    const project = await getProject(params.slug);
    if (!project) notFound();

    console.info("[public-project-page] resolved", {
        routeParam: params.slug,
        id: project.id,
        slug: project.slug,
        nombre: project.nombre,
        masterplanSvgBytes: project.masterplanSvg?.length ?? 0,
        overlayUrl: project.overlayUrl ?? null,
        mapCenter: project.mapCenterLat != null && project.mapCenterLng != null
            ? `${project.mapCenterLat},${project.mapCenterLng}` : null,
        unitsTotal: project.units.length,
        unitsAvailable: project.stats.availableUnits,
        infrastructures: project.infrastructures.length,
        masterplanAvailable: project.masterplanAvailable,
    });

    const inventory = getInventorySummary(project);
    const highlights = getProjectHighlights(project, copy, locale);
    const realDocuments = project.documents.filter(
        (d) => !isLikelyDummyContent(d.title) && !isLikelyDummyContent(d.url) && Boolean(d.url?.trim()),
    );
    const realTestimonials = project.testimonials.filter(
        (t) => !isLikelyDummyContent(t.author) && !isLikelyDummyContent(t.text) && Boolean(t.text?.trim()),
    );
    const hasMap = project.mapCenterLat != null && project.mapCenterLng != null;
    const hasInfrastructure = project.infrastructures.length > 0;
    const hasGallery = project.images.length > 0;
    const hasMasterplan = project.masterplanAvailable || Boolean(project.overlayUrl);
    const hasTours = project.tours.some((tour) => tour.sceneCount > 0);
    const hasDocuments = realDocuments.length > 0;
    const hasTestimonials = realTestimonials.length > 0;
    const hasUnits = project.units.length > 0;
    const mapSrc = hasMap
        ? `https://maps.google.com/maps?q=${project.mapCenterLat},${project.mapCenterLng}&z=${project.mapZoom || 16}&output=embed`
        : null;

    // Two prepared assets from the same source SVG:
    //   - planoSvg: only <text> removed → full plano with lot fills (Plano view)
    //   - overlaySvg: <text> + fills neutralized → faint context layer (Mapa view)
    // Falls back to project.overlayUrl (raster) if no SVG is uploaded.
    const planoSvg = stripSvgLabels(project.masterplanSvg);
    const overlaySvg = stripSvgLabels(project.masterplanSvg, { neutralizeFills: true });
    const planAssetFull = planoSvg
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(planoSvg)}`
        : project.overlayUrl || null;
    const planAssetOverlay = overlaySvg
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(overlaySvg)}`
        : project.overlayUrl || null;
    const planSvgViewBox = extractSvgViewBox(project.masterplanSvg);

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
        <div className="bg-background text-foreground">
            {/* 1. HERO */}
            <section className="relative overflow-hidden border-b border-border">
                <div className="absolute inset-0">
                    <img src={project.imageUrl} alt={project.imageAlt} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/35" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/15" />
                </div>
                <div className="relative mx-auto flex min-h-[420px] max-w-7xl flex-col justify-end px-4 py-12 sm:min-h-[480px] sm:px-10 sm:py-14 lg:px-16">
                    <div className="max-w-3xl space-y-6">
                        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                                {project.tipo.replace(/_/g, " ")}
                            </span>
                            {inventory.available > 0 && (
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-4 py-2 text-emerald-200 backdrop-blur">
                                    {formatMessage(copy.available, { count: inventory.available })}
                                </span>
                            )}
                        </div>
                        <div className="space-y-4">
                            <p className="flex items-center gap-2 text-sm text-white/80 sm:text-base">
                                <MapPin className="h-4 w-4 flex-shrink-0 text-brand-400" />
                                {project.ubicacion || copy.locationPending}
                            </p>
                            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                                {project.nombre}
                            </h1>
                            {project.descripcion && (
                                <p className="max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                                    {project.descripcion}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            {hasMasterplan && (
                                <Link
                                    href={`/proyectos/${params.slug}/masterplan`}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3.5 font-bold text-white shadow-glow transition-all hover:scale-[1.02] hover:bg-brand-400"
                                >
                                    <Globe className="h-4 w-4" />
                                    {copy.openMasterplan}
                                </Link>
                            )}
                            <a
                                href="#contacto"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-bold text-white/90 backdrop-blur transition-all hover:scale-[1.02] hover:border-white/30 hover:text-white"
                            >
                                <MessageSquare className="h-4 w-4" />
                                {copy.consultProject}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. RESUMEN COMERCIAL */}
            <section className="border-b border-border bg-card/40">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-10 lg:px-16">
                    {highlights.length > 0 && (
                        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {highlights.map((item) => (
                                <div key={item.label} className="rounded-3xl border border-border bg-background/70 p-5 shadow-sm">
                                    <item.icon className="mb-4 h-5 w-5 text-brand-400" />
                                    <p className="text-2xl font-black text-foreground">{item.value}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
                        <div className="space-y-3">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                {copy.commercialSummary}
                            </p>
                            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                {copy.generalInfo}
                            </h2>
                            <p className="text-base leading-8 text-muted-foreground sm:text-lg">
                                {project.descripcion || copy.defaultDescription}
                            </p>
                        </div>
                        {inventory.total > 0 && (
                            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    {copy.inventory}
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {[
                                        { label: copy.inventoryStatuses.available, value: inventory.available, tone: "text-emerald-500" },
                                        { label: copy.inventoryStatuses.reserved, value: inventory.reserved, tone: "text-amber-500" },
                                        { label: copy.inventoryStatuses.sold, value: inventory.sold, tone: "text-rose-500" },
                                        { label: copy.inventoryStatuses.blocked, value: inventory.blocked, tone: "text-slate-500" },
                                    ]
                                        .filter((it) => it.value > 0)
                                        .map((it) => (
                                            <div key={it.label} className="rounded-2xl bg-card p-3">
                                                <p className={`text-xl font-black ${it.tone}`}>{it.value}</p>
                                                <p className="text-xs text-muted-foreground">{it.label}</p>
                                            </div>
                                        ))}
                                </div>
                                <p className="mt-4 text-xs text-muted-foreground">
                                    {formatMessage(copy.totalUnits, { count: inventory.total })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 3. Unified preview */}
            {(hasMap || planAssetFull) && (
                <section id="mapa" className="border-b border-border">
                    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-10 sm:py-14 lg:px-16">
                        <div className="mb-8 max-w-3xl">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                {copy.previewEyebrow}
                            </p>
                            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                {copy.previewTitle}
                            </h2>
                            <p className="mt-3 text-base text-muted-foreground">
                                {copy.previewDescription}
                            </p>
                        </div>
                        <ProjectPreviewViewer
                            slug={params.slug}
                            projectName={project.nombre}
                            planAsset={planAssetFull}
                            mapOverlayAsset={planAssetOverlay}
                            planSvgViewBox={planSvgViewBox}
                            mapCenterLat={project.mapCenterLat ?? null}
                            mapCenterLng={project.mapCenterLng ?? null}
                            mapZoom={project.mapZoom ?? null}
                            overlayBounds={project.overlayBounds ?? null}
                            overlayRotation={project.overlayRotation ?? null}
                            units={project.units.map((u) => ({
                                id: u.id,
                                estado: u.estado,
                                coordenadasMasterplan: u.coordenadasMasterplan ?? null,
                            }))}
                            mapImages={project.mapImages.map((m) => ({
                                id: m.id,
                                url: m.url,
                                titulo: m.titulo,
                                lat: m.lat,
                                lng: m.lng,
                                tipo: m.tipo,
                            }))}
                            infrastructures={project.infrastructures.map((i) => ({
                                id: i.id,
                                nombre: i.nombre,
                                categoria: i.categoria,
                                tipo: i.tipo,
                                estado: i.estado,
                                geometriaTipo: i.geometriaTipo,
                                coordenadas: i.coordenadas,
                                colorPersonalizado: i.colorPersonalizado,
                            }))}
                        />
                    </div>
                </section>
            )}

            {/* 4. INFRAESTRUCTURA */}
            {hasInfrastructure && (
                <section className="border-b border-border bg-card/40">
                    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-10 sm:py-14 lg:px-16">
                        <div className="mb-8 max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                {copy.infrastructureEyebrow}
                            </p>
                            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                {copy.infrastructureTitle}
                            </h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {project.infrastructures.map((item) => (
                                <article key={item.id} className="rounded-3xl border border-border bg-background p-5 shadow-sm">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-bold text-foreground">{item.nombre}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {[item.categoria, item.tipo].filter(Boolean).join(" · ")}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-500">
                                            {item.estado.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                    {item.descripcion && (
                                        <p className="mb-4 text-sm leading-7 text-muted-foreground">{item.descripcion}</p>
                                    )}
                                    <div>
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{copy.progress}</span>
                                            <span className="font-semibold text-foreground">{item.porcentajeAvance}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted">
                                            <div
                                                className="h-2 rounded-full bg-brand-500"
                                                style={{ width: `${Math.max(0, Math.min(100, item.porcentajeAvance))}%` }}
                                            />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 5. Internal navigation CTAs */}
            <section id="cta-experiencias" className="border-b border-border">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-10 sm:py-14 lg:px-16">
                    <div className="mb-8 max-w-2xl">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                            {copy.nextEyebrow}
                        </p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                            {copy.nextTitle}
                        </h2>
                        <p className="mt-3 text-sm text-muted-foreground">
                            {copy.nextDescription}
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {hasMasterplan && (
                            <Link
                                href={`/proyectos/${params.slug}/masterplan`}
                                className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                                    <Globe className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground">{copy.masterplanCardTitle}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {copy.masterplanCardDescription}
                                    </p>
                                </div>
                                <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-brand-500 group-hover:text-brand-400">
                                    {copy.open} <ArrowRight className="h-4 w-4" />
                                </span>
                            </Link>
                        )}
                        {hasUnits && (
                            <a
                                href="#lotes"
                                className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                                    <LayoutGrid className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground">{copy.lotsCardTitle}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {formatMessage(copy.lotsCardDescription, { count: inventory.total })}
                                    </p>
                                </div>
                                <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-brand-500 group-hover:text-brand-400">
                                    {copy.goToList} <ArrowRight className="h-4 w-4" />
                                </span>
                            </a>
                        )}
                        {hasGallery && (
                            <a
                                href="#galeria"
                                className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                                    <ImageIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground">{copy.galleryTitle}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {copy.galleryDescription}
                                    </p>
                                </div>
                                <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-brand-500 group-hover:text-brand-400">
                                    {copy.galleryCta} <ArrowRight className="h-4 w-4" />
                                </span>
                            </a>
                        )}
                        {hasMap && (
                            <a
                                href={`https://maps.google.com/?q=${project.mapCenterLat},${project.mapCenterLng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-foreground">{copy.directionsTitle}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {copy.directionsDescription}
                                    </p>
                                </div>
                                <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-brand-500 group-hover:text-brand-400">
                                    {copy.routeCta} <ArrowRight className="h-4 w-4" />
                                </span>
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* 6. Featured units */}
            {hasUnits && (
                <section id="lotes" className="border-b border-border bg-card/20">
                    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-10 sm:py-14 lg:px-16">
                        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                            <div className="max-w-2xl">
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    {copy.lotsEyebrow}
                                </p>
                                <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                    {copy.featuredUnitsEyebrow}
                                </h2>
                                <p className="mt-3 text-sm text-muted-foreground">
                                    {copy.featuredUnitsDescription}
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                                {hasMasterplan && (
                                    <Link
                                        href={`/proyectos/${params.slug}/masterplan`}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-glow transition-all hover:scale-[1.02] hover:bg-brand-400"
                                    >
                                        <Globe className="h-4 w-4" />
                                        {copy.openMasterplan}
                                    </Link>
                                )}
                                <Link
                                    href={`/proyectos/${params.slug}/masterplan#lotes`}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    {copy.allUnitsCta}
                                </Link>
                            </div>
                        </div>
                        <UnitsGridPublic
                            units={gridUnits}
                            slug={params.slug}
                            mode="compact"
                            pageSize={6}
                            seeAllHref={`/proyectos/${params.slug}/masterplan`}
                        />
                    </div>
                </section>
            )}

            {/* Supporting material */}
            {(hasDocuments || hasTestimonials) && (
                <section className="border-b border-border">
                    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-10 sm:py-14 lg:grid-cols-2 lg:px-16">
                        {hasDocuments && (
                            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-brand-400" />
                                    <h2 className="text-2xl font-black text-foreground">{copy.documentsTitle}</h2>
                                </div>
                                <div className="space-y-3">
                                    {realDocuments.slice(0, 6).map((document) => (
                                        <a
                                            key={document.id}
                                            href={document.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:bg-brand-500/5"
                                        >
                                            <div>
                                                <p className="font-bold text-foreground">{document.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {document.type} · {document.source}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-brand-500" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasTestimonials && (
                            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <Quote className="h-5 w-5 text-brand-400" />
                                    <h2 className="text-2xl font-black text-foreground">{copy.testimonialsTitle}</h2>
                                </div>
                                <div className="space-y-4">
                                    {realTestimonials.slice(0, 3).map((testimonial) => (
                                        <article key={testimonial.id} className="rounded-2xl border border-border bg-card p-5">
                                            <p className="text-base leading-7 text-foreground">“{testimonial.text}”</p>
                                            <div className="mt-4">
                                                <p className="font-bold text-foreground">{testimonial.author}</p>
                                                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 7. Gallery */}
            {hasGallery && (
                <section id="galeria" className="border-b border-border bg-card/20">
                    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-10 sm:py-14 lg:px-16">
                        <div className="mb-8 max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                {copy.galleryEyebrow}
                            </p>
                            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                {copy.visualMaterialTitle}
                            </h2>
                        </div>
                    </div>
                    <PublicProjectGallery imagenes={project.images} />
                </section>
            )}

            {/* 8. CONTACTO */}
            <section id="contacto" className="mx-auto max-w-7xl px-4 py-14 sm:px-10 sm:py-16 lg:px-16">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                            {copy.commercialCtaEyebrow}
                        </p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground">
                            {formatMessage(copy.contactTitle, { projectName: project.nombre })}
                        </h2>
                        <p className="mt-4 text-base leading-8 text-muted-foreground">
                            {copy.contactDescription}
                        </p>
                        <div className="mt-8 space-y-4">
                            <div className="rounded-2xl bg-background p-4">
                                <p className="font-bold text-foreground">{copy.projectLabel}</p>
                                <p className="text-sm text-muted-foreground">
                                    {project.nombre}
                                    {project.organizationName ? ` · ${project.organizationName}` : ""}
                                </p>
                            </div>
                            {inventory.total > 0 && (
                                <div className="rounded-2xl bg-background p-4">
                                    <p className="font-bold text-foreground">{copy.visibleInventory}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatMessage(copy.inventorySummary, {
                                            available: inventory.available,
                                            reserved: inventory.reserved,
                                            sold: inventory.sold,
                                        })}
                                    </p>
                                </div>
                            )}
                            <ContactActions />
                        </div>
                    </div>
                    <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                        <ContactForm proyectoId={project.id} origen="WEB_PROYECTO_PUBLICO" />
                    </div>
                </div>
            </section>
        </div>
    );
}
