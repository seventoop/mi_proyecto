import type { Metadata } from "next";
import Hero from "@/components/public/hero";
import MediaBanner from "@/components/public/media-banner";
import Exploracion from "@/components/public/exploracion";
import FormularioCaptura from "@/components/public/formulario-captura";
import ProyectosDestacados from "@/components/public/proyectos-destacados";
import ComoFunciona from "@/components/public/como-funciona";
import ParaDesarrolladores from "@/components/public/para-desarrolladores";
import Comunidad from "@/components/public/comunidad";
import TestimonialsSection from "@/components/public/testimonials-section";

import { getBannersLanding } from "@/lib/actions/banners";
import { getProyectosDestacados } from "@/lib/actions/proyectos";
import { getSystemConfig } from "@/lib/actions/configuration";

export const metadata: Metadata = {
    title: "SevenToop — Infraestructura para Comercialización Inmobiliaria",
    description: "Plataforma integral de gestión inmobiliaria para desarrollos, urbanizaciones y proyectos premium. Invierte con seguridad y tecnología.",
};

export default async function HomePage() {
    // 1. Fetch data
    const [bannersRes, proyectos] = await Promise.all([
        getBannersLanding(),
        getProyectosDestacados()
    ]);

    // Fetch Hero Config
    const [heroTitle, heroSubtitle, ctaText] = await Promise.all([
        getSystemConfig("HERO_TITLE"),
        getSystemConfig("HERO_SUBTITLE"),
        getSystemConfig("CTA_TEXT")
    ]);

    // Banners: incliye SEVENTOOP_GLOBAL + ORG_LANDING, hasta 3, por prioridad y fecha
    const banners = bannersRes.success && bannersRes.data ? bannersRes.data : [];

    return (
        <main className="min-h-screen bg-background text-foreground">
            {/* 1. Banner Dinámico (Limpio) */}
            <section id="banner" className="relative pt-14 sm:pt-16 bg-black min-h-[40vh] sm:min-h-[50vh]">
                <MediaBanner banners={banners} />
            </section>

            {/* 2. Hero (Texto y Acciones) */}
            <section id="inicio" className="relative -mt-4 z-20">
                <Hero
                    title={heroTitle?.value || undefined}
                    subtitle={heroSubtitle?.value || undefined}
                    ctaText={ctaText?.value || undefined}
                />
            </section>

            {/* 3. Exploración / Búsqueda Visual */}
            <section id="exploracion">
                <Exploracion />
            </section>

            {/* 4. Captura de Demanda (Lead Gen) */}
            <section id="oportunidades">
                <FormularioCaptura />
            </section>

            {/* 5. Proyectos Destacados */}
            <section id="proyectos">
                <ProyectosDestacados proyectos={proyectos} />
            </section>

            {/* 6. Metodología / Cómo Funciona */}
            <section id="como-funciona">
                <ComoFunciona />
            </section>

            {/* 7. Oferta para Desarrolladores */}
            <section id="desarrolladores">
                <ParaDesarrolladores />
            </section>

            {/* 8. Comunidad */}
            <section id="comunidad">
                <Comunidad />
            </section>

            {/* 9. Testimonios */}
            <TestimonialsSection />
        </main>
    );
}
