"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
    "inicio",
    "proyectos",
    "desarrolladores",
    "como-funciona",
    "noticias",
    "testimonios",
    "contacto",
] as const;

const HEADER_OFFSET = 96;

function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = Math.max(el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, 0);
    window.scrollTo({ top, behavior: "smooth" });
}

function NavButton({
    icon: Icon,
    label,
    onClick,
}: {
    icon: typeof ChevronUp;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/95 text-foreground/60 shadow-md backdrop-blur-sm transition-all duration-150 hover:border-brand-orange/50 hover:text-brand-orange hover:shadow-lg active:scale-90"
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

export default function FloatingNav() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visible, setVisible] = useState(false);

    const detectSection = useCallback(() => {
        const scrollY = window.scrollY;
        setVisible(scrollY > 200);

        const atBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 100;
        if (atBottom) {
            setCurrentIndex(SECTIONS.length - 1);
            return;
        }

        for (let i = SECTIONS.length - 1; i >= 0; i--) {
            const el = document.getElementById(SECTIONS[i]);
            if (!el) continue;
            const top = el.getBoundingClientRect().top + scrollY - HEADER_OFFSET;
            if (scrollY >= top - 50) {
                setCurrentIndex(i);
                return;
            }
        }
        setCurrentIndex(0);
    }, []);

    useEffect(() => {
        window.addEventListener("scroll", detectSection, { passive: true });
        detectSection();
        return () => window.removeEventListener("scroll", detectSection);
    }, [detectSection]);

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < SECTIONS.length - 1;
    const isAtTop = currentIndex === 0;
    const isAtBottom = currentIndex === SECTIONS.length - 1;

    if (!visible) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2"
            role="navigation"
            aria-label="Navegación entre secciones"
        >
            {isAtBottom && (
                <NavButton
                    icon={ChevronsUp}
                    label="Ir al inicio"
                    onClick={() => scrollTo("inicio")}
                />
            )}

            {hasPrev && (
                <NavButton
                    icon={ChevronUp}
                    label="Sección anterior"
                    onClick={() => scrollTo(SECTIONS[currentIndex - 1])}
                />
            )}

            {hasNext && (
                <NavButton
                    icon={ChevronDown}
                    label="Siguiente sección"
                    onClick={() => scrollTo(SECTIONS[currentIndex + 1])}
                />
            )}

            {hasNext && (
                <NavButton
                    icon={ChevronsDown}
                    label="Ir a contacto"
                    onClick={() => scrollTo("contacto")}
                />
            )}
        </div>
    );
}
