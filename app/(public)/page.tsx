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
import FloatingNav from "@/components/public/floating-nav";

import { getBannersLanding } from "@/lib/actions/banners";
import { getSystemConfig } from "@/lib/actions/configuration";
import prisma from "@/lib/db";
import { buildPublicProjectWhere } from "@/lib/public-projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "SevenToop — Infraestructura para Comercialización Inmobiliaria",
    description: "Plataforma integral de gestión inmobiliaria para desarrollos, urbanizaciones y proyectos premium. Invertí con seguridad y tecnología.",
};

async function getProyectosDestacados() {
    try {
        const proyectos = await prisma.proyecto.findMany({
            where: buildPublicProjectWhere(),
            select: {
                id: true,
                nombre: true,
                slug: true,
                estado: true,
                tipo: true,
                imagenPortada: true,
                ubicacion: true,
                precioM2Mercado: true,
            },
            orderBy: { createdAt: "desc" },
            take: 6,
        });

        return proyectos.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            slug: p.slug,
            estado: p.estado,
            tipo: p.tipo,
            imagenPortada: p.imagenPortada,
            ubicacion: p.ubicacion,
            precioDesde: p.precioM2Mercado ? Number(p.precioM2Mercado) : null,
        }));
    } catch (error) {
        console.error("[public-home] project query failed", {
            event: "public_project_query_failed",
            route: "/",
            query: "getProyectosDestacados",
            errorName: error instanceof Error ? error.name : typeof error,
            prismaCode: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
        });
        return [];
    }
}

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
                {banners.length > 0 && <MediaBanner banners={banners} />}
                <div className="relative z-20">
                    <Hero
                        title={heroTitle?.value || undefined}
                        subtitle={heroSubtitle?.value || undefined}
                        ctaText={ctaText?.value || undefined}
                    />
                </div>
            </section>

            <section id="proyectos">
                <Exploracion />
                <ProyectosDestacados proyectos={proyectos} />
            </section>

            <section id="desarrolladores">
                <ParaDesarrolladores />
            </section>

            <section id="como-funciona">
                <ComoFunciona />
                <div id="oportunidades">
                    <FormularioCaptura />
                </div>
            </section>

            <section id="noticias">
                <Noticias />
            </section>

            <section id="testimonios">
                <Comunidad />
                <TestimonialsSection />
            </section>

            <FloatingNav />
        </main>
    );
}
