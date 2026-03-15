import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { ArrowRight, MapPin, Check, Building2, Trees, Shield, Home, DollarSign, Calculator } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import ContactForm from "@/components/public/contact-form";
import TourModal from "@/components/public/tour-modal";
import PublicProjectGallery from "@/components/public/project-gallery";
import PaymentSimulator from "@/components/public/payment-simulator";
import { getProjectBanner } from "@/lib/actions/banners";
import { getProjectPublicViewBySlug } from "@/lib/project-landing/adapter";

const HERO_FALLBACK = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const project = await getProjectPublicViewBySlug(params.slug);
    if (!project) return { title: "Proyecto no encontrado" };
    return {
        title: `${project.nombre} | Seventoop`,
        description:
            project.descripcion?.slice(0, 160) ||
            `Conoce ${project.nombre}, nuestro nuevo desarrollo en ${project.ubicacion}.`,
    };
}

export default async function ProjectLandingPage({ params }: { params: { slug: string } }) {
    // ── Data via adapter (no direct DB access in this page) ──────────────────
    const project = await getProjectPublicViewBySlug(params.slug);
    if (!project) redirect("/proyectos");

    // Banner: fetched separately (banner module is stable, keep its own query)
    const bannerRes = await getProjectBanner(project.id);
    const projectHeroBanner = bannerRes.data;

    // Resolved hero image: banner > adapter heroImageUrl > fallback
    const heroSrc = projectHeroBanner?.mediaUrl || project.heroImageUrl || HERO_FALLBACK;

    // Pick a reference price from cheapest available unit (for simulator hint)
    const precioReferencia =
        project.unidadesDisponibles.find((u) => u.precio && u.precio > 0)?.precio ?? undefined;

    const { config } = project;
    const displayedUnidades = project.unidadesDisponibles.slice(0, config.maxUnidadesPublicas);

    return (
        <div className="bg-slate-950 text-white selection:bg-brand-500/30">
            {/* ─── Hero ──────────────────────────────────────────────────────── */}
            <section className="relative h-[80vh] min-h-[600px] flex items-end pb-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
                    <Image
                        src={heroSrc}
                        alt={project.nombre}
                        fill
                        className="object-cover animate-zoom-in"
                        priority
                        sizes="100vw"
                    />
                </div>

                <div className="relative z-20 max-w-7xl mx-auto px-4 w-full">
                    <div className="max-w-3xl animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-xs font-bold text-white border border-white/10 uppercase tracking-wider mb-6">
                            {project.tipo}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight mb-6">
                            {project.nombre}
                        </h1>
                        <p className="text-xl text-slate-300 flex items-center gap-2 mb-8">
                            <MapPin className="w-5 h-5 text-brand-400" />
                            {project.ubicacion || "Ubicación pendiente"}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {config.showMasterplan && (
                                <Link
                                    href={`/proyectos/${params.slug}/masterplan`}
                                    className="px-8 py-3.5 rounded-xl gradient-brand text-white font-bold text-lg shadow-glow hover:shadow-glow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                                >
                                    Ver Masterplan Interactivo
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            )}
                            <TourModal tours={project.tours as any} />
                            {project.tours.length > 0 && (
                                <Link
                                    href={`/proyectos/${params.slug}/tour360`}
                                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-earth-700 to-earth-600 text-white font-bold text-lg shadow-glow hover:shadow-glow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                                >
                                    Tour Virtual 360°
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            )}
                            <a
                                href="#contacto"
                                className="px-8 py-3.5 rounded-xl bg-white/10 border border-white/10 text-white font-semibold text-lg hover:bg-white/20 backdrop-blur-md transition-all flex items-center justify-center"
                            >
                                Solicitar Información
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Details & Features ────────────────────────────────────────── */}
            <section className="py-24 bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Sobre el proyecto</h2>
                        <div className="prose prose-invert prose-lg text-slate-400 mb-8">
                            <p>{project.descripcion || "Descripción detallada del proyecto próximamente."}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                { icon: Trees, label: "Espacios Verdes", text: "Integración con la naturaleza" },
                                { icon: Shield, label: "Seguridad 24hs", text: "Control de acceso y monitoreo" },
                                { icon: Building2, label: "Amenities Premium", text: "Club House y áreas deportivas" },
                                { icon: Check, label: "Escritura Inmediata", text: "Seguridad jurídica garantizada" },
                            ].map((feat, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                        <feat.icon className="w-6 h-6 text-brand-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{feat.label}</h4>
                                        <p className="text-sm text-slate-500">{feat.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                                <span className="text-slate-500 font-medium">Mapa de Ubicación</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -left-6 bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl max-w-xs">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-2 w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Unidades Disponibles</p>
                                    <p className="text-2xl font-bold text-white">
                                        {project.unidadesDisponibles.length} / {project.totalUnidades}
                                    </p>
                                </div>
                            </div>
                            <div className="text-sm text-slate-500">
                                Unidades disponibles actualmente para venta o reserva.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Gallery ───────────────────────────────────────────────────── */}
            {config.showGallery && (
                <PublicProjectGallery imagenes={project.imagenes as any} />
            )}

            {/* ─── Inventario público ─────────────────────────────────────────── */}
            {config.showUnidades && displayedUnidades.length > 0 && (
                <section className="py-20 bg-slate-900">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-bold text-white">Lotes Disponibles</h2>
                                <p className="text-slate-400 mt-1">
                                    {project.unidadesDisponibles.length} lotes disponibles para inversión
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {displayedUnidades.map((u) => (
                                <div
                                    key={u.id}
                                    className="bg-slate-800 border border-white/5 rounded-2xl p-5 hover:border-brand-500/40 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Home className="w-4 h-4 text-brand-400" />
                                            <span className="font-bold text-white">Lote #{u.numero}</span>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                            Disponible
                                        </span>
                                    </div>
                                    {u.superficie && (
                                        <p className="text-sm text-slate-400 mb-2">
                                            {u.superficie} m²
                                            {u.frente && u.fondo ? ` · ${u.frente}×${u.fondo}m` : ""}
                                        </p>
                                    )}
                                    {u.precio && (
                                        <p className="text-lg font-black text-white mt-2 flex items-center gap-1">
                                            <DollarSign className="w-4 h-4 text-brand-400" />
                                            {formatCurrency(u.precio)} {u.moneda}
                                        </p>
                                    )}
                                    <a
                                        href="#simulador"
                                        className="mt-3 block w-full py-2 text-center rounded-xl text-xs font-bold bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
                                    >
                                        Simular financiación
                                    </a>
                                </div>
                            ))}
                        </div>
                        {project.unidadesDisponibles.length > config.maxUnidadesPublicas && (
                            <p className="text-center text-slate-500 mt-6 text-sm">
                                {project.unidadesDisponibles.length - config.maxUnidadesPublicas} lotes más disponibles — consultá por la lista completa
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* ─── Tour 360° (URL externa) ────────────────────────────────────── */}
            {config.showTour360 && project.tour360Url && (
                <section className="py-20 bg-slate-950">
                    <div className="max-w-7xl mx-auto px-4">
                        <h2 className="text-3xl font-bold text-white mb-2">Tour Virtual 360°</h2>
                        <p className="text-slate-400 mb-8">Explorá el proyecto desde la comodidad de tu hogar</p>
                        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: 550 }}>
                            <iframe
                                src={project.tour360Url}
                                className="w-full h-full"
                                allowFullScreen
                                style={{ border: "none" }}
                                title="Tour 360°"
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* ─── Simulador de cuotas ────────────────────────────────────────── */}
            {config.showSimulator && (
                <section id="simulador" className="py-20 bg-slate-900">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                            {/* Left: copy */}
                            <div className="lg:pt-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calculator className="w-5 h-5 text-brand-400" />
                                    <span className="text-brand-400 font-bold tracking-wider text-sm uppercase">
                                        Simulador Comercial
                                    </span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                                    Diseñá tu plan de pago
                                </h2>
                                <p className="text-lg text-slate-400 mb-6 max-w-md">
                                    Indicá cuánto podés poner de anticipo y qué cuota mensual te resulta cómoda.
                                    Un asesor va a revisar tu propuesta y te devuelve una opción real.
                                </p>
                                <div className="space-y-4">
                                    {[
                                        "Sin compromiso — es una propuesta orientativa",
                                        "Un asesor te responde en menos de 24 hs",
                                        "Podés ajustar los números junto al equipo comercial",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 text-brand-400" />
                                            </div>
                                            <p className="text-sm text-slate-300">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: simulator */}
                            <PaymentSimulator
                                proyectoId={project.id}
                                proyectoNombre={project.nombre}
                                precioReferencia={precioReferencia}
                                config={config.simulation}
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* ─── Contact ────────────────────────────────────────────────────── */}
            {config.showContactForm && (
                <section id="contacto" className="py-24 bg-slate-950 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-900/10 blur-[100px]" />
                    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                        <div>
                            <span className="text-brand-400 font-bold tracking-wider text-sm uppercase mb-4 block">
                                Hablemos de tu inversión
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                Solicita más información
                            </h2>
                            <p className="text-xl text-slate-400 mb-8 max-w-lg">
                                Completá el formulario y recibí la lista de precios actualizada y el brochure digital del proyecto.
                            </p>
                            <div className="space-y-6">
                                {[
                                    { title: "Atención Personalizada", desc: "Asesoramiento experto para tu inversión." },
                                    { title: "Financiación a Medida", desc: "Planes de pago flexibles en pesos o dólares." },
                                ].map((item) => (
                                    <div key={item.title} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                                            <Check className="w-5 h-5 text-brand-400" />
                                        </div>
                                        <div className="text-sm text-slate-300">
                                            <strong className="text-white block">{item.title}</strong>
                                            {item.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6">Consulta por {project.nombre}</h3>
                            <ContactForm proyectoId={project.id} />
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
