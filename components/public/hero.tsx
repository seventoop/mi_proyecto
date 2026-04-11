"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";

interface HeroProps {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    banners?: any[];
}

export default function Hero({ title, subtitle, ctaText }: HeroProps) {
    const { dictionary: t } = useLanguage();

    return (
        <section className="relative w-full pt-10 pb-16 lg:pt-16 lg:pb-24 flex items-center justify-center overflow-hidden bg-white dark:bg-[#1A1A2E]">
            <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
                <ScrollAnimationWrapper className="text-center max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-sm">
                        <Sparkles className="w-4 h-4 text-brand-orange" />
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
                            {t.hero.badge}
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
                        {title || (
                            <>
                                {t.hero.title1}
                                <span className="text-brand-orange">
                                    {t.hero.titleHighlight}
                                </span>
                            </>
                        )}
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                        {subtitle || (
                            <>
                                {t.hero.subtitle1}<strong className="text-foreground">{t.hero.subtitleHighlight}</strong>
                            </>
                        )}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                        <Link
                            href="/#proyectos"
                            className="group px-10 py-4 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-full font-black text-center shadow-lg shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <span>{ctaText || t.hero.cta1}</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                        </Link>
                        <Link
                            href="/#desarrolladores"
                            className="px-10 py-4 bg-background hover:bg-accent border border-border text-foreground rounded-full font-black text-center shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
                        >
                            {t.hero.cta2}
                        </Link>
                    </div>
                </ScrollAnimationWrapper>
            </div>
        </section>
    );
}
