"use client";

import { motion, AnimatePresence } from "framer-motion";
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
    const videoRef = useRef<HTMLVideoElement>(null);

    const nextSlide = useCallback(() => {
        if (!banners || banners.length <= 1) return;
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, [banners]);

    const prevSlide = useCallback(() => {
        if (!banners || banners.length <= 1) return;
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }, [banners]);

    const currentBanner = banners[currentIndex];

    // ─────────────────────────────────────────────────────────────────
    // Effect 1: Imperatively start playback when video slide is active.
    // Using useEffect (not autoPlay attr) to bypass the React muted bug
    // and ensure play() is called AFTER the element is in the DOM.
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (currentBanner?.tipo !== "VIDEO") return;

        const video = videoRef.current;
        if (!video) return;

        video.muted = true;
        video.volume = 1;
        const promise = video.play();
        if (promise) promise.catch(() => { /* blocked by browser policy */ });
    }, [currentIndex, currentBanner?.tipo]);

    // ─────────────────────────────────────────────────────────────────
    // Effect 2: Scroll / tab / window visibility control.
    //   - Pauses when scrolled away (IntersectionObserver)
    //   - Mutes when tab is hidden or window loses focus
    //   - Uses `hasStartedPlaying` flag to avoid pausing on initial mount
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (currentBanner?.tipo !== "VIDEO") return;

        const video = videoRef.current;
        if (!video) return;

        let hasStartedPlaying = false; // prevents pause race-condition on initial mount

        const setAudio = () => {
            const tabVisible = !document.hidden;
            const winFocused = document.hasFocus();
            video.muted = !(tabVisible && winFocused);
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    hasStartedPlaying = true;
                    if (video.paused) {
                        video.play().catch(() => {});
                    }
                    setAudio();
                } else if (hasStartedPlaying) {
                    // Only pause if we were already playing (not on initial load)
                    video.muted = true;
                    video.pause();
                }
            },
            { threshold: 0.3 }
        );

        const onVisibility = () => {
            setAudio();
            if (document.hidden && !video.paused) {
                video.pause();
            } else if (!document.hidden && video.paused && hasStartedPlaying) {
                video.play().catch(() => {});
            }
        };

        const onBlur = () => { video.muted = true; };
        const onFocus = () => { setAudio(); };

        observer.observe(video);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);

        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("blur", onBlur);
            window.removeEventListener("focus", onFocus);
        };
    }, [currentIndex, currentBanner?.tipo]);

    // ─────────────────────────────────────────────────────────────────
    // Effect 3: Auto-advance timer
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!banners || banners.length <= 1) return;
        const tipo = banners[currentIndex]?.tipo || "IMAGEN";
        const duration = tipo === "VIDEO" ? 35000 : 20000;
        const timer = setTimeout(nextSlide, duration);
        return () => clearTimeout(timer);
    }, [banners, currentIndex, nextSlide]);

    useEffect(() => {
        if (banners.length > 0 && currentBanner) {
            console.info(`[BANNER] ${currentBanner.id} - ${currentBanner.titulo}`);
        }
    }, [currentIndex, banners.length, currentBanner?.id, currentBanner?.titulo]);

    // ─────────────────────────────────────────────────────────────────
    // Empty state
    // ─────────────────────────────────────────────────────────────────
    if (!banners || banners.length === 0) {
        return (
            <div className="relative w-full h-[60vh] sm:h-[70vh] bg-[#0A0A1B] overflow-hidden group">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(255,107,0,0.1),transparent_70%)]" />
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-orange/10 blur-[150px] rounded-full" />
                </div>
                <div className="absolute top-[88px] left-8 sm:left-12 z-10 flex flex-col items-start space-y-1 animate-pulse-slow">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(232,116,42,0.6)]" />
                        <h3 className="text-white/40 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em]">
                            {t.mediaBanner.engineLabel}
                        </h3>
                    </div>
                    <p className="text-white/10 text-[9px] font-medium tracking-tight">
                        {t.mediaBanner.systemStatus}
                    </p>
                </div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-orange/20 to-transparent" />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // Main slider
    // ─────────────────────────────────────────────────────────────────
    return (
        <div className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] overflow-hidden bg-black">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full"
                >
                    {currentBanner.tipo === "VIDEO" ? (
                        <video
                            ref={videoRef}
                            src={currentBanner.mediaUrl}
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <>
                            <Image
                                src={currentBanner.mediaUrl}
                                alt={currentBanner.titulo || "Banner Media"}
                                fill
                                priority
                                className="object-cover"
                                sizes="100vw"
                            />
                            {(currentBanner.headline || currentBanner.titulo) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                                    className="absolute inset-0 flex flex-col justify-end pb-20 px-8 sm:px-14 z-10"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                                    <div className="relative z-10">
                                        {currentBanner.tagline ? (
                                            <span className="inline-flex items-center gap-2 mb-3">
                                                <span className="w-2 h-2 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(255,107,0,0.8)]" />
                                                <span className="text-white/70 text-xs font-bold uppercase tracking-[0.3em]">{currentBanner.tagline}</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 mb-3">
                                                <span className="w-2 h-2 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(255,107,0,0.8)]" />
                                                <span className="text-white/70 text-xs font-bold uppercase tracking-[0.3em]">SevenToop Media</span>
                                            </span>
                                        )}
                                        <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight drop-shadow-2xl max-w-2xl">
                                            {currentBanner.headline || currentBanner.titulo}
                                        </h2>
                                        {currentBanner.subheadline && (
                                            <p className="mt-2 text-base sm:text-xl text-white/80 max-w-xl drop-shadow-lg">
                                                {currentBanner.subheadline}
                                            </p>
                                        )}
                                        {(currentBanner.ctaText || currentBanner.ctaUrl || currentBanner.linkDestino) && (
                                            <a
                                                href={currentBanner.ctaUrl || currentBanner.linkDestino || "#"}
                                                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orangeDark text-white font-bold text-sm transition-all hover:scale-105 shadow-lg shadow-brand-orange/30"
                                            >
                                                {currentBanner.ctaText || "Ver más"} →
                                            </a>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation controls */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-md transition-all shadow-xl hover:scale-110 active:scale-90"
                        aria-label="Anterior"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-md transition-all shadow-xl hover:scale-110 active:scale-90"
                        aria-label="Siguiente"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                        {banners.map((banner, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    currentIndex === idx ? "w-10 bg-brand-orange" : "w-2.5 bg-white/40 hover:bg-white"
                                )}
                                aria-label={`Ir al banner ${idx + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
