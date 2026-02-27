import { Check, X, Info } from "lucide-react";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";

const whatIs = [
    "Plataforma tecnológica para desarrollos inmobiliarios",
    "Infraestructura comercial para lanzamientos",
    "Canal publicitario especializado en urbanizaciones, loteos y edificios en pozo",
    "Sistema integral de lanzamiento con masterplan, tours, CRM y reservas",
    "Comunidad estratégica con acceso anticipado a proyectos",
];

const whatIsNot = [
    "No es una inmobiliaria ni opera como tal",
    "No intermedia ni participa en operaciones de compraventa",
    "No es un portal de clasificados ni un marketplace genérico",
];

export default function WhatIsSevenToop() {
    return (
        <section className="py-20 px-6 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/5">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <ScrollAnimationWrapper className="text-center max-w-3xl mx-auto mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Info className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            Identidad
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                        Qué es SevenToop{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            y qué no es
                        </span>
                    </h2>
                    <p className="text-lg text-foreground/60 leading-relaxed">
                        Somos claros con lo que hacemos y con lo que no. Así construimos confianza.
                    </p>
                </ScrollAnimationWrapper>

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* What it IS */}
                    <ScrollAnimationWrapper
                        direction="right"
                        className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5 p-8 space-y-6 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black text-foreground mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-emerald-500" />
                                </div>
                                Lo que somos
                            </h3>
                            <ul className="space-y-4">
                                {whatIs.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground/70 leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </ScrollAnimationWrapper>

                    {/* What it IS NOT */}
                    <ScrollAnimationWrapper
                        direction="left"
                        className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5 p-8 space-y-6 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black text-foreground mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <X className="w-5 h-5 text-red-500" />
                                </div>
                                Lo que no somos
                            </h3>
                            <ul className="space-y-4">
                                {whatIsNot.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <X className="w-3.5 h-3.5 text-red-500" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground/70 leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-foreground/40 mt-8 leading-relaxed border-t border-foreground/5 pt-4">
                                SevenToop actúa exclusivamente como plataforma tecnológica y canal de exposición.
                                No intermedia, no asesora financieramente ni garantiza resultados comerciales.
                            </p>
                        </div>
                    </ScrollAnimationWrapper>
                </div>
            </div>
        </section>
    );
}
