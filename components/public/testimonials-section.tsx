import { Star } from "lucide-react";
import TestimoniosCarouselWrapper from "./testimonios-carousel-wrapper";
import TestimonialsActions from "./testimonials-actions";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";

export default function TestimonialsSection() {
    return (
        <section id="testimonios" className="py-20 bg-white dark:bg-black relative overflow-hidden border-t border-slate-200/60 dark:border-white/5">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-brand-orange/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <ScrollAnimationWrapper className="text-center max-w-3xl mx-auto mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-black uppercase tracking-[0.2em] border border-brand-orange/20">
                        <Star className="w-4 h-4" />
                        Voces de Nuestra Comunidad
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                        Lo que dicen de <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">Nosotros</span>
                    </h2>

                    <p className="text-foreground/60 text-lg md:text-xl font-medium leading-relaxed">
                        Historias reales de desarrolladores, inversores y familias que ya están construyendo su futuro con nuestra plataforma.
                    </p>

                    <TestimonialsActions />
                </ScrollAnimationWrapper>

                <div className="mt-12">
                    <TestimoniosCarouselWrapper />
                </div>
            </div>
        </section>
    );
}
