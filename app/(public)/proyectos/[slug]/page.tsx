import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
    MapPin, ArrowRight, Map, Compass, Play,
    Home, Calculator, Check, Building2,
    Trees, Shield, Navigation, ChevronRight,
    Square,
} from "lucide-react";
import { getProjectPublicViewBySlug } from "@/lib/project-landing/adapter";
import ContactForm from "@/components/public/contact-form";
import PublicProjectGallery from "@/components/public/project-gallery";
import LandingSimulatorSection from "@/components/public/landing-simulator-section";
import TourModal from "@/components/public/tour-modal";

const ESTADO_LABELS: Record<string, string> = {
    PLANIFICACION: "En planificación",
    PREVENTA: "Preventa",
    EN_VENTA: "En venta",
    EN_DESARROLLO: "En desarrollo",
    ENTREGADO: "Entregado",
    SUSPENDIDO: "Suspendido",
};

const TIPO_LABELS: Record<string, string> = {
    URBANIZACION: "Urbanización",
    LOTE: "Loteo",
    EDIFICIO: "Edificio",
    DUPLEX: "Dúplex",
    CASA: "Casa",
    OTRO: "Otro",
};

const UNIT_STATE_COLORS: Record<string, string> = {
    DISPONIBLE: "bg-emerald-500",
    RESERVADA: "bg-amber-500",
    VENDIDA: "bg-rose-500",
    BLOQUEADA: "bg-slate-500",
};

const UNIT_STATE_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    BLOQUEADA: "No disponible",
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const project = await getProjectPublicViewBySlug(params.slug);
    if (!project) return { title: "Proyecto no encontrado" };
    return {
        title: `${project.nombre} | SevenToop`,
        description: project.descripcion?.slice(0, 160) ?? `Conocé ${project.nombre} en SevenToop.`,
        openGraph: {
            title: project.nombre,
            description: project.descripcion?.slice(0, 160) ?? undefined,
            images: project.heroImageUrl ? [{ url: project.heroImageUrl }] : undefined,
        },
    };
}

