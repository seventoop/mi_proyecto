"use client";

import { Newspaper, ArrowUpRight, Calendar } from "lucide-react";
import Image from "next/image";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";
import { useLanguage } from "@/components/providers/language-provider";

const NOTICIAS_MOCK = [
    {
        image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop",
        date: "2026-04-08",
        titleEs: "Barrio Capinota alcanza el 70% de ocupación en preventa",
        titleEn: "Barrio Capinota reaches 70% presale occupancy",
        descEs: "El desarrollo ubicado en Cochabamba superó las expectativas de comercialización con su masterplan interactivo y tours 360° integrados.",
        descEn: "The Cochabamba development exceeded sales expectations with its interactive masterplan and integrated 360° tours.",
        tag: "Hito",
    },
    {
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop",
        date: "2026-03-22",
        titleEs: "SevenToop integra tecnología de planos AI para desarrolladores",
        titleEn: "SevenToop integrates AI blueprint technology for developers",
        descEs: "Nuestro procesador de planos con inteligencia artificial permite detectar geometrías y generar loteos automáticamente desde archivos DXF y SVG.",
        descEn: "Our AI-powered blueprint processor detects geometries and generates subdivisions automatically from DXF and SVG files.",
        tag: "Tecnología",
    },
    {
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
        date: "2026-03-10",
        titleEs: "Comunidad VIP: acceso anticipado a 3 nuevos desarrollos",
        titleEn: "VIP Community: early access to 3 new developments",
        descEs: "Los miembros de la comunidad VIP ya pueden explorar los masterplans de tres desarrollos exclusivos antes de su lanzamiento público.",
        descEn: "VIP community members can now explore the masterplans of three exclusive developments before their public launch.",
        tag: "Comunidad",
    },
];

function formatDate(dateStr: string, locale: string) {
    return new Date(dateStr).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function Noticias() {
    const { locale, dictionary: t } = useLanguage();

    return (
        <section className="py-16 md:py-24 bg-background relative overflow-hidden border-t border-border">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <ScrollAnimationWrapper className="text-center max-w-3xl mx-auto mb-12 space-y-5">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-black uppercase tracking-[0.2em] border border-brand-orange/20">
                        <Newspaper className="w-4 h-4" />
                        {(t as any).news?.badge}
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                        {(t as any).news?.title}{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            {(t as any).news?.titleHighlight}
                        </span>
                    </h2>

                    <p className="text-foreground/60 text-lg md:text-xl font-medium leading-relaxed">
                        {(t as any).news?.description}
                    </p>
                </ScrollAnimationWrapper>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {NOTICIAS_MOCK.map((item, idx) => (
                        <ScrollAnimationWrapper key={idx}>
                            <article className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-brand-orange/30 transition-all duration-300 hover:shadow-lg hover:shadow-brand-orange/5">
                                <div className="relative h-48 overflow-hidden">
                                    <Image
                                        src={item.image}
                                        alt={locale === "es" ? item.titleEs : item.titleEn}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 left-3">
                                        <span className="px-3 py-1 rounded-full bg-brand-orange/90 text-white text-xs font-black uppercase tracking-wider">
                                            {item.tag}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {formatDate(item.date, locale)}
                                    </div>

                                    <h3 className="text-lg font-bold text-foreground leading-snug line-clamp-2 group-hover:text-brand-orange transition-colors">
                                        {locale === "es" ? item.titleEs : item.titleEn}
                                    </h3>

                                    <p className="text-sm text-foreground/60 leading-relaxed line-clamp-3">
                                        {locale === "es" ? item.descEs : item.descEn}
                                    </p>

                                    <div className="pt-2">
                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-orange group-hover:gap-2 transition-all">
                                            {(t as any).news?.readMore || "Leer más"}
                                            <ArrowUpRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </ScrollAnimationWrapper>
                    ))}
                </div>
            </div>
        </section>
    );
}
