import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import {
    ArrowRight, MapPin, Check, Building2, Trees, Shield,
    Globe, LayoutTemplate, Camera, ChevronDown, Compass,
    TrendingUp, Users, Star, Play
} from "lucide-react";
import { db } from "@/lib/db";
import ContactForm from "@/components/public/contact-form";
import PublicProjectGallery from "@/components/public/project-gallery";
import { normalizeTourMediaCategory } from "@/lib/tour-media";

async function getProject(slug: string) {
    const include = {
        _count: { select: { leads: true, etapas: true } },
        tours: {
            where: { isPublished: true },
            take: 1,
            include: { scenes: { orderBy: { order: "asc" as const } } }
        },
        imagenes: { orderBy: { orden: "asc" as const } },
        etapas: {
            include: {
                manzanas: {
                    include: { unidades: true }
                }
            }
        }
    } as const;

    let project = await db.proyecto.findUnique({ where: { slug }, include });
    if (!project && slug.length >= 20) {
        project = await db.proyecto.findUnique({ where: { id: slug }, include });
    }
    return project;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const project = await getProject(params.slug);
    if (!project) return { title: "Proyecto no encontrado" };
    return {
        title: `${project.nombre} | Seventoop`,
        description: project.descripcion?.slice(0, 160) || `Conoce ${project.nombre} en ${project.ubicacion}.`,
        openGraph: {
            images: [project.imagenPortada || ""],
        },
    };
}

