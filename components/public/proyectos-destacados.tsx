"use client";
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/components/providers/language-provider';

interface Proyecto {
    id: string;
    nombre: string;
    slug: string | null;
    estado: string;
    tipo?: string;
    precioDesde?: number | null;
    imagenPortada?: string | null;
    ubicacion?: string | null;
    ciudad?: string | null;
    provincia?: string | null;
}

export default function ProyectosDestacados({ proyectos }: { proyectos: Proyecto[] }) {
    const { dictionary: t } = useLanguage();

    if (!proyectos || proyectos.length === 0) {
        return (
            <section className="py-24 bg-background">
                <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 xl:px-12 text-center">
                    <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6">{t.featuredProjects.title}</h2>
                    <div className="bg-card border border-border rounded-3xl p-12 max-w-2xl mx-auto shadow-xl">
                        <p className="text-xl text-foreground font-medium">{t.featuredProjects.emptyTitle}</p>
                        <p className="text-base text-muted-foreground mt-2">{t.featuredProjects.emptyDesc}</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-24 bg-background overflow-hidden">
            <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 xl:px-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6">
                    <div>
                        <span className="text-brand-orange font-bold uppercase tracking-widest text-sm mb-3 block">
                            {t.featuredProjects.badge}
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black text-foreground">{t.featuredProjects.title}</h2>
                    </div>
                    <Link
                        href="/proyectos"
                        className="text-foreground hover:text-brand-orange font-bold flex items-center gap-2 group transition-colors bg-card hover:bg-muted px-5 py-2.5 rounded-full border border-border"
                    >
                        {t.featuredProjects.viewAll} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {proyectos.map((proyecto) => (
                        <Link
                            href={`/proyectos/${proyecto.slug || ''}`}
                            key={proyecto.id}
                            className="group block rounded-[2rem] overflow-hidden bg-card border border-border shadow-lg hover:shadow-2xl hover:border-brand-orange/30 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            {/* Image Section */}
                            <div className="relative aspect-[4/3] overflow-hidden">
                                <Image
                                    src={proyecto.imagenPortada || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070"}
                                    alt={proyecto.nombre}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                {/* Badges */}
                                <div className="absolute top-5 left-5 flex flex-col items-start gap-2">
                                    <span className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg",
                                        proyecto.estado === "ACTIVO"
                                            ? "bg-emerald-500/90 text-white"
                                            : "bg-brand-orange/90 text-white"
                                    )}>
                                        {proyecto.estado}
                                    </span>
                                    {proyecto.tipo && (
                                        <span className="px-3 py-1.5 rounded-full bg-black/50 text-white/90 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
                                            {proyecto.tipo}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="p-6">
                                <h3 className="text-xl font-black text-foreground mb-2 group-hover:text-brand-orange transition-colors">
                                    {proyecto.nombre}
                                </h3>

                                {((proyecto.ciudad && proyecto.provincia) || proyecto.ubicacion) && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-base mb-6">
                                        <MapPin className="w-4 h-4 text-brand-orange/70 group-hover:text-brand-orange transition-colors" />
                                        <span className="truncate font-medium">
                                            {proyecto.ciudad && proyecto.provincia
                                                ? `${proyecto.ciudad}, ${proyecto.provincia}`
                                                : proyecto.ubicacion}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-border flex items-center justify-between">
                                    {proyecto.precioDesde ? (
                                        <div>
                                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">{t.featuredProjects.investmentFrom}</span>
                                            <span className="text-lg font-black text-foreground">
                                                {formatCurrency(proyecto.precioDesde)} <span className="text-sm font-semibold text-brand-orange">USD</span>
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="text-sm font-semibold text-muted-foreground">
                                            {t.featuredProjects.askPrice}
                                        </div>
                                    )}
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-brand-orange transition-colors">
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
