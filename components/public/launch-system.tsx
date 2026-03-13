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

const steps = [
    {
        number: "01",
        icon: ClipboardCheck,
        title: "Validación y Estructuración",
        description:
            "Revisión del proyecto, verificación documental y armado de la ficha técnica completa dentro de la plataforma. Solo ingresan desarrollos verificados.",
    },
    {
        number: "02",
        icon: Camera,
        title: "Producción Visual Premium",
        description:
            "Masterplan interactivo sobre mapa real, tours 360° inmersivos y banner dinámico de alta visibilidad: imagen 20s, video con audio 30s, rotación automática.",
    },
    {
        number: "03",
        icon: Users,
        title: "Activación en Comunidad Abierta",
        description:
            "Publicación coordinada en la comunidad de WhatsApp. El desarrollo se presenta ante una audiencia segmentada e interesada desde el primer momento.",
    },
    {
        number: "04",
        icon: Crown,
        title: "Acceso Anticipado — Grupo VIP",
        description:
            "Los miembros VIP reciben la información antes que la comunidad abierta: planos, condiciones, disponibilidad y canal directo con el desarrollador.",
    },
    {
        number: "05",
        icon: Globe,
        title: "Apertura Comercial Pública",
        description:
            "El proyecto queda disponible en la plataforma con masterplan activo, tours navegables, ficha completa y banner en rotación frente a cada visitante.",
    },
    {
        number: "06",
        icon: CalendarCheck,
        title: "Reservas y Seguimiento Comercial",
        description:
            "Gestión estructurada de reservas con countdown, documentación automática, seguimiento de leads por CRM y trazabilidad completa de cada operación.",
    },
];

export default function LaunchSystem() {
    return (
        <section className="py-20 px-6 bg-background relative overflow-hidden border-t border-slate-200/60 dark:border-white/5 dark:border-t-0">
            {/* Background */}
            <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-brand-orange/5 rounded-full blur-[200px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-yellow/5 rounded-full blur-[150px] pointer-events-none" />

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
                            Método
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                        El Sistema de Lanzamiento{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            SevenToop
                        </span>
                    </h2>
                    <p className="text-lg text-foreground/60 leading-relaxed">
                        Un método estructurado que coordina tecnología, visibilidad y comunidad
                        para que cada lanzamiento tenga orden, alcance y resultados medibles.
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand-orange/30 via-brand-orange/10 to-transparent hidden sm:block" />

                    <div className="space-y-8">
                        {steps.map((step, idx) => (
                            <motion.div
                                key={step.number}
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
                                                <step.icon className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
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
                                            {step.number}
                                        </span>
                                    </div>
                                </div>

                                {/* Spacer for alternating layout */}
                                <div className="flex-1 hidden sm:block" />
                            </motion.div>
                        ))}
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
                        Cada paso está diseñado para maximizar la exposición y profesionalizar el proceso comercial.
                    </p>
                    <Link
                        href="/contacto"
                        className="group inline-flex items-center gap-2 px-10 py-5 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl font-black shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
                    >
                        <span className="relative z-10">Quiero lanzar mi desarrollo</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