export default async function ProjectLandingPage({ params }: { params: { slug: string } }) {
    const project = await getProject(params.slug);
    if (!project) notFound();

    const P = project as any;

    // â”€â”€ Derived stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const allUnits: any[] = P.etapas?.flatMap((e: any) =>
        e.manzanas?.flatMap((m: any) => m.unidades ?? []) ?? []
    ) ?? [];
    const totalUnits = allUnits.length;
    const disponibles = allUnits.filter((u) => u.estado === "DISPONIBLE").length;
    const vendidas = allUnits.filter((u) => ["VENDIDA", "RESERVADA"].includes(u.estado)).length;
    const pctVendidas = totalUnits > 0 ? Math.round((vendidas / totalUnits) * 100) : 0;

    const heroImage =
        P.imagenes?.find((i: any) => i.esPrincipal)?.url ||
        P.imagenes?.[0]?.url ||
        P.imagenPortada ||
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop";

    const publishedTour = P.tours?.[0] ?? null;
    const tour360Scenes = (publishedTour?.scenes ?? []).filter((scene: any) => normalizeTourMediaCategory(scene) === "tour360");
    const hasTours = tour360Scenes.length > 0;
    const hasMasterplan = !!(P.masterplanSVG || P.overlayUrl);
    const firstTourThumb = tour360Scenes[0]?.imageUrl;

    const priceM2 = P.precioM2Inversor
        ? `USD ${Number(P.precioM2Inversor).toLocaleString("es-AR")}/m²`
        : null;

    return (
        <div className="bg-background text-foreground selection:bg-brand-500/30 overflow-x-hidden">

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                HERO — Full screen with parallax image
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <section className="relative h-screen min-h-[680px] flex flex-col justify-end overflow-hidden">
                {/* Parallax background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={heroImage}
                        alt={P.nombre}
                        className="w-full h-full object-cover animate-zoom-in"
                    />
                    {/* Layered gradients for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent dark:via-background/50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/75 via-background/25 to-transparent dark:from-background/60" />
                </div>

                {/* Floating type + status badges */}
                <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
                    <span className="px-3.5 py-2 rounded-full bg-brand-500/20 backdrop-blur-md border border-brand-500/30 text-brand-400 text-[13px] font-bold uppercase tracking-widest">
                        {P.tipo?.replace(/_/g, " ")}
                    </span>
                    {disponibles > 0 && (
                        <span className="px-3.5 py-2 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[13px] font-bold">
                            {disponibles} disponibles
                        </span>
                    )}
                </div>

                {/* Hero content */}
                <div className="relative z-20 px-6 sm:px-10 lg:px-16 pb-16 sm:pb-24">
                    <div className="max-w-4xl">
                        <p className="flex items-center gap-2 text-muted-foreground text-base mb-4 animate-fade-in-up">
                            <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0" />
                            {P.ubicacion || "Ubicación por definir"}
                        </p>
                        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-foreground dark:text-white leading-[0.9] mb-8 animate-fade-in-up">
                            {P.nombre}
                        </h1>

                        {/* Three main CTAs */}
                        <div className="flex flex-wrap gap-3 animate-fade-in-up-delay">
                            {hasMasterplan && (
                                <Link
                                    href={`/proyectos/${params.slug}/masterplan?view=mapa`}
                                    className="group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-base shadow-glow hover:shadow-glow-lg transition-all hover:scale-105 active:scale-95"
                                >
                                    <Globe className="w-4 h-4" />
                                    Mapa Interactivo
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                            {hasMasterplan && (
                                <Link
                                    href={`/proyectos/${params.slug}/masterplan?view=plano`}
                                    className="group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-background/75 dark:bg-white/10 hover:bg-background/90 dark:hover:bg-white/20 backdrop-blur-md border border-border dark:border-white/20 text-foreground dark:text-white font-bold text-base transition-all hover:scale-105 active:scale-95"
                                >
                                    <LayoutTemplate className="w-4 h-4" />
                                    Masterplan
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                            {hasTours && (
                                <Link
                                    href={`/proyectos/${params.slug}/tour360`}
                                    className="group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-background/75 dark:bg-white/10 hover:bg-background/90 dark:hover:bg-white/20 backdrop-blur-md border border-border dark:border-white/20 text-foreground dark:text-white font-bold text-base transition-all hover:scale-105 active:scale-95"
                                >
                                    <Camera className="w-4 h-4" />
                                    Tour 360°
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                            <a
                                href="#contacto"
                                className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border border-border dark:border-white/20 text-muted-foreground dark:text-white/80 hover:text-foreground dark:hover:text-white hover:border-foreground/20 dark:hover:border-white/40 font-semibold text-base transition-all hover:scale-105"
                            >
                                Solicitar info
                            </a>
                        </div>
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="absolute bottom-6 right-8 z-20 flex flex-col items-center gap-1 text-foreground/30 dark:text-white/30 animate-float">
                    <span className="text-[10px] uppercase tracking-widest">Scroll</span>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </section>

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                STATS STRIP
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            {totalUnits > 0 && (
                <section className="border-y border-border bg-muted/30 backdrop-blur-sm">
                    <div className="px-6 sm:px-10 lg:px-16 py-7 grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-border">
                        {[
                            { label: "Lotes totales", value: totalUnits.toString(), icon: Building2 },
                            { label: "Disponibles", value: disponibles.toString(), icon: Check, color: "text-emerald-400" },
                            { label: "Reservados / Vendidos", value: `${pctVendidas}%`, icon: TrendingUp, color: "text-brand-400" },
                            { label: "Precio desde", value: priceM2 || "Consultar", icon: Star, color: "text-amber-400" },
                        ].map((stat, i) => (
                            <div key={i} className="pl-6 first:pl-0">
                                <stat.icon className={`w-5 h-5 mb-2 ${stat.color || "text-muted-foreground"}`} />
                                <p className="text-3xl sm:text-4xl font-black text-foreground leading-none">{stat.value}</p>
                                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                THREE INTERACTIVE EXPERIENCES
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <section className="py-24 px-6 sm:px-10 lg:px-16">
                <div className="mb-14">
                    <span className="text-brand-400 text-sm font-bold uppercase tracking-widest">Explorá el proyecto</span>
                    <h2 className="text-4xl sm:text-5xl font-black text-foreground mt-2 tracking-tight">Herramientas interactivas</h2>
                    <p className="text-muted-foreground mt-3 max-w-xl text-lg leading-8">
                        Tres formas de conocer el proyecto antes de decidir tu inversión.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* Card 1 — Mapa Interactivo */}
                    <Link
                        href={`/proyectos/${params.slug}/masterplan?view=mapa`}
                        className="group relative overflow-hidden rounded-3xl bg-card border border-border shadow-sm hover:border-brand-500/40 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/10 min-h-[320px] flex flex-col justify-between p-8"
                    >
                        <div>
                            <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mb-6">
                                <Globe className="w-7 h-7 text-brand-400" />
                            </div>
                            <h3 className="text-[1.8rem] font-black text-foreground mb-3">Mapa Interactivo</h3>
                            <p className="text-base text-muted-foreground leading-7">
                                Google Maps con el plano superpuesto. Marcá tu ubicación en tiempo real, explorá los lotes disponibles y realizá tu reserva directo desde el mapa.
                            </p>
                        </div>
                        <div className="mt-8 flex items-center justify-between">
                            <div className="flex gap-2">
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted border border-border text-foreground/80">GPS en vivo</span>
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted border border-border text-foreground/80">Lotes coloreados</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        {/* Ambient glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </Link>

                    {/* Card 2 — Masterplan del Proyecto */}
                    <Link
                        href={`/proyectos/${params.slug}/masterplan?view=plano`}
                        className="group relative overflow-hidden rounded-3xl bg-card border border-border shadow-sm hover:border-indigo-500/40 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 min-h-[320px] flex flex-col justify-between p-8"
                    >
                        {/* Background map preview if available */}
                        {P.overlayUrl && (
                            <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity">
                                <img src={P.overlayUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-6">
                                <LayoutTemplate className="w-7 h-7 text-indigo-400" />
                            </div>
                            <h3 className="text-[1.8rem] font-black text-foreground mb-3">Masterplan del Proyecto</h3>
                            <p className="text-base text-muted-foreground leading-7">
                                El plano completo del desarrollo con todos los lotes, sectores y amenities. Seleccioná tu lote ideal y consultá disponibilidad.
                            </p>
                        </div>
                        <div className="relative mt-8 flex items-center justify-between">
                            <div className="flex gap-2">
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted border border-border text-foreground/80">Plano HD</span>
                                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted border border-border text-foreground/80">Reserva online</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </Link>

                    {/* Card 3 - Tour Virtual 360° */}
                    {hasTours ? (
                        <Link
                            href={`/proyectos/${params.slug}/tour360`}
                            className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm hover:border-foreground/15 transition-all hover:-translate-y-1 hover:shadow-2xl min-h-[320px] flex flex-col justify-between p-8"
                        >
                            {/* Thumbnail background */}
                            {firstTourThumb ? (
                                <>
                                    <img src={firstTourThumb} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
                            )}
                            <div className="relative">
                                    <div className="w-14 h-14 rounded-2xl bg-muted/80 dark:bg-white/10 backdrop-blur border border-border dark:border-white/20 flex items-center justify-center mb-6">
                                        <Camera className="w-7 h-7 text-foreground dark:text-white" />
                                    </div>
                                <h3 className="text-[1.8rem] font-black text-foreground dark:text-white mb-3">Tour Virtual 360°</h3>
                                <p className="text-base text-muted-foreground dark:text-slate-300 leading-7">
                                    Viví una experiencia inmersiva del proyecto. Recorrelo como si estuvieras ahí, desde cualquier dispositivo.
                                </p>
                            </div>
                            <div className="relative mt-8 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted/80 dark:bg-white/10 border border-border dark:border-white/20 text-foreground dark:text-white">{tour360Scenes.length} recorrido{tour360Scenes.length === 1 ? "" : "s"}</span>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-background dark:bg-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <Play className="w-4 h-4 text-foreground dark:text-black ml-0.5" />
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="relative overflow-hidden rounded-3xl bg-muted/30 dark:bg-slate-900/50 border border-dashed border-border min-h-[320px] flex flex-col items-center justify-center p-8 text-center">
                            <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-2xl font-bold text-foreground mb-2">Tour 360° próximamente</h3>
                            <p className="text-base text-muted-foreground leading-7">El desarrollador está preparando el recorrido virtual.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                ABOUT + LOCATION
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <section className="py-20 px-6 sm:px-10 lg:px-16">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.98fr)] gap-12 xl:gap-16 items-stretch">
                    {/* Description */}
                    <div className="h-full">
                        <span className="text-brand-400 text-sm font-bold uppercase tracking-widest">El proyecto</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-2 mb-6 tracking-tight">
                            {P.nombre}
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-10">
                            {P.descripcion || "El desarrollador está preparando la descripción del proyecto."}
                        </p>

                        {/* Feature grid — real data when available, tasteful defaults otherwise */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: Trees, label: "Espacios Verdes", text: "Áreas naturales integradas" },
                                { icon: Shield, label: "Seguridad 24hs", text: "Control de acceso perimetral" },
                                { icon: Compass, label: "Conectividad", text: "Acceso a rutas principales" },
                                { icon: Check, label: "Escritura Inmediata", text: "Seguridad jurídica total" },
                            ].map((f, i) => (
                                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm hover:border-brand-500/20 transition-colors">
                                    <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                                        <f.icon className="w-5 h-5 text-brand-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-foreground">{f.label}</p>
                                        <p className="text-sm text-muted-foreground mt-1 leading-6">{f.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalUnits > 0 && (
                            <div className="rounded-2xl bg-card border border-border shadow-sm p-6 mt-6">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Estado de lotes</p>
                                <div className="flex flex-wrap gap-4 mb-4">
                                    {[
                                        { label: "Disponibles", count: disponibles, color: "bg-emerald-500" },
                                        { label: "Reservados/Vendidos", count: vendidas, color: "bg-rose-500" },
                                        { label: "Otros", count: totalUnits - disponibles - vendidas, color: "bg-slate-600" },
                                    ].filter(s => s.count > 0).map((s, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                                            <span className="text-sm text-muted-foreground">{s.label} <strong className="text-foreground text-base">{s.count}</strong></span>
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(disponibles / totalUnits) * 100}%` }} />
                                    <div className="h-full bg-rose-500 transition-all" style={{ width: `${(vendidas / totalUnits) * 100}%` }} />
                                </div>
                                <p className="text-sm text-muted-foreground mt-3">{totalUnits} lotes en total</p>
                            </div>
                        )}
                    </div>

                    {/* Location map */}
                    <div className="h-full">
                        <div className="rounded-3xl overflow-hidden border border-border relative bg-card shadow-sm h-full min-h-[320px]">
                            {P.mapCenterLat && P.mapCenterLng ? (
                                <iframe
                                    src={`https://maps.google.com/maps?q=${P.mapCenterLat},${P.mapCenterLng}&z=${P.mapZoom || 16}&output=embed&t=k`}
                                    className="absolute inset-0 w-full h-full border-0"
                                    loading="lazy"
                                    title="Ubicación del proyecto"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                                    <MapPin className="w-12 h-12 mb-3" />
                                    <p className="font-medium">Ubicación por confirmar</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </section>

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                GALLERY
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <section className="py-12">
                <div className="px-6 sm:px-10 lg:px-16 mb-10">
                    <span className="text-brand-400 text-sm font-bold uppercase tracking-widest">Imágenes</span>
                    <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-2 tracking-tight">Galería del proyecto</h2>
                </div>
                <PublicProjectGallery imagenes={P.imagenes || []} />
            </section>

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                CONTACT
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <section id="contacto" className="py-24 px-6 sm:px-10 lg:px-16 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/8 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 blur-[120px] pointer-events-none" />

                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Info */}
                    <div className="lg:sticky lg:top-8">
                        <span className="text-brand-400 text-sm font-bold uppercase tracking-widest">Hablemos</span>
                        <h2 className="text-4xl sm:text-5xl font-black text-foreground mt-2 mb-5 tracking-tight leading-tight">
                            Invertí en {P.nombre}
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                            Completá el formulario y un asesor te contactará con la lista de precios actualizada y toda la información del proyecto.
                        </p>
                        <div className="space-y-3">
                            {[
                                { icon: Check, title: "Asesoramiento personalizado", desc: "Nuestro equipo te guía en cada paso." },
                                { icon: Shield, title: "Inversión segura", desc: "Respaldo legal y financiero en cada operación." },
                                { icon: Users, title: "Comunidad de inversores", desc: "Formá parte de nuestra red exclusiva." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm">
                                    <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-5 h-5 text-brand-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground text-lg">{item.title}</p>
                                        <p className="text-sm text-muted-foreground mt-1 leading-6">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="rounded-3xl bg-card/95 border border-border shadow-lg p-8 backdrop-blur-sm">
                        <h3 className="text-2xl font-black text-foreground mb-2">Consulta sobre {P.nombre}</h3>
                        <p className="text-base text-muted-foreground mb-7 leading-7">Sin compromiso. Te respondemos en menos de 24 horas.</p>
                        <ContactForm proyectoId={P.id} />
                    </div>
                </div>
            </section>

        </div>
    );
}
