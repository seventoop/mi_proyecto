"use client";

import { Check, Star, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

export default function Comunidad() {
    const { dictionary: t } = useLanguage();

    const TIERS = [
        {
            name: t.community.tiers.open.name,
            price: t.community.tiers.open.price,
            desc: t.community.tiers.open.desc,
            icon: Users,
            features: t.community.tiers.open.features,
            ctaText: t.community.tiers.open.ctaText,
            ctaHref: "/#oportunidades",
            highlight: false,
        },
        {
            name: t.community.tiers.vip.name,
            price: t.community.tiers.vip.price,
            desc: t.community.tiers.vip.desc,
            icon: Star,
            features: t.community.tiers.vip.features,
            ctaText: t.community.tiers.vip.ctaText,
            ctaHref: "/contacto?asunto=membresia_vip",
            highlight: true,
        }
    ];

    return (
        <section id="comunidad" className="py-24 bg-background overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-orange/5 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 md:mb-20">
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-sm mb-4 block">
                        {t.community.badge}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight max-w-2xl mx-auto">
                        {t.community.title}
                    </h2>
                    <p className="text-xl text-muted-foreground mt-6 max-w-3xl mx-auto">
                        {t.community.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.name}
                            className={cn(
                                "rounded-[2.5rem] border p-10 flex flex-col transition-all duration-300 relative overflow-hidden h-full",
                                tier.highlight
                                    ? "bg-card border-brand-orange/40 shadow-2xl shadow-brand-orange/10"
                                    : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-blue-400/50 shadow-xl shadow-slate-200/50 dark:shadow-none"
                            )}
                        >
                            {tier.highlight ? (
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-orange to-transparent" />
                            ) : (
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                            )}

                            <div className="flex items-center gap-4 mb-6">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                    tier.highlight
                                        ? "bg-brand-orange/20 text-brand-orange"
                                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                )}>
                                    <tier.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-foreground">{tier.name}</h3>
                                    <p className={cn(
                                        "text-sm font-bold uppercase tracking-widest",
                                        tier.highlight ? "text-brand-orange" : "text-blue-600 dark:text-blue-400"
                                    )}>
                                        {tier.price}
                                    </p>
                                </div>
                            </div>

                            <p className="text-muted-foreground mb-8 min-h-[60px] text-sm md:text-base">
                                {tier.desc}
                            </p>

                            <ul className="space-y-4 mb-10 flex-1">
                                {tier.features.map((feat, idx) => (
                                    <li key={idx} className="flex gap-3">
                                        <Check className={cn(
                                            "w-5 h-5 shrink-0",
                                            tier.highlight ? "text-brand-orange" : "text-blue-500/60"
                                        )} />
                                        <span className="text-foreground/80 font-medium text-sm md:text-base">
                                            {feat}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={tier.ctaHref}
                                className={cn(
                                    "w-full py-4 rounded-xl font-black text-center transition-all px-6",
                                    tier.highlight
                                        ? "bg-brand-orange hover:bg-brand-orangeDark text-white shadow-xl hover:shadow-brand-orange/30 hover:scale-[1.02]"
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
                                )}
                            >
                                {tier.ctaText}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
