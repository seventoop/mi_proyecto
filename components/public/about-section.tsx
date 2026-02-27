import { Map, Eye, Users, CalendarCheck, ShieldCheck, Rocket, Monitor, Zap, TrendingUp, Lock, BarChart3 } from "lucide-react";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";

const features = [
    {
        icon: Map,
        title: "Masterplan Interactivo",
        description: "Tu desarrollo sobre el mapa real. Cada lote con estado, precio y detalle al instante. El cliente ve, entiende y elige sin intermediarios.",
    },
    {
        icon: Eye,
        title: "Tours 360° Inmersivos",
        description: "Recorridos virtuales que permiten caminar el desarrollo desde cualquier dispositivo. Escenas con hotspots, navegación libre y experiencia inmersiva.",
    },
    {
        icon: Users,
        title: "CRM Comercial Inteligente",
        description: "Gestión de leads con tablero Kanban, asignación automática, historial de contacto, seguimiento de oportunidades y chat integrado.",
    },
    {
        icon: CalendarCheck,
        title: "Reservas Estructuradas",
        description: "Flujo completo de reserva con countdown de vencimiento, generación de documentos, seguimiento de seña y trazabilidad total del proceso.",
    },
    {
        icon: ShieldCheck,
        title: "Verificación Documental",
        description: "Validación de identidad (KYC) y documentación técnica del desarrollo. Solo operan desarrolladores verificados en la plataforma.",
    },
    {
        icon: Rocket,
        title: "Sistema de Lanzamientos",
        description: "Estructura completa para lanzar un desarrollo: desde la carga del proyecto hasta la apertura comercial con comunidad de acceso anticipado.",
    },
    {
        icon: Monitor,
        title: "Espacio Publicitario Premium",
        description: "Visibilidad directa en la landing frente a una comunidad segmentada. Imagen por 20s, video con audio por 30s, rotación automática cada 30 segundos.",
    },
];

export default function AboutSection() {
    return (
        <section id="quienes-somos" className="py-24 relative overflow-hidden bg-white dark:bg-black">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-yellow/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <ScrollAnimationWrapper className="text-center max-w-3xl mx-auto mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Zap className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            Diferencial Tecnológico
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                        Todo lo que un lanzamiento{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            necesita para funcionar
                        </span>
                    </h2>
                    <p className="text-lg text-foreground/70 leading-relaxed">
                        SevenToop no es una inmobiliaria ni un portal. Es la infraestructura tecnológica y comercial
                        para que desarrolladores lancen sus proyectos con mayor exposición, conversión y control de todo el proceso.
                    </p>
                </ScrollAnimationWrapper>

                {/* Features Grid — 7 items, responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {features.map((feature, idx) => (
                        <ScrollAnimationWrapper
                            key={feature.title}
                            delay={idx * 0.05}
                            className={`p-6 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-white/5 hover:border-brand-500/50 dark:hover:border-brand-500/30 transition-all group hover:shadow-xl hover:shadow-brand-500/10 ${idx === 6 ? "sm:col-span-2 lg:col-span-1" : ""
                                }`}
                        >
                            <div
                                className="w-12 h-12 rounded-xl bg-brand-orange flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-brand-orange/20"
                            >
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                            <p className="text-sm text-foreground/60 leading-relaxed">
                                {feature.description}
                            </p>
                        </ScrollAnimationWrapper>
                    ))}
                </div>

                {/* Bottom Stats */}
                <ScrollAnimationWrapper className="flex flex-wrap items-center justify-center gap-12 md:gap-20">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-brand-orange/10">
                            <TrendingUp className="w-6 h-6 text-brand-orange" />
                        </div>
                        <div>
                            <span className="block text-2xl font-black text-foreground">Mayor Exposición</span>
                            <span className="text-sm text-foreground/50">Canal propio de visibilidad</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-brand-orange/10">
                            <Lock className="w-6 h-6 text-brand-orange" />
                        </div>
                        <div>
                            <span className="block text-2xl font-black text-foreground">Control Total</span>
                            <span className="text-sm text-foreground/50">Del lanzamiento al cierre</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-brand-orange/10">
                            <BarChart3 className="w-6 h-6 text-brand-orange" />
                        </div>
                        <div>
                            <span className="block text-2xl font-black text-foreground">Profesionalización</span>
                            <span className="text-sm text-foreground/50">Procesos estructurados</span>
                        </div>
                    </div>
                </ScrollAnimationWrapper>
            </div>
        </section>
    );
}
