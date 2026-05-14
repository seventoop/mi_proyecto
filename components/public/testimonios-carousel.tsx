"use client";

import { useEffect, useMemo, useState } from "react";
import { getTestimonios } from "@/lib/actions/testimonios";
import type { Testimonio } from "@/lib/actions/testimonios";
import { useLanguage } from "@/components/providers/language-provider";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

// Swiper imports
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Navigation, Autoplay } from "swiper/modules";

// Swiper styles
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";

export default function TestimoniosCarousel() {
    const { locale, dictionary: t } = useLanguage();
    const [testimonios, setTestimonios] = useState<Testimonio[]>([]);

    useEffect(() => {
        if (locale === "en") {
            setTestimonios([]);
            return;
        }

        let isMounted = true;

        const load = async () => {
            const res = await getTestimonios();
            if (isMounted && res.success && res.data) {
                setTestimonios(res.data);
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [locale]);

    const fallback = useMemo<Testimonio[]>(
        () =>
            t.testimonials.mockData.map((item, index) => ({
                id: `localized-testimonial-${index}`,
                texto: item.quote,
                autorNombre: item.name,
                autorTipo: item.role,
                rating: 5,
                estado: "APROBADO",
                mediaUrl: null,
                createdAt: new Date(0),
            })),
        [t.testimonials.mockData]
    );

    const displayData = locale === "en"
        ? fallback
        : testimonios.length > 0
            ? testimonios
            : fallback;

    if (displayData.length === 0) return null;

    return (
        <div className="w-full py-10 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 md:px-12 relative">
                <Swiper
                    effect="coverflow"
                    grabCursor={true}
                    centeredSlides={true}
                    loop={true}
                    speed={800}
                    autoplay={{
                        delay: 4000,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true,
                    }}
                    coverflowEffect={{
                        rotate: 10,
                        stretch: 0,
                        depth: 60,
                        modifier: 1,
                        slideShadows: false,
                    }}
                    breakpoints={{
                        320: {
                            slidesPerView: 1.1,
                            spaceBetween: 20,
                        },
                        768: {
                            slidesPerView: 2.2,
                            spaceBetween: 30,
                        },
                        1024: {
                            slidesPerView: 3.2,
                            spaceBetween: 40,
                        },
                    }}
                    pagination={{
                        clickable: true,
                        dynamicBullets: true,
                    }}
                    navigation={true}
                    modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
                    className="testimonios-swiper !pb-16"
                >
                    {displayData.map((testimonial, idx) => (
                        <SwiperSlide key={testimonial.id || idx} className="py-10 !h-auto flex">
                            <div className="bg-card dark:bg-card/50 backdrop-blur-md border border-border shadow-2xl p-8 md:p-10 rounded-[2rem] flex flex-col w-full h-full transition-all duration-300">
                                <div className="flex justify-center gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={cn(
                                                "w-5 h-5",
                                                i < (testimonial.rating || 5)
                                                    ? "fill-brand-yellow text-brand-yellow drop-shadow-sm"
                                                    : "text-muted-foreground/30"
                                            )}
                                        />
                                    ))}
                                </div>

                                <div className="flex-1 relative">
                                    <Quote className="absolute -top-4 -left-4 w-8 h-8 text-brand-orange/20 rotate-180" />
                                    <p className="text-lg md:text-xl font-medium text-foreground relative z-10 text-center italic leading-relaxed">
                                        "{testimonial.texto}"
                                    </p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-border flex items-center gap-4">
                                    {testimonial.mediaUrl ? (
                                        <img
                                            src={testimonial.mediaUrl}
                                            alt={testimonial.autorNombre}
                                            className="w-14 h-14 rounded-full object-cover border-2 border-brand-orange shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-orange to-brand-orangeDark flex items-center justify-center text-xl font-black text-white shadow-lg shrink-0">
                                            {testimonial.autorNombre.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex flex-col text-left">
                                        <h4 className="font-bold text-foreground leading-tight">
                                            {testimonial.autorNombre}
                                        </h4>
                                        <p className="text-xs font-bold text-brand-orange uppercase tracking-wider mt-1">
                                            {testimonial.autorTipo}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                <style jsx global>{`
                    .testimonios-swiper .swiper-slide {
                        transition: all 0.5s ease-in-out;
                        opacity: 0.4;
                        filter: blur(2px) grayscale(50%);
                    }
                    .testimonios-swiper .swiper-slide-active {
                        opacity: 1 !important;
                        filter: blur(0px) grayscale(0%) !important;
                    }
                    .testimonios-swiper .swiper-pagination-bullet {
                        background-color: hsl(var(--muted-foreground));
                        opacity: 0.5;
                    }
                    .testimonios-swiper .swiper-pagination-bullet-active {
                        background-color: var(--brand-orange) !important;
                        opacity: 1 !important;
                    }
                    .testimonios-swiper .swiper-button-next,
                    .testimonios-swiper .swiper-button-prev {
                        color: var(--brand-orange) !important;
                        background-color: hsl(var(--background));
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                        border: 1px solid hsl(var(--border) / 0.5);
                        transition: all 0.3s ease;
                    }
                    .testimonios-swiper .swiper-button-next:hover,
                    .testimonios-swiper .swiper-button-prev:hover {
                        background-color: var(--brand-orange) !important;
                        color: white !important;
                        transform: scale(1.1);
                    }
                    .testimonios-swiper .swiper-button-next:after,
                    .testimonios-swiper .swiper-button-prev:after {
                        font-size: 20px !important;
                        font-weight: 900 !important;
                    }
                    @media (max-width: 1024px) {
                        .testimonios-swiper .swiper-button-next,
                        .testimonios-swiper .swiper-button-prev {
                            display: none;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
