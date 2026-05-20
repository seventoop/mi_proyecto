"use client";

import { motion } from "framer-motion";
import {
    ClipboardCheck,
    Camera,
    Users,
    Crown,
    Globe,
    CalendarCheck,
    ArrowRight,
    Rocket,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

const stepIcons = [ClipboardCheck, Camera, Users, Crown, Globe, CalendarCheck] as const;

export default function LaunchSystem() {
    const { dictionary: t } = useLanguage();
    const copy = t.launchSystem;

    return (
        <section className="relative overflow-hidden border-t border-slate-200/60 bg-background px-4 py-14 dark:border-t-0 dark:border-white/5 sm:px-6 sm:py-20">
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-16 space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Rocket className="w-4 h-4 text-brand-orange" />
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

                {/* Steps */}
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand-orange/30 via-brand-orange/10 to-transparent hidden sm:block" />

                    <div className="space-y-8">
                        {copy.steps.map((step, idx) => {
                            const Icon = stepIcons[idx] ?? ClipboardCheck;
                            const stepNumber = String(idx + 1).padStart(2, "0");
                            return (
                            <motion.div
                                key={stepNumber}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.08 }}
                                className={`flex flex-col sm:flex-row items-start gap-6 ${idx % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                                    }`}
                            >
                                {/* Content card */}
                                <div className={`flex-1 ${idx % 2 === 0 ? "sm:text-right" : "sm:text-left"}`}>
                                    <div className="glass-card p-6 inline-block text-left hover:shadow-xl hover:shadow-brand-500/10 transition-all group">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center group-hover:bg-brand-orange group-hover:shadow-lg group-hover:shadow-brand-orange/20 transition-all">
                                                <Icon className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
                                            </div>
                                            <h3 className="text-base font-black text-foreground">{step.title}</h3>
                                        </div>
                                        <p className="text-sm text-foreground/60 leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Number circle */}
                                <div className="hidden sm:flex items-center justify-center flex-shrink-0 order-first sm:order-none">
                                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-black border-2 border-brand-orange/20 flex items-center justify-center shadow-lg">
                                        <span className="text-lg font-black bg-gradient-to-br from-brand-orange to-brand-orangeDark bg-clip-text text-transparent">
                                            {stepNumber}
                                        </span>
                                    </div>
                                </div>

                                {/* Spacer for alternating layout */}
                                <div className="flex-1 hidden sm:block" />
                            </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mt-16 space-y-4"
                >
                    <p className="text-foreground/50 text-sm font-medium">
                        {copy.note}
                    </p>
                    <Link
                        href="/contacto"
                        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-brand-orange px-8 py-4 font-black text-white shadow-2xl shadow-brand-orange/20 transition-all hover:scale-[1.02] hover:bg-brand-orangeDark active:scale-95 sm:px-10 sm:py-5"
                    >
                        <span className="relative z-10">{copy.cta}</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
