import { Metadata } from "next";
import DeveloperInfrastructure from "@/components/public/developer-infrastructure";
import LaunchSystem from "@/components/public/launch-system";
import ServicePlans from "@/components/public/service-plans";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Para Desarrolladores | SevenToop — Infraestructura para Lanzamientos Inmobiliarios",
    description:
        "Publicá tu desarrollo con infraestructura profesional, visibilidad estratégica y comunidad activa. Masterplan, tours 360°, CRM, reservas y acompañamiento comercial.",
};

export default function DevelopersPage() {
    return (
        <main className="min-h-screen pt-24 bg-white dark:bg-black">
            {/* Hero para Desarrolladores */}
            <section className="py-20 px-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-orange/5 rounded-full blur-[200px] pointer-events-none" />

                <div className="w-full text-center relative z-10 space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Building2 className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            Para Desarrolladores
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
                        La infraestructura que tu{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            lanzamiento necesita
                        </span>
                    </h1>
                    <p className="text-foreground/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        Publicación profesional, visibilidad ante una comunidad activa, herramientas
                        interactivas y acompañamiento comercial. Todo en una sola plataforma.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link
                            href="/register?role=DESARROLLADOR"
                            className="group inline-flex items-center justify-center gap-2 px-10 py-5 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl font-black text-lg shadow-2xl shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Publicar mi Desarrollo
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="#planes"
                            className="inline-flex items-center justify-center gap-2 px-10 py-5 border-2 border-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white rounded-2xl font-black text-lg transition-all active:scale-95"
                        >
                            Ver Planes
                        </Link>
                    </div>
                </div>
            </section>

            {/* Infraestructura — bg: gray alt */}
            <DeveloperInfrastructure />

            {/* Sistema de Lanzamiento — bg: white/black */}
            <LaunchSystem />

            {/* Modelos de Servicio — bg: gray alt */}
            <div id="planes">
                <ServicePlans />
            </div>

            {/* CTA Final Desarrolladores */}
            <section className="py-20 px-6 relative overflow-hidden bg-white dark:bg-black border-t border-slate-200/60 dark:border-white/5">
                <div className="w-full rounded-[3rem] bg-gradient-to-br from-brand-orange via-brand-orangeDark to-brand-orange/80 p-14 md:p-20 text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-[120px]" />

                    <div className="relative z-10 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
                            Publicá tu desarrollo con infraestructura profesional
                        </h2>
                        <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
                            Masterplan interactivo, tours 360°, CRM, reservas y comunidad activa desde el primer día.
                        </p>
                        <Link
                            href="/register?role=DESARROLLADOR"
                            className="group inline-flex items-center gap-2 px-12 py-5 bg-white text-brand-900 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-2xl active:scale-95"
                        >
                            Quiero publicar mi desarrollo
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <p className="text-white/40 text-xs font-medium max-w-lg mx-auto leading-relaxed">
                            Sin intermediación en compraventa · Suscripción mensual · Control total del proceso comercial.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