export default async function ProjectLandingPage({ params }: { params: { slug: string } }) {
    const project = await getProjectPublicViewBySlug(params.slug);
    if (!project) notFound();

    const {
        id, nombre, descripcion, ubicacion, tipo, estado,
        heroImageUrl, hasMasterplan, hasTour360Url, tour360Url,
        imagenes, tours, unidadesDisponibles, totalUnidades,
        config, mapCenterLat, mapCenterLng,
    } = project;

    const slug = params.slug;
    const mapsUrl = `https://www.google.com/maps?q=${mapCenterLat},${mapCenterLng}`;
    const mapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapCenterLat},${mapCenterLng}`;
    const mapsEmbedUrl = `https://maps.google.com/maps?q=${mapCenterLat},${mapCenterLng}&z=15&output=embed`;

    const heroImage = heroImageUrl ?? "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop";

    const disponibles = unidadesDisponibles.length;
    const vendidas = totalUnidades - disponibles;
    const pctDisponible = totalUnidades > 0 ? Math.round((disponibles / totalUnidades) * 100) : 0;

    const hasCoords = mapCenterLat !== -34.6037 || mapCenterLng !== -58.3816;
    const hasTour = (tours && tours.length > 0) || hasTour360Url;

    return (
        <div className="bg-slate-950 text-white min-h-screen">

            {/* ─── HERO ───────────────────────────────────────────── */}
            <section className="relative min-h-screen flex items-end pb-16 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
                    <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/60 to-transparent" />
                    <img
                        src={heroImage}
                        alt={nombre}
                        className="w-full h-full object-cover scale-105 animate-[zoom-out_12s_ease-out_forwards]"
                    />
                </div>

                <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
                    <div className="max-w-3xl">
                        <div className="flex flex-wrap gap-2 mb-6">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-bold uppercase tracking-wider border border-white/10">
                                {TIPO_LABELS[tipo] ?? tipo}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 backdrop-blur text-brand-orange text-xs font-bold uppercase tracking-wider border border-brand-orange/20">
                                {ESTADO_LABELS[estado] ?? estado}
                            </span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-4">
                            {nombre}
                        </h1>

                        {ubicacion && (
                            <div className="flex items-center gap-2 text-slate-300 mb-8">
                                <MapPin className="w-4 h-4 text-brand-orange flex-shrink-0" />
                                <span className="text-lg">{ubicacion}</span>
                            </div>
                        )}

                        {descripcion && (
                            <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-xl">
                                {descripcion.slice(0, 200)}{descripcion.length > 200 ? "..." : ""}
                            </p>
                        )}

                        {/* CTAs */}
                        <div className="flex flex-wrap gap-3">
                            {hasMasterplan && (
                                <Link
                                    href={`/proyectos/${slug}/masterplan`}
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-orange hover:bg-brand-orangeDark text-white font-bold text-sm shadow-lg shadow-brand-orange/30 hover:scale-105 transition-all"
                                >
                                    <Map className="w-4 h-4" />
                                    Ver Master Plan
                                </Link>
                            )}

                            {hasCoords && (
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white font-bold text-sm border border-white/10 hover:scale-105 transition-all"
                                >
                                    <Navigation className="w-4 h-4" />
                                    Ver Ubicación
                                </a>
                            )}

                            {hasTour && (
                                <Link
                                    href={`/proyectos/${slug}/tour360`}
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white font-bold text-sm border border-white/10 hover:scale-105 transition-all"
                                >
                                    <Compass className="w-4 h-4" />
                                    Tour 360°
                                </Link>
                            )}

                            {tours && tours.length > 0 && (
                                <TourModal tours={tours} />
                            )}

                            {totalUnidades > 0 && (
                                <a
                                    href="#lotes"
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white font-bold text-sm border border-white/10 hover:scale-105 transition-all"
                                >
                                    <Home className="w-4 h-4" />
                                    Explorar Lotes
                                </a>
                            )}

                            <a
                                href="#simulador"
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white font-bold text-sm border border-white/10 hover:scale-105 transition-all"
                            >
                                <Calculator className="w-4 h-4" />
                                Simular Cuotas
                            </a>
                        </div>
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="absolute bottom-8 right-8 z-20 hidden md:flex flex-col items-center gap-2 text-slate-600">
                    <div className="w-6 h-10 rounded-full border-2 border-slate-700 flex items-start justify-center p-1.5">
                        <div className="w-1 h-2 rounded-full bg-slate-500 animate-bounce" />
                    </div>
                </div>
            </section>

            {/* ─── STATS BAR ──────────────────────────────────────── */}
            {totalUnidades > 0 && (
                <section className="border-y border-white/10 bg-slate-900/50 backdrop-blur py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <p className="text-3xl font-black text-white">{totalUnidades}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Lotes totales</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black text-emerald-400">{disponibles}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Disponibles</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black text-white">{pctDisponible}%</p>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Stock disponible</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black text-slate-400">{vendidas}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Vendidos / Reservados</p>
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${pctDisponible}%` }}
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* ─── ABOUT + MAPS ────────────────────────────────────── */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    <div>
                        <p className="text-brand-orange font-bold text-xs uppercase tracking-widest mb-4">El Proyecto</p>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                            Sobre {nombre}
                        </h2>
                        <p className="text-slate-400 text-base leading-relaxed mb-8">
                            {descripcion ?? "Este desarrollo cuenta con una propuesta única en su categoría. Consultá con nuestro equipo para más información."}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {[
                                { icon: Trees, label: "Espacios Verdes", desc: "Integración con la naturaleza" },
                                { icon: Shield, label: "Seguridad 24hs", desc: "Control de acceso y monitoreo" },
                                { icon: Building2, label: "Infraestructura", desc: "Todos los servicios disponibles" },
                                { icon: Check, label: "Documentación", desc: "Seguridad jurídica garantizada" },
                            ].map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-5 h-5 text-brand-orange" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{label}</p>
                                        <p className="text-slate-500 text-xs">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {ubicacion && hasCoords && (
                            <div className="flex flex-wrap gap-3">
                                <a
                                    href={mapsNavUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-orange hover:bg-brand-orangeDark text-white font-bold text-sm transition-all shadow-lg shadow-brand-orange/20"
                                >
                                    <Navigation className="w-4 h-4" />
                                    Cómo Llegar
                                </a>
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all"
                                >
                                    <MapPin className="w-4 h-4" />
                                    Ver en Google Maps
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Map */}
                    <div className="relative">
                        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video">
                            {hasCoords ? (
                                <iframe
                                    src={mapsEmbedUrl}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title={`Ubicación de ${nombre}`}
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-3">
                                    <MapPin className="w-10 h-10 text-slate-600" />
                                    <p className="text-slate-500 text-sm text-center px-8">
                                        {ubicacion ? `📍 ${ubicacion}` : "Ubicación próximamente disponible"}
                                    </p>
                                </div>
                            )}
                        </div>
                        {ubicacion && (
                            <div className="absolute -bottom-4 left-4 right-4 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl">
                                <MapPin className="w-4 h-4 text-brand-orange flex-shrink-0" />
                                <p className="text-sm text-slate-300 truncate">{ubicacion}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ─── GALLERY ────────────────────────────────────────── */}
            {imagenes.length > 0 && (
                <PublicProjectGallery imagenes={imagenes} />
            )}

            {/* ─── MASTERPLAN CTA ──────────────────────────────────── */}
            {hasMasterplan && (
                <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Map className="w-5 h-5 text-brand-orange" />
                                    <span className="text-brand-orange font-bold text-xs uppercase tracking-widest">Master Plan Interactivo</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
                                    Explorá el plano completo del desarrollo
                                </h3>
                                <p className="text-slate-400 text-base max-w-md">
                                    Visualizá todos los lotes, sus dimensiones, precios y disponibilidad en tiempo real. Hacé click en cualquier lote para ver el detalle.
                                </p>
                            </div>
                            <Link
                                href={`/proyectos/${slug}/masterplan`}
                                className="flex-shrink-0 flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-orange hover:bg-brand-orangeDark text-white font-black text-base transition-all hover:scale-105 shadow-lg shadow-brand-orange/20"
                            >
                                Ver Master Plan
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ─── TOUR 360° CTA ───────────────────────────────────── */}
            {hasTour && (
                <section className="py-8 pb-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl min-h-[280px] flex items-center">
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-20"
                                style={{ backgroundImage: `url(${heroImage})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-slate-950/50" />
                            <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 w-full">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Compass className="w-5 h-5 text-brand-orange" />
                                        <span className="text-brand-orange font-bold text-xs uppercase tracking-widest">Tour Virtual 360°</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
                                        Recorrelo desde donde estés
                                    </h3>
                                    <p className="text-slate-400 text-base max-w-md">
                                        Experiencia inmersiva completa: mirá el terreno en todas las direcciones sin moverte de tu silla.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                                    {tours && tours.length > 0 && (
                                        <TourModal tours={tours} />
                                    )}
                                    <Link
                                        href={`/proyectos/${slug}/tour360`}
                                        className="flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white font-black text-base transition-all"
                                    >
                                        <Play className="w-5 h-5" />
                                        Tour 360°
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ─── AVAILABLE UNITS ─────────────────────────────────── */}
            {unidadesDisponibles.length > 0 && (
                <section id="lotes" className="py-24 bg-slate-900/30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <p className="text-brand-orange font-bold text-xs uppercase tracking-widest mb-3">Inventario</p>
                                <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                                    Lotes Disponibles
                                </h2>
                                <p className="text-slate-400">
                                    {disponibles} lote{disponibles !== 1 ? "s" : ""} disponible{disponibles !== 1 ? "s" : ""} para reserva
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs">
                                {Object.entries(UNIT_STATE_LABELS).map(([key, label]) => (
                                    <div key={key} className="flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${UNIT_STATE_COLORS[key] ?? "bg-slate-500"}`} />
                                        <span className="text-slate-400">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {unidadesDisponibles.slice(0, config.maxUnidadesPublicas).map((u) => (
                                <div
                                    key={u.id}
                                    className="group relative rounded-2xl bg-slate-900 border border-white/10 p-5 hover:border-brand-orange/40 hover:bg-slate-800/50 transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${UNIT_STATE_COLORS[u.estado] ?? "bg-slate-500"}`} />
                                            <span className="font-black text-white text-lg">#{u.numero}</span>
                                        </div>
                                        {u.esEsquina && (
                                            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg px-2 py-0.5 uppercase tracking-wide">
                                                Esquina
                                            </span>
                                        )}
                                    </div>

                                    {u.superficie && (
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Square className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-slate-300 text-sm font-semibold">{u.superficie} m²</span>
                                        </div>
                                    )}
                                    {u.frente && u.fondo && (
                                        <p className="text-slate-500 text-xs mb-2">{u.frente}m × {u.fondo}m</p>
                                    )}
                                    {u.manzanaNombre && (
                                        <p className="text-slate-600 text-xs mb-3">Mz. {u.manzanaNombre}</p>
                                    )}

                                    {u.precio ? (
                                        <p className="text-brand-orange font-black text-base">
                                            {u.moneda} {u.precio.toLocaleString("es-AR")}
                                        </p>
                                    ) : (
                                        <p className="text-slate-500 text-sm italic">Precio a consultar</p>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-orange scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                </div>
                            ))}
                        </div>

                        {unidadesDisponibles.length > config.maxUnidadesPublicas && (
                            <div className="mt-8 text-center">
                                <a
                                    href="#contacto"
                                    className="inline-flex items-center gap-2 text-brand-orange hover:text-brand-orangeDark font-bold text-sm transition-colors"
                                >
                                    Ver todos los lotes disponibles
                                    <ChevronRight className="w-4 h-4" />
                                </a>
                            </div>
                        )}

                        {hasMasterplan && (
                            <div className="mt-8 text-center">
                                <Link
                                    href={`/proyectos/${slug}/masterplan`}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/30 font-semibold text-sm transition-all"
                                >
                                    <Map className="w-4 h-4" />
                                    Ver todos los lotes en el master plan
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ─── SIMULATOR ──────────────────────────────────────── */}
            {config.showSimulator && (
                <section id="simulador" className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/5 via-transparent to-transparent" />
                    <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-orange/5 blur-[100px]" />

                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                        <div className="mb-12 max-w-2xl">
                            <p className="text-brand-orange font-bold text-xs uppercase tracking-widest mb-4">Financiación</p>
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                                Simulá tu plan de pago
                            </h2>
                            <p className="text-slate-400 text-base leading-relaxed">
                                Configurá el anticipo y el plazo que más te convengan. Los valores son orientativos — enviá tu propuesta y te contactamos para definir los detalles.
                            </p>
                        </div>

                        <LandingSimulatorSection
                            proyectoId={id}
                            proyectoNombre={nombre}
                            unidades={unidadesDisponibles}
                            config={config.simulation}
                        />
                    </div>
                </section>
            )}

            {/* ─── CONTACT ────────────────────────────────────────── */}
            {config.showContactForm && (
                <section id="contacto" className="py-24 border-t border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <p className="text-brand-orange font-bold text-xs uppercase tracking-widest mb-4">Contacto</p>
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                                ¿Querés más información?
                            </h2>
                            <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-lg">
                                Completá el formulario y recibí la lista de precios actualizada, el brochure digital y toda la información que necesitás para tomar la mejor decisión.
                            </p>

                            <div className="space-y-4">
                                {[
                                    { label: "Atención personalizada", desc: "Asesoramiento experto para tu inversión" },
                                    { label: "Financiación a medida", desc: "Planes flexibles en pesos o dólares" },
                                    { label: "Sin intermediarios", desc: "Hablás directamente con el equipo del proyecto" },
                                ].map(({ label, desc }) => (
                                    <div key={label} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-4 h-4 text-brand-orange" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{label}</p>
                                            <p className="text-slate-500 text-xs">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {hasCoords && (
                                <a
                                    href={mapsNavUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-6 inline-flex items-center gap-2 text-slate-400 hover:text-brand-orange transition-colors text-sm"
                                >
                                    <Navigation className="w-4 h-4" />
                                    Cómo llegar al desarrollo
                                </a>
                            )}
                        </div>

                        <div className="bg-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6">Consultar por {nombre}</h3>
                            <ContactForm proyectoId={id} />
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
