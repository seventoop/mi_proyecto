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
import Noticias from "@/components/public/noticias";
import SectionArrows from "@/components/public/section-arrows";
import ScrollToTop from "@/components/public/scroll-to-top";

import { getBannersLanding } from "@/lib/actions/banners";
import { getProyectosDestacados } from "@/lib/actions/proyectos";
import { getSystemConfig } from "@/lib/actions/configuration";

export const metadata: Metadata = {
    title: "SevenToop — Infraestructura para Comercialización Inmobiliaria",
    description: "Plataforma integral de gestión inmobiliaria para desarrollos, urbanizaciones y proyectos premium. Invertí con seguridad y tecnología.",
};

export default async function HomePage() {
    const [bannersRes, proyectos] = await Promise.all([
        getBannersLanding(),
        getProyectosDestacados(),
    ]);

    const [heroTitle, heroSubtitle, ctaText] = await Promise.all([
        getSystemConfig("HERO_TITLE"),
        getSystemConfig("HERO_SUBTITLE"),
        getSystemConfig("CTA_TEXT"),
    ]);

    const banners = bannersRes.success && bannersRes.data ? bannersRes.data : [];

    return (
        <main className="min-h-screen bg-background text-foreground">
            <section id="inicio" className="relative pt-[72px] sm:pt-[80px]">
                <div className="bg-black">
                    <MediaBanner banners={banners} />
                </div>
                <div className="relative -mt-4 z-20">
                    <Hero
                        title={heroTitle?.value || undefined}
                        subtitle={heroSubtitle?.value || undefined}
                        ctaText={ctaText?.value || undefined}
                    />
                </div>
                <SectionArrows next="proyectos" />
            </section>

            <section id="proyectos">
                <Exploracion />
                <ProyectosDestacados proyectos={proyectos} />
                <SectionArrows prev="inicio" next="desarrolladores" />
            </section>

            <section id="desarrolladores">
                <ParaDesarrolladores />
                <SectionArrows prev="proyectos" next="como-funciona" />
            </section>

            <section id="como-funciona">
                <ComoFunciona />
                <div id="oportunidades">
                    <FormularioCaptura />
                </div>
                <SectionArrows prev="desarrolladores" next="noticias" />
            </section>

            <section id="noticias">
                <Noticias />
                <SectionArrows prev="como-funciona" next="testimonios" />
            </section>

            <section id="testimonios">
                <Comunidad />
                <TestimonialsSection />
                <SectionArrows prev="noticias" next="contacto" />
            </section>

            <ScrollToTop />
        </main>
    );
}
