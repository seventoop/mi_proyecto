"use client";

import { Newspaper, ArrowUpRight, Calendar } from "lucide-react";
import Image from "next/image";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";
import { useLanguage } from "@/components/providers/language-provider";

const newsImages = [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
] as const;

function formatDate(dateStr: string, locale: string) {
    return new Date(dateStr).toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function Noticias() {
    const { locale, dictionary: t } = useLanguage();
    const copy = t.news;

    return (
        <section className="relative overflow-hidden border-t border-border bg-background py-14 sm:py-16 md:py-24">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
                <ScrollAnimationWrapper className="text-center max-w-3xl mx-auto mb-12 space-y-5">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-black uppercase tracking-[0.2em] border border-brand-orange/20">
                        <Newspaper className="w-4 h-4" />
                        {copy.badge}
                    </div>

                    <h2 className="text-3xl font-black tracking-tight text-foreground leading-[1.1] sm:text-4xl md:text-6xl">
                        {copy.title}{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            {copy.titleHighlight}
                        </span>
                    </h2>

                    <p className="text-foreground/60 text-base font-medium leading-relaxed sm:text-lg md:text-xl">
                        {copy.description}
                    </p>
                </ScrollAnimationWrapper>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                    {copy.items.map((item, idx) => (
                        <ScrollAnimationWrapper key={item.title}>
                            <article className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-brand-orange/30 hover:shadow-lg hover:shadow-brand-orange/5">
                                <div className="relative h-48 overflow-hidden">
                                    <Image
                                        src={newsImages[idx] ?? newsImages[0]}
                                        alt={item.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute left-3 top-3">
                                        <span className="rounded-full bg-brand-orange/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                                            {item.tag}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 p-5">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDate(item.date, locale)}
                                    </div>

                                    <h3 className="line-clamp-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-brand-orange">
                                        {item.title}
                                    </h3>

                                    <p className="line-clamp-3 text-sm leading-relaxed text-foreground/60">
                                        {item.description}
                                    </p>

                                    <div className="pt-2">
                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-orange transition-all group-hover:gap-2">
                                            {copy.readMore}
                                            <ArrowUpRight className="h-4 w-4" />
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
