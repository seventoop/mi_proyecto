"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const HEADER_OFFSET = 96;

const SECTIONS = ["inicio", "proyectos", "desarrolladores", "como-funciona", "noticias", "testimonios", "contacto"] as const;

type SectionId = (typeof SECTIONS)[number];

function scrollToSection(id: SectionId) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = Math.max(el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, 0);
    window.scrollTo({ top, behavior: "smooth" });
}

interface SectionArrowsProps {
    currentSection: SectionId;
    className?: string;
}

export default function SectionArrows({ currentSection, className }: SectionArrowsProps) {
    const currentIndex = SECTIONS.indexOf(currentSection);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < SECTIONS.length - 1;

    if (currentIndex === -1) return null;

    return (
        <div className={cn("flex items-center justify-center gap-3 py-2", className)}>
            {hasPrev && (
                <button
                    type="button"
                    onClick={() => scrollToSection(SECTIONS[currentIndex - 1])}
                    aria-label="Sección anterior"
                    className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-foreground/70 shadow-sm transition-all duration-200 hover:scale-105 hover:border-brand-orange/40 hover:text-brand-orange"
                >
                    <ChevronUp className="h-5 w-5" />
                </button>
            )}
            {hasNext && (
                <button
                    type="button"
                    onClick={() => scrollToSection(SECTIONS[currentIndex + 1])}
                    aria-label="Siguiente sección"
                    className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-foreground/70 shadow-sm transition-all duration-200 hover:scale-105 hover:border-brand-orange/40 hover:text-brand-orange"
                >
                    <ChevronDown className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
