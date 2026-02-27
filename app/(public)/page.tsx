import Hero from "@/components/public/hero";
import MediaBanner from "@/components/public/media-banner";
import EarlyAccess from "@/components/public/early-access";
import CommunityCTA from "@/components/public/community-cta";
import AboutSection from "@/components/public/about-section";
import WhatIsSevenToop from "@/components/public/what-is-seventoop";
import TestimonialsSection from "@/components/public/testimonials-section";
import ContactSection from "@/components/public/contact-section";
import HashAutoScroll from "@/components/public/hash-auto-scroll";

import { getBanners } from "@/lib/actions/banners";

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
                <Hero />
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
