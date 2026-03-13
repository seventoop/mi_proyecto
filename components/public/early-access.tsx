import { Clock, Map, Eye, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";

const benefits = [
    {
        icon: Clock,
        title: "Acceso Temprano a Preventa",
        description:
            "Conocé los desarrollos antes que el público general. Información prioritaria para tomar decisiones con ventaja.",
    },
    {
        icon: Map,
        title: "Masterplan Interactivo",
        description:
            "Explorá cada lote y unidad sobre el mapa real, con disponibilidad actualizada en tiempo real.",
    },
    {
        icon: Eye,
        title: "Tours 360° Inmersivos",
        description:
            "Recorré el desarrollo desde cualquier dispositivo antes de visitarlo. Navegación libre con contenido integrado.",
    },
    {
        icon: Users,
        title: "Comunidad Estratégica",
        description:
            "Formá parte de una audiencia activa con acceso anticipado, publicaciones coordinadas y canal directo con desarrolladores.",
    },
];

export default function EarlyAccess() {
    return (
        <section className="py-20 px-6 relative overflow-hidden bg-background border-t border-slate-200/60 dark:border-white/5">
            {/* Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-orange/5 rounded-full blur-[200px] pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <ScrollAnimationWrapper className="text-center max-w-3xl mx-auto mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Clock className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            Acceso Anticipado
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                        Llegá primero a los{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            lanzamientos inmobiliarios
                        </span>
                    </h2>
                    <p className="text-lg text-foreground/60 leading-relaxed">
                        Información prioritaria, herramientas interactivas y una comunidad activa
                        para explorar desarrollos en preventa con ventaja real.
                    </p>
                </ScrollAnimationWrapper>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
                    {benefits.map((benefit, idx) => (
                        <ScrollAnimationWrapper
                            key={benefit.title}
                            delay={idx * 0.05}
                            className="p-6 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-white/5 hover:border-brand-orange/30 transition-all group hover:shadow-xl hover:shadow-brand-orange/5"
                        >
                            <div className="w-11 h-11 rounded-lg bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:bg-brand-orange group-hover:shadow-lg group-hover:shadow-brand-orange/20 transition-all">
                                <benefit.icon className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-base font-bold text-foreground mb-2">
                                {benefit.title}
                            </h3>
                            <p className="text-sm text-foreground/60 leading-relaxed">
                                {benefit.description}
                            </p>
                        </ScrollAnimationWrapper>
                    ))}
                </div>

                {/* CTA */}
                <ScrollAnimationWrapper className="text-center space-y-4">
                    <Link
                        href="#comunidad"
                        className="group inline-flex items-center gap-2 px-10 py-5 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl font-black shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
                    >
                        <span className="relative z-10">Unirme a la Comunidad</span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </Link>
                    <p className="text-foreground/40 text-xs font-medium">
                        Sin compromiso · Acceso gratuito · Comunidad verificada
                    </p>
                </ScrollAnimationWrapper>
            </div>
        </section>
    );
}
