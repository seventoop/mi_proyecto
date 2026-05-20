"use client";

import { motion } from "framer-motion";
import {
    Building2,
    Monitor,
    Users,
    Crown,
    Map,
    Eye,
    BarChart3,
    CalendarCheck,
    Handshake,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

const serviceIcons = [Building2, Monitor, Users, Crown, Map, Eye, BarChart3, CalendarCheck, Handshake] as const;

export default function DeveloperInfrastructure() {
    const { dictionary: t } = useLanguage();
    const copy = t.developerInfrastructure;

    return (
        <section className="relative overflow-hidden border-t border-slate-200/60 bg-background py-14 dark:border-white/5 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-16 space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Building2 className="w-4 h-4 text-brand-orange" />
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
                    <p className="text-lg text-foreground/70 leading-relaxed">
                        {copy.description}
                    </p>
                </motion.div>

                {/* Services Grid — 3x3 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {copy.services.map((service, idx) => {
                        const Icon = serviceIcons[idx] ?? Building2;
                        return (
                        <motion.div
                            key={service.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.06 }}
                            className="p-6 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-white/5 hover:border-brand-500/40 dark:hover:border-brand-500/30 transition-all group hover:shadow-xl hover:shadow-brand-500/10"
                        >
                            <div className="w-11 h-11 rounded-lg bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:bg-brand-orange group-hover:shadow-lg group-hover:shadow-brand-orange/20 transition-all">
                                <Icon className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-base font-bold text-foreground mb-2">
                                {service.title}
                            </h3>
                            <p className="text-sm text-foreground/60 leading-relaxed">
                                {service.description}
                            </p>
                        </motion.div>
                        );
                    })}
                </div>

                {/* Highlights + CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-stretch gap-8 rounded-3xl border border-brand-orange/20 bg-gradient-to-br from-brand-orange/10 via-brand-orange/5 to-transparent p-6 sm:p-8 md:flex-row md:items-center md:p-12"
                >
                    <div className="flex-1 space-y-4">
                        <h3 className="text-2xl md:text-3xl font-black text-foreground">
                            {copy.highlightsTitle}{" "}
                            <span className="text-brand-orange">{copy.highlightsTitleHighlight}</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {copy.highlights.map((item) => (
                                <div key={item} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-brand-orange flex-shrink-0" />
                                    <span className="text-sm font-semibold text-foreground/70">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Link
                        href="/register?role=DESARROLLADOR"
                        className="group relative flex flex-shrink-0 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-orange px-8 py-4 font-black text-white shadow-2xl shadow-brand-orange/20 transition-all hover:scale-[1.02] hover:bg-brand-orangeDark active:scale-95 sm:px-10 sm:py-5"
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
