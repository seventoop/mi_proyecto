"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    ChevronDown,
    Clock3,
    ExternalLink,
    FileText,
    ImageIcon,
    Layers3,
    LocateFixed,
    MapPin,
    MessageCircle,
    PlayCircle,
    ShieldCheck,
    Sparkles,
    Star,
    Trees,
    Wallet,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import MasterplanViewer from "@/components/masterplan/masterplan-viewer";
import ContactForm from "@/components/public/contact-form";

type ProjectStat = {
    label: string;
    value: number;
    suffix?: string;
    prefix?: string;
    help?: string;
};

type ProjectImage = {
    id: string;
    url: string;
    categoria: string;
    esPrincipal: boolean;
};

type ProjectTour = {
    id: string;
    nombre: string;
    sceneCount: number;
    previewImages: string[];
};

type ProjectInfrastructure = {
    id: string;
    nombre: string;
    categoria: string;
    tipo: string;
    estado: string;
    porcentajeAvance: number;
    descripcion?: string | null;
};

type ProjectStage = {
    id: string;
    nombre: string;
    estado: string;
    orden: number;
    unitCount: number;
    availableCount: number;
};

type ProjectDocument = {
    id: string;
    title: string;
    url: string;
    type: string;
    source: string;
};

type ProjectTestimonial = {
    id: string;
    author: string;
    role: string;
    text: string;
    rating: number;
    mediaUrl?: string | null;
};

type RelatedProject = {
    id: string;
    slug: string | null;
    nombre: string;
    tipo: string;
    ubicacion: string | null;
    descripcion: string | null;
    imagenPortada: string | null;
    precioM2Mercado: number | null;
};

type ShowcaseData = {
    id: string;
    slug: string;
    nombre: string;
    descripcion: string | null;
    ubicacion: string | null;
    tipo: string;
    estado: string;
    imageUrl: string;
    imageAlt: string;
    imageCount: number;
    mapCenterLat: number | null;
    mapCenterLng: number | null;
    mapZoom: number | null;
    masterplanAvailable: boolean;
    leadCaptureEnabled: boolean;
    reservationEnabled: boolean;
    documentationStatus: string;
    organizationName: string | null;
    stats: {
        totalUnits: number;
        availableUnits: number;
        reservedUnits: number;
        soldUnits: number;
        soldPct: number;
        avgTicket: number | null;
        minPrice: number | null;
        maxPrice: number | null;
        minSurface: number | null;
        maxSurface: number | null;
    };
    inventoryPreview: Array<{
        id: string;
        numero: string;
        estado: string;
        superficie: number | null;
        precio: number | null;
        moneda: string;
        frente: number | null;
        fondo: number | null;
        esEsquina: boolean;
        orientacion: string | null;
    }>;
    images: ProjectImage[];
    tours: ProjectTour[];
    infrastructures: ProjectInfrastructure[];
    stages: ProjectStage[];
    documents: ProjectDocument[];
    testimonials: ProjectTestimonial[];
    relatedProjects: RelatedProject[];
};

type SectionItem = {
    id: string;
    label: string;
};

const fallbackImage =
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop";

const statusLabels: Record<string, string> = {
    PLANIFICACION: "Planificacion",
    EN_VENTA: "En venta",
    EN_DESARROLLO: "En desarrollo",
    FINALIZADO: "Finalizado",
    DISPONIBLE: "Disponible",
    RESERVADA: "Reservado",
    VENDIDA: "Vendido",
    BLOQUEADO: "No disponible",
    SUSPENDIDO: "No disponible",
};

const statusClasses: Record<string, string> = {
    DISPONIBLE: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
    RESERVADA: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30",
    VENDIDA: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30",
    BLOQUEADO: "bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/30",
    SUSPENDIDO: "bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/30",
};

