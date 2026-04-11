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
                "fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full",
                "bg-brand-orange text-white shadow-lg shadow-brand-orange/25",
                "flex items-center justify-center",
                "hover:bg-brand-orangeDark hover:scale-110 active:scale-95",
                "transition-all duration-300",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
        >
            <ArrowUp className="w-5 h-5" />
        </button>
    );
}
