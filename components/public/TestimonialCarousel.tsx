"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Navigation } from "swiper/modules";
import TestimonialCard, { Testimonial } from "./TestimonialCard";

// Swiper styles
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";

interface TestimonialCarouselProps {
    testimonials: Testimonial[];
}

export default function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
    if (!testimonials || testimonials.length === 0) return null;

    return (
        <div className="w-full relative py-6 px-4 md:px-8 testimonial-carousel-container max-w-[100vw] overflow-hidden">
            <Swiper
                effect="coverflow"
                grabCursor={true}
                centeredSlides={true}
                slidesPerView="auto"
                navigation={true}
                pagination={{
                    clickable: true,
                    dynamicBullets: true
                }}
                modules={[EffectCoverflow, Pagination, Navigation]}
                coverflowEffect={{
                    rotate: 50,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: true,
                }}
                className="w-full mx-auto !pb-12"
            >
                {testimonials.map((testimonial, idx) => (
                    <SwiperSlide key={idx} className="!w-full max-w-[280px] md:max-w-[340px] flex justify-center pb-6 pt-2">
                        <TestimonialCard testimonial={testimonial} />
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Custom Styles for exact matches of user requirements */}
            <style jsx global>{`
                .testimonial-carousel-container .swiper-slide {
                    transition: opacity 0.3s ease-in-out;
                    opacity: 0.5; /* Default opacity for side slides */
                }
                .testimonial-carousel-container .swiper-slide-active {
                    opacity: 1 !important; /* Center slide is fully visible */
                    z-index: 10;
                }
                
                /* Bullets */
                .testimonial-carousel-container .swiper-pagination-bullet {
                    background-color: hsl(var(--muted-foreground));
                    opacity: 0.4;
                    margin: 0 6px !important;
                }
                .testimonial-carousel-container .swiper-pagination-bullet-active {
                    background-color: hsl(var(--primary)) !important;
                    opacity: 1 !important;
                }

                /* Navigation Buttons */
                .testimonial-carousel-container .swiper-button-next,
                .testimonial-carousel-container .swiper-button-prev {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background-color: rgba(0, 0, 0, 0.1);
                    color: hsl(var(--foreground));
                    transition: all 0.2s ease;
                }
                
                .dark .testimonial-carousel-container .swiper-button-next,
                .dark .testimonial-carousel-container .swiper-button-prev {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .testimonial-carousel-container .swiper-button-next:hover,
                .testimonial-carousel-container .swiper-button-prev:hover {
                    background-color: rgba(0, 0, 0, 0.2);
                }
                
                .dark .testimonial-carousel-container .swiper-button-next:hover,
                .dark .testimonial-carousel-container .swiper-button-prev:hover {
                    background-color: rgba(255, 255, 255, 0.2);
                }

                .testimonial-carousel-container .swiper-button-next:after,
                .testimonial-carousel-container .swiper-button-prev:after {
                    font-size: 20px;
                    font-weight: 800;
                }

                .testimonial-carousel-container .swiper-button-prev {
                    left: 10px;
                }
                .testimonial-carousel-container .swiper-button-next {
                    right: 10px;
                }

                @media (max-width: 768px) {
                    .testimonial-carousel-container .swiper-slide {
                        opacity: 1; /* Reset opacity on mobile if desired, or keep coverflow */
                    }
                    .testimonial-carousel-container .swiper-button-next,
                    .testimonial-carousel-container .swiper-button-prev {
                        display: none; /* Usually hide navigation on mobile */
                    }
                }
            `}</style>
        </div>
    );
}
