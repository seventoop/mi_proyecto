"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScrollToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 300);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <button
            type="button"
            onClick={scrollTop}
            aria-label="Volver arriba"
            className={cn(
                "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange text-white shadow-lg shadow-brand-orange/25 transition-all duration-200 hover:bg-brand-orangeDark hover:scale-110 active:scale-95",
                visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4"
            )}
        >
            <ArrowUp className="h-5 w-5" />
        </button>
    );
}