function Reveal({
    children,
    className,
    delay = 0,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

function AnimatedNumber({
    value,
    suffix = "",
    prefix = "",
}: {
    value: number;
    suffix?: string;
    prefix?: string;
}) {
    const ref = useRef<HTMLSpanElement | null>(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (!isInView) return;
        let frame = 0;
        const duration = 1000;
        const start = performance.now();

        const tick = (timestamp: number) => {
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round(value * eased));
            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [isInView, value]);

    return (
        <span ref={ref}>
            {prefix}
            {displayValue.toLocaleString("es-AR")}
            {suffix}
        </span>
    );
}

function SectionHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <Reveal className="max-w-3xl">
            <span className="mb-4 inline-flex rounded-full border border-brand-orange/20 bg-brand-orange/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.32em] text-brand-orange">
                {eyebrow}
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">{title}</h2>
            {description ? (
                <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">{description}</p>
            ) : null}
        </Reveal>
    );
}

function StickyProjectNav({ sections }: { sections: SectionItem[] }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 480);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const target = document.getElementById(id);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top, behavior: "smooth" });
    };

    return (
        <div
            className={cn(
                "pointer-events-none fixed inset-x-0 top-20 z-40 transition-all duration-300",
                visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
            )}
        >
            <div className="mx-auto flex max-w-5xl justify-center px-4">
                <div className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-950/75 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => scrollToSection(section.id)}
                            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 hover:text-white"
                        >
                            {section.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ProjectDetailShowcase({ project }: { project: ShowcaseData }) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const galleryImages =
        project.images.length > 0
            ? project.images
            : [
                {
                    id: "fallback-hero",
                    url: project.imageUrl || fallbackImage,
                    categoria: "PORTADA",
                    esPrincipal: true,
                },
            ];

    const sections: SectionItem[] = [
        galleryImages.length > 0 || project.tours.length > 0 ? { id: "galeria", label: "Galeria" } : null,
        project.masterplanAvailable || project.stats.totalUnits > 0 ? { id: "masterplan", label: "Masterplan" } : null,
        project.mapCenterLat != null && project.mapCenterLng != null ? { id: "ubicacion", label: "Ubicacion" } : null,
        project.stages.length > 0 ? { id: "etapas", label: "Etapas" } : null,
        project.documents.length > 0 ? { id: "documentacion", label: "Legal" } : null,
        { id: "contacto", label: "Contacto" },
    ].filter(Boolean) as SectionItem[];

    const quickStats: ProjectStat[] = [
        {
            label: "Lotes totales",
            value: project.stats.totalUnits,
            help: "Inventario total cargado en el masterplan.",
        },
        {
            label: "Disponibles hoy",
            value: project.stats.availableUnits,
            help: "Unidades actualmente abiertas para consulta.",
        },
        {
            label: "% vendido",
            value: project.stats.soldPct,
            suffix: "%",
            help: "Porcentaje vendido sobre el total del proyecto.",
        },
        {
            label: "Desde",
            value: project.stats.minPrice || 0,
            prefix: "USD ",
            help: project.stats.minPrice ? "Ticket minimo detectado en unidades cargadas." : "Precio de referencia pendiente.",
        },
    ];

    const highlightCards = [
        {
            icon: Building2,
            title: `${project.stats.totalUnits.toLocaleString("es-AR")} lotes proyectados`,
            body: "Inventario real conectado al masterplan interactivo, listo para explorar por estado y precio.",
        },
        {
            icon: Layers3,
            title: `${project.stats.availableUnits.toLocaleString("es-AR")} unidades disponibles`,
            body: "Lectura en tiempo real del stock publicado para convertir la landing en una herramienta comercial.",
        },
        {
            icon: Wallet,
            title: project.stats.minPrice ? `${formatCurrency(project.stats.minPrice, "USD")} desde` : "Precio de referencia",
            body: project.stats.maxPrice
                ? `Rango detectado hasta ${formatCurrency(project.stats.maxPrice, "USD")} segun las unidades cargadas.`
                : "La estructura comercial se completa desde el dashboard a medida que avanza el proyecto.",
        },
        {
            icon: Sparkles,
            title: project.infrastructures.length > 0 ? `${project.infrastructures.length} hitos de infraestructura` : "Infraestructura en despliegue",
            body: project.infrastructures.length > 0
                ? "Mostramos vialidad, edificaciones y componentes del desarrollo sin esconder el estado real de avance."
                : "La pagina esta preparada para sumar amenities y avances cuando se carguen desde el dashboard.",
        },
    ];

    const trustBadges = [
        project.reservationEnabled ? "Reserva digital habilitada" : null,
        project.leadCaptureEnabled ? "Captacion comercial activa" : null,
        project.documentationStatus ? `Documentacion ${project.documentationStatus.toLowerCase()}` : null,
        project.organizationName ? `Desarrollado por ${project.organizationName}` : null,
    ].filter(Boolean) as string[];

    const googleMapsUrl =
        project.mapCenterLat != null && project.mapCenterLng != null
            ? `https://www.google.com/maps?q=${project.mapCenterLat},${project.mapCenterLng}&z=${project.mapZoom || 15}&output=embed`
            : null;

    const lightboxImage = lightboxIndex != null ? galleryImages[lightboxIndex] : null;

    return (
        <div className="bg-[#050816] text-white">
            <StickyProjectNav sections={sections} />

            <section className="relative isolate min-h-screen overflow-hidden">
                <div className="absolute inset-0">
                    <Image
                        src={project.imageUrl || fallbackImage}
                        alt={project.imageAlt}
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,122,0,0.22),_transparent_38%)]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/45 to-[#050816]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050816]/94 via-[#050816]/72 to-[#050816]/30" />
                </div>

                <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-4 pb-14 pt-28 md:px-6 md:pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 32 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="max-w-4xl"
                    >
                        <div className="mb-6 flex flex-wrap items-center gap-3">
                            <span className="inline-flex rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-white backdrop-blur-md">
                                {project.tipo}
                            </span>
                            <span className="inline-flex rounded-full border border-brand-orange/25 bg-brand-orange/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-brand-orange backdrop-blur-md">
                                {statusLabels[project.estado] || project.estado}
                            </span>
                        </div>

                        <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-tight text-white md:text-7xl lg:text-[5.6rem]">
                            {project.nombre}
                        </h1>

                        <div className="mt-6 flex flex-wrap items-center gap-6 text-base text-slate-200 md:text-xl">
                            <span className="inline-flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-brand-orange" />
                                {project.ubicacion || "Ubicacion por confirmar"}
                            </span>
                            {project.organizationName ? (
                                <span className="inline-flex items-center gap-2 text-slate-300">
                                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                                    {project.organizationName}
                                </span>
                            ) : null}
                        </div>

                        <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
                            {project.descripcion ||
                                "Una landing comercial pensada para exponer inventario, estado del desarrollo y herramientas de conversion sin perder la estetica premium del proyecto."}
                        </p>

                        <div className="mt-10 flex flex-wrap gap-4">
                            {(project.masterplanAvailable || project.stats.totalUnits > 0) && (
                                <a
                                    href="#masterplan"
                                    className="inline-flex items-center gap-3 rounded-full bg-brand-orange px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_24px_60px_rgba(255,122,0,0.28)] transition hover:scale-[1.02] hover:bg-[#ff8b1f]"
                                >
                                    Explorar Masterplan
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            )}
                            {project.tours.length > 0 && (
                                <Link
                                    href={`/proyectos/${project.slug}/tour360`}
                                    className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-white backdrop-blur-md transition hover:bg-white/14"
                                >
                                    Tour Virtual 360
                                    <PlayCircle className="h-4 w-4" />
                                </Link>
                            )}
                            <a
                                href="#contacto"
                                className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/20 px-7 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md transition hover:border-brand-orange/40 hover:bg-brand-orange/10"
                            >
                                Solicitar informacion
                                <MessageCircle className="h-4 w-4" />
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 32 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-14 grid gap-4 md:grid-cols-4"
                    >
                        {quickStats.map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl"
                            >
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">{stat.label}</p>
                                <p className="mt-4 text-3xl font-black text-white">
                                    <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                                </p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">{stat.help}</p>
                            </div>
                        ))}
                    </motion.div>

                    <div className="mt-12 flex justify-center">
                        <a
                            href="#galeria"
                            className="inline-flex flex-col items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-white/65 transition hover:text-white"
                        >
                            Descubrir proyecto
                            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8">
                                <ChevronDown className="h-5 w-5 animate-bounce" />
                            </span>
                        </a>
                    </div>
                </div>
            </section>

            <section className="relative border-t border-white/6 bg-[#060a19] py-24">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/40 to-transparent" />
                <div className="mx-auto max-w-7xl px-4 md:px-6">
                    <SectionHeader
                        eyebrow="Propuesta de valor"
                        title="Una landing pensada para vender el desarrollo, no solo para listar datos."
                        description="Priorizamos los datos fuertes que ya existen en tu dashboard y los convertimos en una narrativa visual: inventario, disponibilidad, estado del proyecto, infraestructura y accion comercial."
                    />

                    <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {highlightCards.map((card, index) => (
                            <Reveal
                                key={card.title}
                                delay={index * 0.08}
                                className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/14 text-brand-orange">
                                    <card.icon className="h-6 w-6" />
                                </div>
                                <h3 className="mt-7 text-xl font-black text-white">{card.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-slate-300">{card.body}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section id="galeria" className="bg-[#050816] py-24">
                <div className="mx-auto max-w-7xl px-4 md:px-6">
                    <SectionHeader
                        eyebrow={project.tours.length > 0 ? "Tour y media" : "Galeria"}
                        title={project.tours.length > 0 ? "Recorre el proyecto con una experiencia inmersiva." : "Visuales del proyecto listas para impacto comercial."}
                        description={
                            project.tours.length > 0
                                ? "Cuando exista tour 360, la pagina lo prioriza. Si no, la seccion se sostiene con imagenes y vista principal sin romper la experiencia."
                                : "La galeria se adapta al contenido cargado. Si todavia no hay renders o avance de obra, mostramos la vista principal del proyecto y seguimos empujando al masterplan."
                        }
                    />

                    <div className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                        <Reveal className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5">
                            <div className="relative min-h-[420px]">
                                <Image
                                    src={galleryImages[0]?.url || fallbackImage}
                                    alt={project.nombre}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 60vw"
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-8">
                                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-orange">
                                        {project.tours.length > 0 ? "Tour destacado" : "Vista destacada"}
                                    </p>
                                    <h3 className="mt-3 text-3xl font-black text-white">
                                        {project.tours.length > 0 ? project.tours[0].nombre : project.nombre}
                                    </h3>
                                    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-200">
                                        {project.tours.length > 0
                                            ? `${project.tours[0].sceneCount} escenas disponibles para una navegacion inmersiva.`
                                            : `Portada activa del proyecto con foco en ${project.ubicacion || "la ubicacion del desarrollo"}.`}
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        {project.tours.length > 0 ? (
                                            <Link
                                                href={`/proyectos/${project.slug}/tour360`}
                                                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-brand-orange hover:text-white"
                                            >
                                                Abrir tour
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setLightboxIndex(0)}
                                                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-brand-orange hover:text-white"
                                            >
                                                Ver imagen
                                                <ImageIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                        {(project.masterplanAvailable || project.stats.totalUnits > 0) && (
                                            <a
                                                href="#masterplan"
                                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md transition hover:bg-white/12"
                                            >
                                                Ir al masterplan
                                                <ArrowRight className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Reveal>

                        <div className="grid gap-6">
                            <Reveal className="rounded-[32px] border border-white/10 bg-white/5 p-7">
                                <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-orange">Cobertura multimedia</p>
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
                                        <p className="text-3xl font-black text-white">{project.imageCount}</p>
                                        <p className="mt-2 text-sm text-slate-300">Imagenes publicas</p>
                                    </div>
                                    <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
                                        <p className="text-3xl font-black text-white">{project.tours.length}</p>
                                        <p className="mt-2 text-sm text-slate-300">Tours 360</p>
                                    </div>
                                </div>
                                <p className="mt-6 text-sm leading-7 text-slate-300">
                                    La pagina prioriza el contenido real. Si manana cargan renders, avance de obra o escenas del tour, esta seccion los absorbe sin tener que redisenar nada.
                                </p>
                            </Reveal>

                            <div className="grid grid-cols-2 gap-4">
                                {galleryImages.slice(0, 4).map((image, index) => (
                                    <Reveal
                                        key={image.id}
                                        delay={0.06 * index}
                                        className={cn(
                                            "group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5",
                                            index === 0 && "col-span-2"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setLightboxIndex(index)}
                                            className="relative block h-full min-h-[180px] w-full"
                                        >
                                            <Image
                                                src={image.url}
                                                alt={`${project.nombre} ${index + 1}`}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                                className="object-cover transition duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                            <div className="absolute inset-x-0 bottom-0 p-5 text-left">
                                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange">
                                                    {image.categoria}
                                                </p>
                                            </div>
                                        </button>
                                    </Reveal>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {(project.masterplanAvailable || project.stats.totalUnits > 0) && (
                <section id="masterplan" className="bg-[#060a19] py-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <SectionHeader
                            eyebrow="Masterplan interactivo"
                            title="Inventario vivo dentro de la misma landing."
                            description="La experiencia publica incorpora el viewer real del masterplan, con colores por estado, zoom, filtros y detalle de lotes sin sacar al usuario del flujo comercial."
                        />

                        <div className="mt-14 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
                            <Reveal className="rounded-[32px] border border-white/10 bg-white/5 p-7">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/8 p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Disponible</p>
                                        <p className="mt-3 text-3xl font-black text-white">{project.stats.availableUnits}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/8 p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Reservado</p>
                                        <p className="mt-3 text-3xl font-black text-white">{project.stats.reservedUnits}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/8 p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-200">Vendido</p>
                                        <p className="mt-3 text-3xl font-black text-white">{project.stats.soldUnits}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Ticket medio</p>
                                        <p className="mt-3 text-2xl font-black text-white">
                                            {project.stats.avgTicket ? formatCurrency(project.stats.avgTicket, "USD") : "N/D"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-7 rounded-[28px] border border-white/10 bg-black/20 p-6">
                                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Leyenda</p>
                                    <div className="mt-4 grid gap-3 text-sm text-slate-200">
                                        {[
                                            ["Disponible", "bg-emerald-400"],
                                            ["Reservado", "bg-amber-400"],
                                            ["Vendido", "bg-rose-400"],
                                            ["No disponible", "bg-slate-400"],
                                        ].map(([label, dot]) => (
                                            <div key={label} className="flex items-center gap-3">
                                                <span className={cn("h-3 w-3 rounded-full", dot)} />
                                                <span>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {project.inventoryPreview.length > 0 && (
                                    <div className="mt-7 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Lotes destacados</p>
                                        {project.inventoryPreview.map((unit) => (
                                            <div
                                                key={unit.id}
                                                className="flex items-start justify-between rounded-[24px] border border-white/8 bg-black/20 px-5 py-4"
                                            >
                                                <div>
                                                    <p className="text-lg font-black text-white">Lote {unit.numero}</p>
                                                    <p className="mt-1 text-sm text-slate-300">
                                                        {unit.superficie ? `${unit.superficie} m2` : "Superficie por confirmar"}
                                                        {unit.frente && unit.fondo ? ` · ${unit.frente} x ${unit.fondo} m` : ""}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
                                                            statusClasses[unit.estado] || statusClasses.BLOQUEADO
                                                        )}
                                                    >
                                                        {statusLabels[unit.estado] || unit.estado}
                                                    </span>
                                                    <p className="mt-3 text-sm font-bold text-white">
                                                        {unit.precio ? formatCurrency(unit.precio, unit.moneda) : "Consultar precio"}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Reveal>

                            <Reveal className="overflow-hidden rounded-[36px] border border-white/10 bg-[#030611] shadow-[0_30px_100px_rgba(0,0,0,0.3)]">
                                <div className="h-[720px]">
                                    <MasterplanViewer proyectoId={project.id} modo="public" canEdit={false} />
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>
            )}

            {googleMapsUrl && (
                <section id="ubicacion" className="bg-[#050816] py-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <SectionHeader
                            eyebrow="Ubicacion y entorno"
                            title="La ubicacion se presenta como parte del relato comercial."
                            description="Embed de mapa, coordenadas reales del proyecto y referencias de implantacion para sostener una decision de compra mucho mas informada."
                        />

                        <div className="mt-14 grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
                            <Reveal className="rounded-[32px] border border-white/10 bg-white/5 p-7">
                                <div className="grid gap-4">
                                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Direccion comercial</p>
                                        <p className="mt-3 text-2xl font-black text-white">{project.ubicacion || "Ubicacion por confirmar"}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Coordenadas</p>
                                        <p className="mt-3 text-base font-semibold text-white">
                                            {project.mapCenterLat?.toFixed(6)}, {project.mapCenterLng?.toFixed(6)}
                                        </p>
                                    </div>
                                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Contexto del desarrollo</p>
                                        <p className="mt-3 text-sm leading-7 text-slate-300">
                                            La pagina esta preparada para sumar puntos de interes, fotos del entorno y recorridos de acceso sin rehacer la estructura visual.
                                        </p>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal className="overflow-hidden rounded-[36px] border border-white/10 bg-black/20">
                                <div className="aspect-[16/11] min-h-[480px]">
                                    <iframe
                                        title={`Mapa de ${project.nombre}`}
                                        src={googleMapsUrl}
                                        className="h-full w-full"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>
            )}

            {project.infrastructures.length > 0 && (
                <section className="bg-[#060a19] py-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <SectionHeader
                            eyebrow="Amenities y caracteristicas"
                            title="Infraestructura visible, con estado real de avance."
                            description="En lugar de una lista generica, la landing toma la infraestructura cargada en el dashboard y la convierte en tarjetas comerciales con categoria, estado y porcentaje de avance."
                        />

                        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {project.infrastructures.map((item, index) => (
                                <Reveal
                                    key={item.id}
                                    delay={index * 0.05}
                                    className="rounded-[30px] border border-white/10 bg-white/5 p-7"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/12 text-brand-orange">
                                            {item.categoria === "vialidad" ? (
                                                <LocateFixed className="h-6 w-6" />
                                            ) : item.categoria === "edificaciones" ? (
                                                <Building2 className="h-6 w-6" />
                                            ) : (
                                                <Trees className="h-6 w-6" />
                                            )}
                                        </div>
                                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200">
                                            {item.estado.replaceAll("_", " ")}
                                        </span>
                                    </div>
                                    <h3 className="mt-7 text-2xl font-black text-white">{item.nombre}</h3>
                                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-orange">
                                        {item.categoria} · {item.tipo.replaceAll("_", " ")}
                                    </p>
                                    <p className="mt-5 text-sm leading-7 text-slate-300">
                                        {item.descripcion || "Elemento de infraestructura cargado desde el dashboard para reforzar el valor percibido del proyecto."}
                                    </p>
                                    <div className="mt-7">
                                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            <span>Avance</span>
                                            <span>{item.porcentajeAvance}%</span>
                                        </div>
                                        <div className="mt-3 h-2 rounded-full bg-white/8">
                                            <div
                                                className="h-2 rounded-full bg-gradient-to-r from-brand-orange to-amber-300"
                                                style={{ width: `${Math.max(item.porcentajeAvance, 6)}%` }}
                                            />
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {project.stages.length > 0 && (
                <section id="etapas" className="bg-[#050816] py-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <SectionHeader
                            eyebrow="Etapas y avance"
                            title="Cronologia visual del desarrollo."
                            description="La pagina detecta etapas cargadas y las convierte en un recorrido que mezcla orden, estado y cantidad de unidades por fase."
                        />

                        <div className="mt-14 space-y-6">
                            {project.stages.map((stage, index) => (
                                <Reveal key={stage.id} delay={index * 0.05}>
                                    <div className="grid gap-6 rounded-[32px] border border-white/10 bg-white/5 p-7 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-orange/30 bg-brand-orange/12 text-lg font-black text-brand-orange">
                                            {String(index + 1).padStart(2, "0")}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Etapa</p>
                                            <h3 className="mt-2 text-2xl font-black text-white">{stage.nombre}</h3>
                                            <p className="mt-3 text-sm leading-7 text-slate-300">
                                                {stage.unitCount.toLocaleString("es-AR")} unidades cargadas · {stage.availableCount.toLocaleString("es-AR")} disponibles.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-slate-200">
                                            <Clock3 className="h-4 w-4 text-brand-orange" />
                                            {stage.estado.replaceAll("_", " ")}
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {project.documents.length > 0 && (
                <section id="documentacion" className="bg-[#060a19] py-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <SectionHeader
                            eyebrow="Documentacion y legalidad"
                            title="Activos de confianza listos para descarga."
                            description="Cuando hay archivos publicos o documentacion de proyecto, la landing los expone como pruebas de respaldo y reduce friccion comercial."
                        />

                        <div className="mt-12 flex flex-wrap gap-3">
                            {trustBadges.map((badge) => (
                                <span
                                    key={badge}
                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200"
                                >
                                    <BadgeCheck className="h-4 w-4" />
                                    {badge}
                                </span>
                            ))}
                        </div>

                        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {project.documents.map((doc, index) => (
                                <Reveal
                                    key={doc.id}
                                    delay={index * 0.05}
                                    className="rounded-[28px] border border-white/10 bg-white/5 p-6"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/14 text-brand-orange">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                                            {doc.source}
                                        </span>
                                    </div>
                                    <h3 className="mt-6 text-xl font-black text-white">{doc.title}</h3>
                                    <p className="mt-2 text-sm text-slate-300">{doc.type}</p>
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-orange transition hover:text-white"
                                    >
                                        Descargar
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {project.testimonials.length > 0 && (
                <section className="bg-[#050816] py-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <SectionHeader
                            eyebrow="Testimonios"
                            title="Prueba social integrada a la experiencia."
                            description="La seccion aparece solo si existen testimonios aprobados en la base."
                        />

                        <div className="mt-14 grid gap-6 lg:grid-cols-3">
                            {project.testimonials.map((testimonial, index) => (
                                <Reveal
                                    key={testimonial.id}
                                    delay={index * 0.06}
                                    className="rounded-[30px] border border-white/10 bg-white/5 p-7"
                                >
                                    <div className="flex items-center gap-1 text-amber-300">
                                        {Array.from({ length: testimonial.rating || 5 }).map((_, starIndex) => (
                                            <Star key={`${testimonial.id}-${starIndex}`} className="h-4 w-4 fill-current" />
                                        ))}
                                    </div>
                                    <p className="mt-6 text-base leading-8 text-slate-200">"{testimonial.text}"</p>
                                    <div className="mt-8 flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/18 text-sm font-black text-brand-orange">
                                            {testimonial.author.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-black text-white">{testimonial.author}</p>
                                            <p className="text-sm text-slate-400">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section id="contacto" className="relative overflow-hidden bg-[#060a19] py-24">
                <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,_rgba(255,122,0,0.18),_transparent_56%)]" />
                <div className="relative mx-auto max-w-7xl px-4 md:px-6">
                    <div className="grid gap-10 xl:grid-cols-[0.92fr_1.08fr]">
                        <Reveal className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-8 md:p-10">
                            <span className="inline-flex rounded-full border border-brand-orange/25 bg-brand-orange/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-brand-orange">
                                CTA final
                            </span>
                            <h2 className="mt-6 text-4xl font-black leading-tight text-white md:text-5xl">
                                Te interesa {project.nombre}?
                            </h2>
                            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                                La pagina termina donde tiene que terminar: con una conversion clara. Formulario, acceso al masterplan y continuidad comercial sin desordenar la experiencia.
                            </p>

                            <div className="mt-8 space-y-4">
                                {[
                                    "Solicitar informacion comercial",
                                    project.masterplanAvailable || project.stats.totalUnits > 0 ? "Explorar lotes y disponibilidad" : null,
                                    project.reservationEnabled ? "Avanzar a reserva digital" : null,
                                ]
                                    .filter(Boolean)
                                    .map((item) => (
                                        <div
                                            key={item}
                                            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm text-slate-200"
                                        >
                                            <BadgeCheck className="h-5 w-5 text-emerald-300" />
                                            {item}
                                        </div>
                                    ))}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                {(project.masterplanAvailable || project.stats.totalUnits > 0) && (
                                    <a
                                        href="#masterplan"
                                        className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#ff8b1f]"
                                    >
                                        Ver masterplan
                                        <ArrowRight className="h-4 w-4" />
                                    </a>
                                )}
                                {project.tours.length > 0 && (
                                    <Link
                                        href={`/proyectos/${project.slug}/tour360`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/20 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                                    >
                                        Abrir tour 360
                                        <PlayCircle className="h-4 w-4" />
                                    </Link>
                                )}
                            </div>
                        </Reveal>

                        <Reveal className="rounded-[36px] border border-white/10 bg-slate-950/92 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.32)] md:p-10">
                            <h3 className="text-2xl font-black text-white">Solicitar informacion del proyecto</h3>
                            <p className="mt-3 text-sm leading-7 text-slate-300">
                                El lead entra asociado al proyecto, listo para seguimiento comercial desde el dashboard.
                            </p>
                            <div className="mt-8">
                                <ContactForm proyectoId={project.id} origen="WEB_PROYECTO_PREMIUM" />
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {project.relatedProjects.length > 0 && (
                <section className="bg-[#050816] py-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <SectionHeader
                            eyebrow="Relacionados"
                            title="Otros desarrollos para mantener la exploracion activa."
                            description="Si existen proyectos del mismo tipo o desarrollador, la landing los usa como continuidad comercial al final del recorrido."
                        />

                        <div className="mt-14 grid gap-6 lg:grid-cols-3">
                            {project.relatedProjects.map((related, index) => (
                                <Reveal
                                    key={related.id}
                                    delay={index * 0.05}
                                    className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5"
                                >
                                    <Link href={`/proyectos/${related.slug || related.id}`} className="group block">
                                        <div className="relative aspect-[4/3] overflow-hidden">
                                            <Image
                                                src={related.imagenPortada || fallbackImage}
                                                alt={related.nombre}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                                className="object-cover transition duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                                            <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                                {related.tipo}
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-2xl font-black text-white">{related.nombre}</h3>
                                            <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
                                                <MapPin className="h-4 w-4 text-brand-orange" />
                                                {related.ubicacion || "Ubicacion por confirmar"}
                                            </p>
                                            <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-300">
                                                {related.descripcion || "Proyecto relacionado listo para continuar la exploracion comercial."}
                                            </p>
                                            <div className="mt-6 flex items-center justify-between">
                                                <span className="text-sm font-bold uppercase tracking-[0.18em] text-brand-orange">
                                                    {related.precioM2Mercado ? `${formatCurrency(related.precioM2Mercado, "USD")} m2` : "Ver proyecto"}
                                                </span>
                                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange text-white transition group-hover:translate-x-1">
                                                    <ArrowRight className="h-4 w-4" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {lightboxImage && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => setLightboxIndex(null)}
                        className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/20"
                    >
                        Cerrar
                    </button>
                    <div className="relative h-[85vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10">
                        <Image
                            src={lightboxImage.url}
                            alt={project.nombre}
                            fill
                            sizes="100vw"
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
