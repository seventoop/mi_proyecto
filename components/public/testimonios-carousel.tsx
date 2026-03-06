"use client";

import { useState, useEffect } from "react";
import { getTestimonios } from "@/lib/actions/testimonios";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestimoniosCarousel() {
    const [testimonios, setTestimonios] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const load = async () => {
            const res = await getTestimonios();
            if (res.success && res.data) {
                setTestimonios(res.data);
            }
        };
        load();
    }, []);

    const next = () => setCurrentIndex((idx) => (idx + 1) % testimonios.length);
    const prev = () => setCurrentIndex((idx) => (idx - 1 + testimonios.length) % testimonios.length);

    if (testimonios.length === 0) return null;

    return (
        <div className="relative w-full max-w-4xl mx-auto px-4">
            <div className="overflow-hidden relative min-h-[300px] flex items-center">
                <div
                    className="flex transition-transform duration-500 ease-out will-change-transform"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {testimonios.map((t) => (
                        <div key={t.id} className="w-full flex-shrink-0 px-4 md:px-12">
                            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded-[2.5rem] relative">
                                <Quote className="absolute top-8 left-8 w-12 h-12 text-brand-orange/20 rotate-180" />

                                <div className="text-center relative z-10">
                                    <div className="flex justify-center gap-1 mb-6">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={cn("w-5 h-5", i < (t.rating || 5) ? "fill-brand-yellow text-brand-yellow" : "text-slate-600")} />
                                        ))}
                                    </div>

                                    <p className="text-xl md:text-2xl font-medium text-slate-200 italic leading-relaxed mb-8">
                                        "{t.texto}"
                                    </p>

                                    <div className="flex flex-col items-center gap-3">
                                        {t.mediaUrl ? (
                                            <img src={t.mediaUrl} alt={t.autorNombre} className="w-16 h-16 rounded-full object-cover border-2 border-brand-orange/50" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-white uppercase border-2 border-brand-orange/50">
                                                {t.autorNombre[0]}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{t.autorNombre}</h4>
                                            <p className="text-sm text-brand-orange font-black uppercase tracking-widest">{t.autorTipo}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            {testimonios.length > 1 && (
                <>
                    <button onClick={prev} className="absolute left-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/50 hover:bg-brand-orange text-white backdrop-blur-md transition-all hover:scale-110">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={next} className="absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/50 hover:bg-brand-orange text-white backdrop-blur-md transition-all hover:scale-110">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
                {testimonios.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={cn("w-2 h-2 rounded-full transition-all", i === currentIndex ? "w-8 bg-brand-orange" : "bg-slate-700 hover:bg-brand-orange/50")}
                    />
                ))}
            </div>
        </div>
    );
}
