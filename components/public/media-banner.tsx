"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MediaItem {
    type: "image" | "video";
    url: string;
}

interface MediaBannerProps {
    items: MediaItem[];
    autoPlayInterval?: number;
}

export default function MediaBanner({ items, autoPlayInterval = 8000 }: MediaBannerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (items.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, autoPlayInterval);

        return () => clearInterval(timer);
    }, [items.length, autoPlayInterval]);

    return (
        <section className="relative w-full h-[80vh] md:h-screen overflow-hidden bg-black">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 w-full h-full"
                >
                    {items[currentIndex].type === "video" ? (
                        <video
                            src={items[currentIndex].url}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img
                            src={items[currentIndex].url}
                            alt="Banner Media"
                            className="w-full h-full object-cover"
                        />
                    )}
                    {/* Subtle overlay for depth if needed, but keeping it clean as requested */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />
                </motion.div>
            </AnimatePresence>

            {/* Pagination dots */}
            {items.length > 1 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                    {items.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={cn(
                                "h-1.5 transition-all duration-500 rounded-full",
                                currentIndex === index
                                    ? "w-8 bg-white"
                                    : "w-2 bg-white/30 hover:bg-white/50"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Side indicators (Nature style) */}
            <div className="absolute left-10 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-4">
                <div className="w-px h-20 bg-white/20" />
                <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] vertical-text">
                    Gention Geodevia
                </span>
            </div>
        </section>
    );
}
