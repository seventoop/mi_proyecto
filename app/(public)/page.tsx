import type { Metadata } from "next";
import { cookies } from "next/headers";
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
import { getProyectosDestacados } from "@/lib/actions/proyectos";
import { getSystemConfig } from "@/lib/actions/configuration";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { resolveLocale } from "@/lib/i18n/format";

const HOME_DATA_TIMEOUT_MS = 1800;

async function withHomeTimeout<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            promise,
            new Promise<T>((resolve) => {
                timeout = setTimeout(() => {
                    console.warn(`[home] ${label} timed out after ${HOME_DATA_TIMEOUT_MS}ms`);
                    resolve(fallback);
                }, HOME_DATA_TIMEOUT_MS);
            }),
        ]);
    } catch (error) {
        console.warn(`[home] ${label} failed`, error);
        return fallback;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = resolveLocale(cookies().get("NEXT_LOCALE")?.value);
    const dictionary = await getDictionary(locale);

    return {
        title: dictionary.homeMetadata.title,
        description: dictionary.homeMetadata.description,
    };
}

export default async function HomePage() {
    const [bannersRes, proyectos, heroTitle, heroSubtitle, ctaText] = await Promise.all([
        withHomeTimeout(getBannersLanding(), { success: false, data: [] }, "banners"),
        withHomeTimeout(getProyectosDestacados(), [], "featured projects"),
        withHomeTimeout(getSystemConfig("HERO_TITLE"), { success: false, value: null }, "hero title"),
        withHomeTimeout(getSystemConfig("HERO_SUBTITLE"), { success: false, value: null }, "hero subtitle"),
        withHomeTimeout(getSystemConfig("CTA_TEXT"), { success: false, value: null }, "cta text"),
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
