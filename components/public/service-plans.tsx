"use client";

import { motion } from "framer-motion";
import {
    Building2,
    BarChart3,
    Rocket,
    Check,
    ArrowRight,
    Layers,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

const planIcons = [Building2, BarChart3, Rocket] as const;

export default function ServicePlans() {
    const { dictionary: t } = useLanguage();
    const copy = t.servicePlans;

    return (
        <section className="relative overflow-hidden border-t border-slate-200/60 bg-slate-50/80 px-4 py-14 dark:border-white/5 dark:bg-white/[0.02] sm:px-6 sm:py-20">
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-16 space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Layers className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            {copy.badge}
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                        {copy.title}{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            {copy.titleHighlight}
                        </span>
                    </h2>
                    <p className="text-lg text-foreground/60 leading-relaxed">
                        {copy.description}
                    </p>
                </motion.div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {copy.plans.map((plan, idx) => {
                        const Icon = planIcons[idx] ?? Building2;
                        const featured = idx === 2;
                        const includes = "includes" in plan ? plan.includes : undefined;
                        return (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col transition-all ${featured
                                ? "bg-gradient-to-b from-brand-orange/10 via-brand-orange/5 to-transparent border-2 border-brand-orange/30 shadow-2xl shadow-brand-orange/10 scale-[1.02]"
                                : "glass-card"
                                }`}
                        >
                            {featured && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-orange text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                                    {copy.featuredLabel}
                                </div>
                            )}

                            {/* Plan header */}
                            <div className="mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${featured
                                    ? "bg-brand-orange shadow-lg shadow-brand-orange/20"
                                    : "bg-brand-orange/10"
                                    }`}>
                                    <Icon className={`w-6 h-6 ${featured ? "text-white" : "text-brand-orange"}`} />
                                </div>
                                <h3 className="text-xl font-black text-foreground mb-2">{plan.name}</h3>
                                <p className="text-sm text-foreground/60 leading-relaxed">{plan.tagline}</p>
                            </div>

                            {/* Includes note */}
                            {includes && (
                                <p className="text-xs font-bold text-brand-orange uppercase tracking-wide mb-4">
                                    {includes}
                                </p>
                            )}

                            {/* Features */}
                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5">
                                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${featured ? "text-brand-orange" : "text-emerald-500"
                                            }`} />
                                        <span className="text-sm text-foreground/70 leading-relaxed">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Link
                                href="/contacto"
                                className={`w-full py-4 rounded-2xl font-black text-center transition-all flex items-center justify-center gap-2 group ${featured
                                    ? "bg-brand-orange hover:bg-brand-orangeDark text-white shadow-xl shadow-brand-orange/20 hover:scale-[1.02] active:scale-95"
                                    : "border-2 border-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white"
                                    }`}
                            >
                                {plan.cta}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                        );
                    })}
                </div>

                {/* Disclaimer */}
                <p className="text-center text-xs text-foreground/40 mt-10 max-w-2xl mx-auto leading-relaxed">
                    {copy.disclaimer}
                </p>
            </div>
        </section>
    );
}
