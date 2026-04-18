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
    MapPin,
    MessageSquare,
    Quote,
    ShieldCheck,
    Trees,
} from "lucide-react";
import ContactActions from "@/components/public/contact-actions";
import ContactForm from "@/components/public/contact-form";
import PublicProjectGallery from "@/components/public/project-gallery";
import {
    NORMALIZED_UNIT_ESTADO,
    type NormalizedUnitEstado,
} from "@/lib/public-projects";
import {
    getPublicProjectShowcaseBySlug,
    type PublicProjectShowcase,
} from "@/lib/project-showcase";

const DUMMY_CONTENT_PATTERN = /(dummy|demo|brochure|placeholder|sample|test|archivo de ejemplo|pdf file)/i;

function formatCurrency(value: number | null, currency = "USD") {
    if (value == null || !Number.isFinite(value)) return null;
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

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

function getProjectHighlights(project: PublicProjectShowcase) {
    const highlights: Array<{
        label: string;
        value: string;
        icon: typeof Building2;
    }> = [];

    if (project.stats.totalUnits > 0) {
        highlights.push({
            label: "Unidades publicadas",
            value: `${project.stats.totalUnits}`,
            icon: Building2,
        });
    }

    if (project.stats.availableUnits > 0) {
        highlights.push({
            label: "Disponibles hoy",
            value: `${project.stats.availableUnits}`,
            icon: CheckCircle2,
        });
    }

    if (project.stats.minPrice != null) {
        highlights.push({
            label: "Precio desde",
            value: formatCurrency(project.stats.minPrice) ?? "Consultar",
            icon: ShieldCheck,
        });
    }

    if (project.stats.minSurface != null) {
        highlights.push({
            label: "Superficie desde",
            value: `${project.stats.minSurface} m²`,
            icon: Trees,
        });
    }

    return highlights.slice(0, 4);
}

async function getProject(slugOrId: string) {
    return getPublicProjectShowcaseBySlug(slugOrId);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const project = await getProject(params.slug);

    if (!project) {
        return { title: "Proyecto no encontrado | Seventoop" };
    }

    return {
        title: `${project.nombre} | Seventoop`,
        description:
            project.descripcion?.slice(0, 160) ||
            `Conocé ${project.nombre}${project.ubicacion ? ` en ${project.ubicacion}` : ""}.`,
        openGraph: {
            images: [project.imageUrl],
        },
    };
}

export default async function ProjectLandingPage({ params }: { params: { slug: string } }) {
    console.info("[public-project-page] request", { routeParam: params.slug });
    const project = await getProject(params.slug);

    if (!project) {
        notFound();
    }

    console.info("[public-project-page] resolved", {
        routeParam: params.slug,
        id: project.id,
        slug: project.slug,
        nombre: project.nombre,
    });

    const inventory = getInventorySummary(project);
    const highlights = getProjectHighlights(project);
    const usefulMapImages = project.mapImages.filter(
        (image) =>
            !isLikelyDummyContent(image.url) &&
            (Boolean(image.unidadId) || Boolean(image.titulo?.trim()))
    );
    const realDocuments = project.documents.filter(
        (document) =>
            !isLikelyDummyContent(document.title) &&
            !isLikelyDummyContent(document.url) &&
            Boolean(document.url?.trim())
    );
    const realTestimonials = project.testimonials.filter(
        (testimonial) =>
            !isLikelyDummyContent(testimonial.author) &&
            !isLikelyDummyContent(testimonial.text) &&
            Boolean(testimonial.text?.trim())
    );
    const hasMap = project.mapCenterLat != null && project.mapCenterLng != null;
    const hasInfrastructure = project.infrastructures.length > 0;
    const hasGallery = project.images.length > 0;
    const hasMasterplan = project.masterplanAvailable || Boolean(project.overlayUrl);
    const hasTours = project.tours.some((tour) => tour.sceneCount > 0);
    const hasDocuments = realDocuments.length > 0;
    const hasTestimonials = realTestimonials.length > 0;
    const hasCommercialActions = hasMasterplan || hasTours;
    const mapSrc = hasMap
        ? `https://maps.google.com/maps?q=${project.mapCenterLat},${project.mapCenterLng}&z=${project.mapZoom || 16}&output=embed`
        : null;

    return (
        <div className="bg-background text-foreground">
            <section className="relative overflow-hidden border-b border-border">
                <div className="absolute inset-0">
                    <img
                        src={project.imageUrl}
                        alt={project.imageAlt}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/35" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/15" />
                </div>

                <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-end px-6 py-14 sm:px-10 lg:px-16">
                    <div className="max-w-3xl space-y-6">
                        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                                {project.tipo.replace(/_/g, " ")}
                            </span>
                            {inventory.available > 0 && (
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-4 py-2 text-emerald-200 backdrop-blur">
                                    {inventory.available} disponibles
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            <p className="flex items-center gap-2 text-sm text-white/80 sm:text-base">
                                <MapPin className="h-4 w-4 flex-shrink-0 text-brand-400" />
                                {project.ubicacion || "Ubicación a confirmar"}
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

                        <div className="flex flex-wrap gap-3">
                            {hasMasterplan && (
                                <Link
                                    href={`/proyectos/${params.slug}/masterplan?view=plano`}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-6 py-3.5 font-bold text-white shadow-glow transition-all hover:scale-[1.02] hover:bg-brand-400"
                                >
                                    <Globe className="h-4 w-4" />
                                    Ver masterplan
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                            {hasTours && (
                                <Link
                                    href={`/proyectos/${params.slug}/tour360`}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur transition-all hover:scale-[1.02] hover:bg-white/15"
                                >
                                    <Camera className="h-4 w-4" />
                                    Recorrer tour 360
                                </Link>
                            )}
                            <a
                                href="#contacto"
                                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-6 py-3.5 font-bold text-white/90 transition-all hover:scale-[1.02] hover:border-white/30 hover:text-white"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Consultar proyecto
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {highlights.length > 0 && (
                <section className="border-b border-border bg-card/40">
                    <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 sm:grid-cols-2 sm:px-10 lg:grid-cols-4 lg:px-16">
                        {highlights.map((item) => (
                            <div key={item.label} className="rounded-3xl border border-border bg-background/70 p-5 shadow-sm">
                                <item.icon className="mb-4 h-5 w-5 text-brand-400" />
                                <p className="text-2xl font-black text-foreground">{item.value}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-16">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                Descripción general
                            </p>
                            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                Información general del proyecto
                            </h2>
                            <p className="text-base leading-8 text-muted-foreground sm:text-lg">
                                {project.descripcion ||
                                    "Este proyecto ya está publicado y listo para recibir consultas desde la experiencia pública."}
                            </p>
                        </div>

                        {hasInfrastructure && (
                            <div className="space-y-5">
                                <h3 className="text-2xl font-black text-foreground">Infraestructura cargada</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {project.infrastructures.map((item) => (
                                        <article
                                            key={item.id}
                                            className="rounded-3xl border border-border bg-card p-5 shadow-sm"
                                        >
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
                                                <p className="mb-4 text-sm leading-7 text-muted-foreground">
                                                    {item.descripcion}
                                                </p>
                                            )}
                                            <div>
                                                <div className="mb-2 flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Avance</span>
                                                    <span className="font-semibold text-foreground">
                                                        {item.porcentajeAvance}%
                                                    </span>
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
                        )}
                    </div>

                    <div className="space-y-6">
                        {inventory.total > 0 && (
                            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    Resumen de inventario
                                </p>
                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {[
                                        { label: "Disponibles", value: inventory.available, tone: "text-emerald-500" },
                                        { label: "Reservados", value: inventory.reserved, tone: "text-amber-500" },
                                        { label: "Vendidos", value: inventory.sold, tone: "text-rose-500" },
                                        { label: "No disponibles", value: inventory.blocked, tone: "text-slate-500" },
                                    ]
                                        .filter((item) => item.value > 0)
                                        .map((item) => (
                                            <div key={item.label} className="rounded-2xl bg-background p-4">
                                                <p className={`text-2xl font-black ${item.tone}`}>{item.value}</p>
                                                <p className="text-sm text-muted-foreground">{item.label}</p>
                                            </div>
                                        ))}
                                </div>
                                <p className="mt-5 text-sm text-muted-foreground">
                                    {inventory.total} unidades publicadas en total.
                                </p>
                            </div>
                        )}

                        {project.inventoryPreview.length > 0 && (
                            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    Unidades destacadas
                                </p>
                                <div className="mt-5 space-y-3">
                                    {project.inventoryPreview.map((unit) => (
                                        <div
                                            key={unit.id}
                                            className="flex items-center justify-between gap-4 rounded-2xl bg-background p-4"
                                        >
                                            <div>
                                                <p className="font-bold text-foreground">Lote {unit.numero}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {[
                                                        unit.superficie ? `${unit.superficie} m²` : null,
                                                        unit.orientacion,
                                                        unit.esEsquina ? "Esquina" : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ") || "Datos en carga"}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-foreground">
                                                    {formatCurrency(unit.precio, unit.moneda) || "Consultar"}
                                                </p>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    {unit.estado.replace(/_/g, " ")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {hasCommercialActions && (
                            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    Experiencias disponibles
                                </p>
                                <div className="mt-5 space-y-3">
                                    {hasMasterplan && (
                                        <Link
                                            href={`/proyectos/${params.slug}/masterplan?view=plano`}
                                            className="flex items-center justify-between rounded-2xl bg-background px-4 py-4 transition-colors hover:border-brand-500/20 hover:bg-brand-500/5"
                                        >
                                            <div>
                                                <p className="font-bold text-foreground">Masterplan interactivo</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Ver mapa, plano y estados de lotes.
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-brand-500" />
                                        </Link>
                                    )}
                                    {hasTours && (
                                        <Link
                                            href={`/proyectos/${params.slug}/tour360`}
                                            className="flex items-center justify-between rounded-2xl bg-background px-4 py-4 transition-colors hover:border-brand-500/20 hover:bg-brand-500/5"
                                        >
                                            <div>
                                                <p className="font-bold text-foreground">Tour 360</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Recorrido inmersivo con escenas reales cargadas.
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-brand-500" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {hasGallery && (
                <section className="border-y border-border bg-card/20">
                    <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-16">
                        <div className="mb-8 max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                Galería de imágenes
                            </p>
                            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                Material visual cargado desde dashboard
                            </h2>
                        </div>
                    </div>
                    <PublicProjectGallery imagenes={project.images} />
                </section>
            )}

            {(hasMap || usefulMapImages.length > 0) && (
                <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-16">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                        {hasMap && (
                            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                                <div className="border-b border-border px-6 py-5">
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                        Ubicación
                                    </p>
                                    <h2 className="mt-2 text-2xl font-black text-foreground">
                                        Mapa del proyecto
                                    </h2>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {project.ubicacion || "Punto georreferenciado del proyecto"}
                                    </p>
                                </div>
                                <iframe
                                    src={mapSrc ?? undefined}
                                    className="h-[420px] w-full border-0"
                                    loading="lazy"
                                    title={`Mapa de ${project.nombre}`}
                                />
                            </div>
                        )}

                        {usefulMapImages.length > 0 && (
                            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                                    Imágenes vinculadas al mapa
                                </p>
                                <div className="mt-5 space-y-4">
                                    {usefulMapImages.slice(0, 4).map((image) => (
                                        <article key={image.id} className="overflow-hidden rounded-2xl bg-background">
                                            <img
                                                src={image.url}
                                                alt={image.titulo || image.unidadNumero || "Imagen del mapa"}
                                                className="h-40 w-full object-cover"
                                            />
                                            <div className="p-4">
                                                <p className="font-bold text-foreground">
                                                    {image.titulo || `Punto ${image.orden + 1}`}
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {[image.tipo, image.unidadNumero ? `Unidad ${image.unidadNumero}` : null]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {(hasDocuments || hasTestimonials) && (
                <section className="border-y border-border bg-card/20">
                    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:px-16">
                        {hasDocuments && (
                            <div className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                                <div className="mb-5 flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-brand-400" />
                                    <h2 className="text-2xl font-black text-foreground">Documentación</h2>
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
                                    <h2 className="text-2xl font-black text-foreground">Testimonios</h2>
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

            <section id="contacto" className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-16">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-400">
                            CTA comercial
                        </p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground">
                            Consultá por {project.nombre}
                        </h2>
                        <p className="mt-4 text-base leading-8 text-muted-foreground">
                            Completá el formulario para recibir disponibilidad, precios actualizados y asesoramiento comercial.
                        </p>
                        <div className="mt-8 space-y-4">
                            <div className="rounded-2xl bg-background p-4">
                                <p className="font-bold text-foreground">Proyecto</p>
                                <p className="text-sm text-muted-foreground">
                                    {project.nombre}
                                    {project.organizationName ? ` · ${project.organizationName}` : ""}
                                </p>
                            </div>
                            {inventory.total > 0 && (
                                <div className="rounded-2xl bg-background p-4">
                                    <p className="font-bold text-foreground">Inventario visible</p>
                                    <p className="text-sm text-muted-foreground">
                                        {inventory.available} disponibles, {inventory.reserved} reservados y {inventory.sold} vendidos.
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
