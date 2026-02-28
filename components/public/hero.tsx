"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-white dark:bg-black">
            {/* Enhanced Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-yellow/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
                <LazyMotion features={domAnimation}>
                    <m.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center max-w-5xl mx-auto space-y-8"
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                            <Sparkles className="w-4 h-4 text-brand-orange" />
                            <span className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-brand-orange to-brand-gray dark:from-brand-orange dark:to-brand-surface bg-clip-text text-transparent">
                                Infraestructura para lanzamientos inmobiliarios
                            </span>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-brand-gray dark:text-brand-surface leading-[1.1]">
                            La infraestructura detrás de cada{" "}
                            <span className="bg-gradient-to-r from-brand-orange via-brand-orangeDark to-brand-yellow bg-clip-text text-transparent">
                                lanzamiento inmobiliario
                            </span>
                        </h1>

                        {/* Subheading */}
                        <p className="text-lg md:text-xl text-brand-muted max-w-3xl mx-auto leading-relaxed font-medium">
                            Banner premium con rotación automática, <span className="text-brand-orange font-semibold">masterplan interactivo sobre mapa real</span>, tours 360° y una comunidad con acceso anticipado — <span className="text-brand-gray dark:text-brand-surface font-semibold">abierta y VIP</span> — para cada desarrollo.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                            <Link
                                href="/contacto"
                                className="group px-10 py-5 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl font-black text-center shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                            >
                                <span className="relative z-10">Soy Desarrollador</span>
                                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            </Link>
                            <Link
                                href="/proyectos"
                                className="px-10 py-5 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white rounded-2xl font-black text-center shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                Ver Oportunidades
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 pt-16 opacity-80">
                            <div className="flex flex-col items-center">
                                <span className="text-5xl font-black bg-gradient-to-br from-brand-orange to-brand-orangeDark bg-clip-text text-transparent">360°</span>
                                <span className="text-[10px] text-brand-muted uppercase font-black tracking-widest mt-1">Tours Inmersivos</span>
                            </div>
                            <div className="w-px h-14 bg-gradient-to-b from-transparent via-brand-orange/10 to-transparent hidden md:block" />
                            <div className="flex flex-col items-center">
                                <span className="text-5xl font-black bg-gradient-to-br from-brand-gray to-brand-muted dark:from-brand-surface dark:to-brand-muted bg-clip-text text-transparent">100%</span>
                                <span className="text-[10px] text-brand-muted uppercase font-black tracking-widest mt-1">Verificación Documental</span>
                            </div>
                            <div className="w-px h-14 bg-gradient-to-b from-transparent via-brand-orange/10 to-transparent hidden md:block" />
                            <div className="flex flex-col items-center">
                                <span className="text-5xl font-black bg-gradient-to-br from-brand-orange via-brand-yellow to-brand-orangeDark bg-clip-text text-transparent">24/7</span>
                                <span className="text-[10px] text-brand-muted uppercase font-black tracking-widest mt-1">Exposición Premium</span>
                            </div>
                        </div>
                    </m.div>
                </LazyMotion>
            </div>
        </section>
    );
}
