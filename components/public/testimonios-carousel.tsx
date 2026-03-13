"use client";

import { useState, useEffect } from "react";
import { getTestimonios, Testimonio } from "@/lib/actions/testimonios";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';

// Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function TestimoniosCarousel() {
    const [testimonios, setTestimonios] = useState<Testimonio[]>([]);

    useEffect(() => {
        const load = async () => {
            const res = await getTestimonios();
            if (res.success && res.data) {
                setTestimonios(res.data);
            }
        };
        load();
    }, []);

    // Placeholder data in case DB is empty for visual testing of the 3D effect
    const displayData = testimonios.length > 0 ? testimonios : [
        {
            id: '1',
            texto: 'La plataforma nos permitió digitalizar todo el proceso de ventas de nuestro último desarrollo en tiempo récord. El Masterplan interactivo es un game changer.',
            autorNombre: 'Martín Suárez',
            autorTipo: 'Desarrollador',
            rating: 5,
        },
        {
            id: '2',
            texto: 'Encontrar oportunidades de inversión validadas y con toda la información técnica en un solo lugar me ahorra semanas de "due diligence".',
            autorNombre: 'Carla Vanzini',
            autorTipo: 'Inversora Calificada',
            rating: 5,
        },
        {
            id: '3',
            texto: 'El tour 360 y la posibilidad de ver unidades disponibles en tiempo real cerraron la venta de mi propiedad. Una experiencia premium.',
            autorNombre: 'Andrés Gil',
            autorTipo: 'Comprador',
            rating: 4,
        },
        {
            id: '4',
            texto: 'Gestión de leads y reservas en un solo panel. SevenToop se convirtió en nuestro CRM inmobiliario principal.',
            autorNombre: 'Lucía Fernández',
            autorTipo: 'Broker Inmobiliario',
            rating: 5,
        }
    ];

    if (displayData.length === 0) return null;

    return (
        <div className="w-full max-w-[100vw] overflow-hidden lg:max-w-6xl mx-auto py-10 relative left-1/2 -translate-x-1/2 px-4 md:px-0">
            <Swiper
                effect={'coverflow'}
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
                    rotate: 20, // Gentle Y-axis rotation
                    stretch: 0,
                    depth: 150, // Perspective depth
                    modifier: 1, // Effect multiplier
                    slideShadows: false, // We use our own CSS shadows
                }}
                breakpoints={{
                    320: {
                        slidesPerView: 1.1, // Show a tiny bit of the next/prev on mobile
                        coverflowEffect: {
                            rotate: 0,
                            depth: 100,
                        }
                    },
                    768: {
                        slidesPerView: 2,
                    },
                    1024: {
                        slidesPerView: 3, // 1 center, 2 sides on desktop
                    }
                }}
                pagination={{
                    clickable: true,
                    dynamicBullets: true,
                }}
                navigation={true}
                modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
                className="testimonios-swiper !pb-16"
            >
                {displayData.map((t, idx) => (
                    <SwiperSlide key={t.id || idx} className="py-10">
                        {/* Slide content - The outer div handles the Swiper scaling, the inner div handles the card styling */}
                        <div className="bg-card dark:bg-card/50 backdrop-blur-md border border-border shadow-2xl p-8 md:p-10 rounded-[2rem] flex flex-col h-full min-h-[350px] transition-all duration-300">

                            {/* Stars */}
                            <div className="flex justify-center gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={cn(
                                            "w-5 h-5",
                                            i < (t.rating || 5) ? "fill-brand-yellow text-brand-yellow drop-shadow-sm" : "text-muted-foreground/30"
                                        )}
                                    />
                                ))}
                            </div>

                            {/* Quote Text */}
                            <div className="flex-1 relative">
                                <Quote className="absolute -top-4 -left-4 w-8 h-8 text-brand-orange/20 rotate-180" />
                                <p className="text-lg md:text-xl font-medium text-foreground relative z-10 text-center italic leading-relaxed">
                                    "{t.texto}"
                                </p>
                            </div>

                            {/* Author Info */}
                            <div className="mt-8 pt-6 border-t border-border flex items-center gap-4">
                                {t.mediaUrl ? (
                                    <img
                                        src={t.mediaUrl}
                                        alt={t.autorNombre}
                                        className="w-14 h-14 rounded-full object-cover border-2 border-brand-orange shadow-lg"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-orange to-brand-orangeDark flex items-center justify-center text-xl font-black text-white shadow-lg shrink-0">
                                        {t.autorNombre.charAt(0)}
                                    </div>
                                )}
                                <div className="flex flex-col text-left">
                                    <h4 className="font-bold text-foreground leading-tight">{t.autorNombre}</h4>
                                    <p className="text-xs font-bold text-brand-orange uppercase tracking-wider mt-1">
                                        {t.autorTipo}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Custom Styles for Swiper Overrides to match Theme */}
            <style jsx global>{`
                .testimonios-swiper .swiper-slide {
                    transition: all 0.5s ease-in-out;
                    opacity: 0.4; /* Default opacity for side slides */
                    filter: blur(2px) grayscale(50%);
                }
                .testimonios-swiper .swiper-slide-active {
                    opacity: 1 !important; /* Center slide is fully visible */
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
                        display: none; /* Hide arrows on touch devices */
                    }
                }
            `}</style>
        </div>
    );
}
