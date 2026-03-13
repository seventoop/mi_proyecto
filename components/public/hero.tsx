"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

interface HeroProps {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    banners?: any[];
}

export default function Hero({ title, subtitle, ctaText }: HeroProps) {
    const { dictionary: t } = useLanguage();

    return (
        <section className="relative w-full pt-12 pb-20 lg:pt-20 lg:pb-32 flex items-center justify-center overflow-hidden bg-white dark:bg-[#1A1A2E]">
            <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
                <LazyMotion features={domAnimation}>
                    <m.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center max-w-4xl mx-auto space-y-8"
                    >
                        {/* Badge */}
                        <m.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-sm"
                        >
                            <Sparkles className="w-4 h-4 text-brand-orange" />
                            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
                                {t.hero.badge}
                            </span>
                        </m.div>

                        {/* Main Heading */}
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

                        {/* Subheading */}
                        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                            {subtitle || (
                                <>
                                    {t.hero.subtitle1}<strong className="text-foreground">{t.hero.subtitleHighlight}</strong>
                                </>
                            )}
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                            <Link
                                href="/proyectos"
                                className="group px-10 py-4 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-full font-black text-center shadow-lg shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <span>{ctaText || t.hero.cta1}</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/desarrolladores"
                                className="px-10 py-4 bg-background hover:bg-accent border border-border text-foreground rounded-full font-black text-center shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                            >
                                {t.hero.cta2}
                            </Link>
                        </div>
                    </m.div>
                </LazyMotion>
            </div>
        </section>
    );
}
