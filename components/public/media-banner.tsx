"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

interface BannerItem {
    id?: string;
    mediaUrl: string;
    tipo: string;
    titulo?: string;
    headline?: string | null;
    subheadline?: string | null;
    tagline?: string | null;
    ctaText?: string | null;
    ctaUrl?: string | null;
    linkDestino?: string | null;
}

interface MediaBannerProps {
    banners: BannerItem[];
}

export default function MediaBanner({ banners }: MediaBannerProps) {
    const { dictionary: t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const transitionRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (currentIndex >= banners.length) {
            setCurrentIndex(Math.max(0, banners.length - 1));
        }
    }, [banners.length, currentIndex]);

    const goTo = useCallback((index: number) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        if (transitionRef.current) clearTimeout(transitionRef.current);
        transitionRef.current = setTimeout(() => {
            setCurrentIndex(index);
            setTimeout(() => setIsTransitioning(false), 50);
        }, 300);
    }, [isTransitioning]);

    useEffect(() => {
        return () => {
            if (transitionRef.current) clearTimeout(transitionRef.current);
        };
    }, []);

    const nextSlide = useCallback(() => {
        if (!banners || banners.length <= 1) return;
        goTo((currentIndex + 1) % banners.length);
    }, [banners, currentIndex, goTo]);

    const prevSlide = useCallback(() => {
        if (!banners || banners.length <= 1) return;
        goTo((currentIndex - 1 + banners.length) % banners.length);
    }, [banners, currentIndex, goTo]);

    const currentBanner = banners[currentIndex];

    useEffect(() => {
        if (currentBanner?.tipo !== "VIDEO") return;
        const video = videoRef.current;
        if (!video) return;
        video.muted = true;
        video.play().catch(() => {});
    }, [currentIndex, currentBanner?.tipo]);

    useEffect(() => {
        if (currentBanner?.tipo !== "VIDEO") return;
        const video = videoRef.current;
        if (!video) return;

        let started = false;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    started = true;
                    if (video.paused) video.play().catch(() => {});
                } else if (started) {
                    video.pause();
                }
            },
            { threshold: 0.3 }
        );

        const onVisibility = () => {
            if (document.hidden) {
                video.muted = true;
                video.pause();
            } else if (started) {
                video.play().catch(() => {});
            }
        };

        observer.observe(video);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [currentIndex, currentBanner?.tipo]);

    useEffect(() => {
        if (!banners || banners.length <= 1) return;
        const duration = (banners[currentIndex]?.tipo === "VIDEO") ? 25000 : 8000;
        const timer = setTimeout(nextSlide, duration);
        return () => clearTimeout(timer);
    }, [banners, currentIndex, nextSlide]);

    useEffect(() => {
        if (banners.length > 0 && currentBanner) {
            console.info(`[BANNER] ${currentBanner.id} - ${currentBanner.titulo}`);
        }
    }, [currentIndex, banners.length, currentBanner]);

    if (!banners || banners.length === 0 || !currentBanner) {
        return (
            <div className="relative w-full h-[50vh] sm:h-[65vh] bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                            <span className="text-white/40 text-xs font-bold uppercase tracking-[0.3em]">
                                {t.mediaBanner.engineLabel}
                            </span>
                        </div>
                        <p className="text-white/20 text-sm">{t.mediaBanner.systemStatus}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[50vh] sm:h-[65vh] lg:h-[75vh] max-h-[800px] overflow-hidden">
            {currentBanner.tipo === "VIDEO" ? (
                <video
                    key={`video-${currentIndex}`}
                    ref={videoRef}
                    src={currentBanner.mediaUrl}
                    loop
                    muted
                    playsInline
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                        isTransitioning ? "opacity-0" : "opacity-100"
                    )}
                />
            ) : (
                <div
                    key={`img-${currentIndex}`}
                    className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        isTransitioning ? "opacity-0" : "opacity-100"
                    )}
                >
                    <Image
                        src={currentBanner.mediaUrl}
                        alt={currentBanner.titulo || "Banner"}
                        fill
                        priority={currentIndex === 0}
                        className="object-cover"
                        sizes="100vw"
                    />
                </div>
            )}

            {(currentBanner.headline || currentBanner.titulo) && (
                <div className={cn(
                    "absolute inset-0 flex flex-col justify-end pb-16 sm:pb-20 px-6 sm:px-12 z-10 transition-opacity duration-300",
                    isTransitioning ? "opacity-0" : "opacity-100"
                )}>
                    {(currentBanner.headline || currentBanner.subheadline || currentBanner.ctaText) && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                    )}
                    <div className="relative z-10 max-w-3xl">
                        <span className="inline-flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-brand-orange shadow-[0_0_6px_rgba(255,107,0,0.6)]" />
                            <span className="text-white/70 text-xs font-bold uppercase tracking-[0.2em]">
                                {currentBanner.tagline || "SevenToop"}
                            </span>
                        </span>
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-lg">
                            {currentBanner.headline || currentBanner.titulo}
                        </h2>
                        {currentBanner.subheadline && (
                            <p className="mt-2 text-sm sm:text-lg text-white/80 max-w-xl">
                                {currentBanner.subheadline}
                            </p>
                        )}
                        {(currentBanner.ctaText || currentBanner.ctaUrl || currentBanner.linkDestino) && (
                            <a
                                href={currentBanner.ctaUrl || currentBanner.linkDestino || "#"}
                                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orangeDark text-white font-bold text-sm transition-colors shadow-lg"
                            >
                                {currentBanner.ctaText || "Ver más"} →
                            </a>
                        )}
                    </div>
                </div>
            )}

            {banners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                        aria-label="Anterior"
                    >
                        <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                        aria-label="Siguiente"
                    >
                        <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {banners.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => goTo(idx)}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-200",
                                    currentIndex === idx ? "w-8 bg-brand-orange" : "w-2 bg-white/40 hover:bg-white/70"
                                )}
                                aria-label={`Banner ${idx + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
