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

const plans = [
    {
        name: "Infraestructura",
        icon: Building2,
        tagline: "La base operativa para gestionar tu desarrollo de forma profesional.",
        featured: false,
        features: [
            "Publicación profesional del desarrollo",
            "Dashboard desarrollador completo",
            "CRM comercial con gestión de leads",
            "Gestión de reservas estructurada",
            "Verificación documental (KYC)",
            "Soporte técnico",
        ],
        cta: "Solicitar Información",
    },
    {
        name: "Visibilidad Premium",
        icon: BarChart3,
        tagline: "Infraestructura + exposición directa frente a una audiencia segmentada.",
        featured: false,
        includes: "Todo lo de Infraestructura más:",
        features: [
            "Espacio publicitario dinámico en landing (20s imagen / 30s video con audio)",
            "Rotación automática cada 30 segundos",
            "Masterplan interactivo sobre mapa real",
            "Tours 360° inmersivos",
            "Exposición ante comunidad abierta",
        ],
        cta: "Solicitar Información",
    },
    {
        name: "Lanzamiento Estratégico",
        icon: Rocket,
        tagline: "El servicio completo: tecnología, visibilidad y acompañamiento comercial coordinado.",
        featured: true,
        includes: "Todo lo de Visibilidad Premium más:",
        features: [
            "Activación coordinada en comunidad",
            "Acceso anticipado al Grupo VIP",
            "Estrategia estructurada de lanzamiento",
            "Acompañamiento comercial estratégico",
            "Honorarios variables opcionales bajo acuerdo",
        ],
        cta: "Hablar con el Equipo",
    },
];

export default function ServicePlans() {
    return (
        <section className="py-20 px-6 bg-slate-50/80 dark:bg-white/[0.02] relative overflow-hidden border-t border-slate-200/60 dark:border-white/5">
            {/* Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-brand-orange/5 rounded-full blur-[200px] pointer-events-none" />

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
                            Servicios
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                        Modelos de{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            Servicio
                        </span>
                    </h2>
                    <p className="text-lg text-foreground/60 leading-relaxed">
                        Tres niveles diseñados para acompañar a cada desarrollador según la etapa y el alcance de su proyecto.
                    </p>
                </motion.div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan, idx) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className={`relative rounded-3xl p-8 flex flex-col transition-all ${plan.featured
                                ? "bg-gradient-to-b from-brand-orange/10 via-brand-orange/5 to-transparent border-2 border-brand-orange/30 shadow-2xl shadow-brand-orange/10 scale-[1.02]"
                                : "glass-card"
                                }`}
                        >
                            {plan.featured && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-orange text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                                    Más completo
                                </div>
                            )}

                            {/* Plan header */}
                            <div className="mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.featured
                                    ? "bg-brand-orange shadow-lg shadow-brand-orange/20"
                                    : "bg-brand-orange/10"
                                    }`}>
                                    <plan.icon className={`w-6 h-6 ${plan.featured ? "text-white" : "text-brand-orange"}`} />
                                </div>
                                <h3 className="text-xl font-black text-foreground mb-2">{plan.name}</h3>
                                <p className="text-sm text-foreground/60 leading-relaxed">{plan.tagline}</p>
                            </div>

                            {/* Includes note */}
                            {plan.includes && (
                                <p className="text-xs font-bold text-brand-orange uppercase tracking-wide mb-4">
                                    {plan.includes}
                                </p>
                            )}

                            {/* Features */}
                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5">
                                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.featured ? "text-brand-orange" : "text-emerald-500"
                                            }`} />
                                        <span className="text-sm text-foreground/70 leading-relaxed">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Link
                                href="/contacto"
                                className={`w-full py-4 rounded-2xl font-black text-center transition-all flex items-center justify-center gap-2 group ${plan.featured
                                    ? "bg-brand-orange hover:bg-brand-orangeDark text-white shadow-xl shadow-brand-orange/20 hover:scale-[1.02] active:scale-95"
                                    : "border-2 border-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white"
                                    }`}
                            >
                                {plan.cta}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Disclaimer */}
                <p className="text-center text-xs text-foreground/40 mt-10 max-w-2xl mx-auto leading-relaxed">
                    Los modelos de servicio son orientativos. Las condiciones finales se acuerdan directamente con
                    cada desarrollador según el alcance del proyecto. SevenToop no intermedia operaciones de compraventa.
                </p>
            </div>
        </section>
    );
}
