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

const services = [
    {
        icon: Building2,
        title: "Publicación Profesional",
        description:
            "Tu desarrollo con ficha completa, galería, documentación y presencia en la plataforma desde el primer día.",
    },
    {
        icon: Monitor,
        title: "Espacio Publicitario Dinámico",
        description:
            "Banner premium debajo del navbar: imagen por 20s, video con audio por 30s, rotación automática. Tu proyecto frente a la comunidad en cada visita.",
    },
    {
        icon: Users,
        title: "Exposición ante Comunidad Activa",
        description:
            "Acceso directo a una audiencia segmentada e interesada en desarrollos inmobiliarios. Visibilidad real, no tráfico genérico.",
    },
    {
        icon: Crown,
        title: "Grupo VIP Segmentado",
        description:
            "Comunidad exclusiva de WhatsApp con acceso anticipado a lanzamientos. Tu desarrollo llega primero a quienes más importan.",
    },
    {
        icon: Map,
        title: "Masterplan Interactivo",
        description:
            "Tu loteo sobre el mapa real con estado de cada unidad en vivo. El cliente selecciona, consulta y avanza sin fricciones.",
    },
    {
        icon: Eye,
        title: "Tours 360° Inmersivos",
        description:
            "Recorridos virtuales del desarrollo desde cualquier dispositivo. Hotspots con contenido, navegación libre y experiencia premium.",
    },
    {
        icon: BarChart3,
        title: "CRM Comercial Completo",
        description:
            "Gestión de leads, tablero Kanban, seguimiento de oportunidades, historial de contacto y asistente inteligente integrado.",
    },
    {
        icon: CalendarCheck,
        title: "Gestión de Reservas",
        description:
            "Flujo estructurado con countdown, generación de documentos, seguimiento de seña y trazabilidad de cada operación.",
    },
    {
        icon: Handshake,
        title: "Acompañamiento Estratégico",
        description:
            "Soporte en la planificación y ejecución del lanzamiento. Estrategia comercial, timing y coordinación para maximizar resultados.",
    },
];

const highlights = [
    "Visibilidad premium incluida en el paquete",
    "Suscripción mensual · Sin intermediación en compraventa",
    "Control total del proceso comercial",
    "Soporte estratégico personalizado",
];

export default function DeveloperInfrastructure() {
    return (
        <section className="py-20 relative overflow-hidden bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/5">
            {/* Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-orange/5 rounded-full blur-[200px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
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
                            Para Desarrolladores
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                        Infraestructura Comercial{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            para Desarrolladores
                        </span>
                    </h2>
                    <p className="text-lg text-foreground/70 leading-relaxed">
                        No vendemos por vos. Te damos la estructura, la tecnología y la visibilidad
                        para que tu lanzamiento funcione desde el primer día. Todo integrado. Todo profesional.
                    </p>
                </motion.div>

                {/* Services Grid — 3x3 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {services.map((service, idx) => (
                        <motion.div
                            key={service.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.06 }}
                            className="p-6 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-white/5 hover:border-brand-500/40 dark:hover:border-brand-500/30 transition-all group hover:shadow-xl hover:shadow-brand-500/10"
                        >
                            <div className="w-11 h-11 rounded-lg bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:bg-brand-orange group-hover:shadow-lg group-hover:shadow-brand-orange/20 transition-all">
                                <service.icon className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-base font-bold text-foreground mb-2">
                                {service.title}
                            </h3>
                            <p className="text-sm text-foreground/60 leading-relaxed">
                                {service.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Highlights + CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-brand-orange/10 via-brand-orange/5 to-transparent border border-brand-orange/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
                >
                    <div className="flex-1 space-y-4">
                        <h3 className="text-2xl md:text-3xl font-black text-foreground">
                            Todo lo que necesitás,{" "}
                            <span className="text-brand-orange">en un solo lugar</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {highlights.map((item) => (
                                <div key={item} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-brand-orange flex-shrink-0" />
                                    <span className="text-sm font-semibold text-foreground/70">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Link
                        href="/register?role=DESARROLLADOR"
                        className="group flex-shrink-0 px-10 py-5 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl font-black shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 relative overflow-hidden"
                    >
                        <span className="relative z-10">Quiero publicar mi desarrollo</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
