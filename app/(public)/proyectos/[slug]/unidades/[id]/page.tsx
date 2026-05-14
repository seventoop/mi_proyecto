import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, Maximize2, DollarSign, Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ContactForm from "@/components/public/contact-form";
import FinancingSimulator from "@/components/public/financing-simulator";
import TourModal from "@/components/public/tour-modal";
import { NORMALIZED_UNIT_ESTADO, normalizeUnitEstado } from "@/lib/public-projects";
import { getPublicProjectShowcaseBySlug } from "@/lib/project-showcase";

async function getUnitPageData(slug: string, unitId: string) {
    const project = await getPublicProjectShowcaseBySlug(slug);
    if (!project) return null;

    const unit = project.units.find((item) => item.id === unitId);
    if (!unit) return null;

    const tours = project.tours.filter((tour) =>
        tour.scenes.some((scene) => scene.hotspots.some((hotspot) => hotspot.unidad?.id === unitId))
    );

    return { project, unit, tours };
}

export async function generateMetadata({ params }: { params: { slug: string, id: string } }): Promise<Metadata> {
    const data = await getUnitPageData(params.slug, params.id);
    if (!data) return { title: "Unidad no encontrada" };

    return {
        title: `Unidad ${data.unit.numero} - ${data.project.nombre} | Seventoop`,
        description: `Detalles de la unidad ${data.unit.numero} en ${data.project.nombre}. Superficie: ${data.unit.superficie}m². Precio: ${data.unit.precio} ${data.unit.moneda}.`,
    };
}

export default async function UnitDetailPage({ params }: { params: { slug: string, id: string } }) {
    const data = await getUnitPageData(params.slug, params.id);
    if (!data) {
        notFound();
    }

    const { unit, project, tours } = data;
    const normalizedEstado = normalizeUnitEstado(unit.estado);

    return (
        <div className="bg-slate-950 min-h-screen pt-24 pb-20 text-white">
            <div className="w-full px-4 mb-8">
                <Link
                    href={`/proyectos/${params.slug}/masterplan`}
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al Masterplan
                </Link>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded bg-white/10 text-xs font-semibold text-slate-300 uppercase">
                                {unit.tipo === "LOTE" ? "Lote" : "Departamento"}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                                normalizedEstado === NORMALIZED_UNIT_ESTADO.DISPONIBLE
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : normalizedEstado === NORMALIZED_UNIT_ESTADO.RESERVADA
                                        ? "bg-orange-500/20 text-orange-400"
                                        : "bg-red-500/20 text-red-400"
                            }`}>
                                {normalizedEstado}
                            </span>
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-2">Unidad {unit.numero}</h1>
                        <p className="text-lg text-slate-400 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-brand-400" />
                            {project.nombre} • {unit.etapaNombre} • {unit.manzanaNombre}
                        </p>
                    </div>
                    {tours.length > 0 && (
                        <TourModal tours={tours as any} />
                    )}
                </div>
            </div>

            <div className="w-full px-4 grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <Maximize2 className="w-4 h-4" /> Superficie
                            </div>
                            <p className="text-xl font-bold text-white">{unit.superficie} m²</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <DollarSign className="w-4 h-4" /> Precio
                            </div>
                            <p className="text-xl font-bold text-white">{formatCurrency(unit.precio || 0, unit.moneda)}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <Calendar className="w-4 h-4" /> Entrega
                            </div>
                            <p className="text-xl font-bold text-white">Inmediata</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <ArrowRight className="w-4 h-4" /> Orientación
                            </div>
                            <p className="text-xl font-bold text-white uppercase">{unit.orientacion || "-"}</p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Características</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: "Frente", value: unit.frente ? `${unit.frente}m` : "-" },
                                { label: "Fondo", value: unit.fondo ? `${unit.fondo}m` : "-" },
                                { label: "Esquina", value: unit.esEsquina ? "Sí" : "No" },
                                { label: "Moneda", value: unit.moneda },
                                { label: "Ubicación Interna", value: unit.manzanaNombre || "-" },
                                { label: "Etapa", value: unit.etapaNombre || "-" },
                                { label: "Tour 360", value: unit.tour360Url ? "Disponible" : "Consultar" },
                                { label: "Estado", value: normalizedEstado },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 transition-colors">
                                    <span className="text-slate-400">{item.label}</span>
                                    <span className="font-semibold text-white">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {normalizedEstado === NORMALIZED_UNIT_ESTADO.DISPONIBLE && (
                        <FinancingSimulator price={unit.precio || 0} currency={unit.moneda} />
                    )}

                    <div className="pt-8 border-t border-white/10">
                        <Link
                            href={`/proyectos/${params.slug}`}
                            className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Ver más sobre {project.nombre}
                        </Link>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <div className="text-center mb-6">
                                <p className="text-sm text-slate-400 mb-1">Precio de Lista</p>
                                <p className="text-4xl font-bold text-white mb-2">{formatCurrency(unit.precio || 0, unit.moneda)}</p>
                                {normalizedEstado === NORMALIZED_UNIT_ESTADO.DISPONIBLE && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Disponible
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-white">Consultar por esta unidad</h3>
                                <ContactForm
                                    proyectoId={project.id}
                                    compact
                                    className="pt-2"
                                />
                                <p className="text-xs text-center text-slate-500">
                                    Al enviar estás aceptando nuestros términos y condiciones.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
