"use client";

import { Code2, Megaphone, Target, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

const PARTNERS = [
    { name: "eventos", color: "text-rose-600" },
    { name: "LOGOGRAB", color: "text-slate-900 dark:text-white" },
    { name: "nrg", color: "text-red-600" },
    { name: "GHX", color: "text-blue-800 dark:text-blue-200" },
    { name: "Bridge360", color: "text-emerald-700" },
    { name: "SevenToop", color: "text-brand-orange" },
    { name: "InmoTech", color: "text-slate-600 dark:text-slate-300" },
    { name: "DataBridge", color: "text-indigo-600" },
];

export default function ParaDesarrolladores() {
    const { dictionary: t } = useLanguage();

    const BLOQUES = [
        {
            icon: Code2,
            title: t.forDevelopers.blocks.infrastructure.title,
            desc: t.forDevelopers.blocks.infrastructure.desc,
        },
        {
            icon: Megaphone,
            title: t.forDevelopers.blocks.community.title,
            desc: t.forDevelopers.blocks.community.desc,
        },
        {
            icon: Target,
            title: t.forDevelopers.blocks.crm.title,
            desc: t.forDevelopers.blocks.crm.desc,
        },
    ];

    return (
        <section id="desarrolladores" className="py-24 bg-background overflow-hidden relative border-b border-border/40">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-orange/5 to-transparent pointer-events-none" />
            <div className="absolute -left-[10%] top-[20%] w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 xl:px-12 relative z-10">
                <div className="text-center mb-16 md:mb-20">
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-sm mb-4 block">
                        {t.forDevelopers.badge}
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight max-w-4xl mx-auto">
                        {t.forDevelopers.title}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    {BLOQUES.map((bloque, idx) => (
                        <div
                            key={idx}
                            className="bg-card border border-border rounded-[2.5rem] p-10 
                                     hover:shadow-2xl hover:border-brand-orange/30 group transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Hover gradient effect inside card */}
                            <div className="absolute inset-0 bg-gradient-to-b from-brand-orange/0 to-brand-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-8 border border-brand-orange/20 relative z-10 group-hover:scale-110 transition-transform duration-500">
                                <bloque.icon className="w-8 h-8 text-brand-orange" />
                            </div>

                            <h3 className="text-2xl font-black text-foreground mb-4 relative z-10">
                                {bloque.title}
                            </h3>

                            <p className="text-lg text-muted-foreground font-medium leading-relaxed relative z-10">
                                {bloque.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Classic Infinite Logo Marquee */}
                <div className="mb-20">
                    <div className="text-center mb-10">
                        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-[0.3em]">
                            {t.forDevelopers.trustedBy}
                        </p>
                    </div>

                    <div className="relative group overflow-hidden">
                        {/* Foggy edges for smooth fade effect */}
                        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                        <div className="flex py-4">
                            {/* Primary marquee set */}
                            <div className="flex animate-marquee whitespace-nowrap items-center min-w-full shrink-0">
                                {[...PARTNERS, ...PARTNERS].map((partner, i) => (
                                    <div
                                        key={i}
                                        className="mx-12 lg:mx-20 flex items-center justify-center transition-all duration-500 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 cursor-default"
                                    >
                                        <span className={cn(
                                            "text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter",
                                            partner.color
                                        )}>
                                            {partner.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {/* Duplicated marquee set for seamless loop */}
                            <div className="flex animate-marquee whitespace-nowrap items-center min-w-full shrink-0" aria-hidden="true">
                                {[...PARTNERS, ...PARTNERS].map((partner, i) => (
                                    <div
                                        key={`dup-${i}`}
                                        className="mx-12 lg:mx-20 flex items-center justify-center transition-all duration-500 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 cursor-default"
                                    >
                                        <span className={cn(
                                            "text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter",
                                            partner.color
                                        )}>
                                            {partner.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Link
                        href="/contacto?asunto=publicar"
                        className="group flex items-center gap-3 px-10 py-5 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-full font-black text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                    >
                        <span>{t.forDevelopers.publishButton}</span>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    );
}
