import Hero from "@/components/public/hero";
import MediaBanner from "@/components/public/media-banner";
import EarlyAccess from "@/components/public/early-access";
import HashAutoScroll from "@/components/public/hash-auto-scroll";
import dynamic from "next/dynamic";

import { getBanners } from "@/lib/actions/banners";
import { getSystemConfig } from "@/lib/actions/configuration";

// ─── Lazy load below-fold sections (LCP optimization) ───
const AboutSection = dynamic(() => import("@/components/public/about-section"));
const CommunityCTA = dynamic(() => import("@/components/public/community-cta"));
const WhatIsSevenToop = dynamic(() => import("@/components/public/what-is-seventoop"));
const TestimonialsSection = dynamic(() => import("@/components/public/testimonials-section"));
const ContactSection = dynamic(() => import("@/components/public/contact-section"));

const defaultBannerItems = [
    {
        type: "image" as const,
        url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1920&q=80",
    },
    {
        type: "image" as const,
        url: "https://images.unsplash.com/photo-1542332213-915993de7e76?auto=format&fit=crop&w=1920&q=80",
    },
    {
        type: "image" as const,
        url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
    },
];

export default async function HomePage() {
    const bannersRes = await getBanners({ status: "APROBADO" });

    // Fetch Hero Config
    const heroTitle = await getSystemConfig("HERO_TITLE");
    const heroSubtitle = await getSystemConfig("HERO_SUBTITLE");
    const ctaText = await getSystemConfig("CTA_TEXT");

    let bannerItems: { type: "image" | "video"; url: string }[] = defaultBannerItems;

    if (bannersRes.success && bannersRes.data && bannersRes.data.length > 0) {
        bannerItems = bannersRes.data.map(b => ({
            type: b.tipo === "VIDEO" ? "video" : "image",
            url: b.mediaUrl
        }));
    }

    return (
        <main className="min-h-screen pt-0">
            <HashAutoScroll />
            <MediaBanner items={bannerItems} />

            <div id="inicio" className="scroll-mt-20">
                <Hero
                    title={heroTitle.value || undefined}
                    subtitle={heroSubtitle.value || undefined}
                    ctaText={ctaText.value || undefined}
                />
            </div>

            {/* 1 — Acceso Anticipado — bg: white/black */}
            <EarlyAccess />

            {/* 2 — Comunidad — bg: gray alt */}
            <div id="comunidad" className="scroll-mt-20">
                <CommunityCTA />
            </div>

            {/* 3 — Diferencial Tecnológico — bg: white/black */}
            <AboutSection />

            {/* 4 — Qué es SevenToop — bg: gray alt */}
            <div id="quienes" className="scroll-mt-20">
                <WhatIsSevenToop />
            </div>

            {/* 5 — Testimonios — bg: white/black */}
            <div id="testimonios" className="scroll-mt-20">
                <TestimonialsSection />
            </div>

            {/* 6 — Contacto — bg: gray alt */}
            <div id="contacto" className="scroll-mt-20">
                <ContactSection />
            </div>
        </main>
    );
}
