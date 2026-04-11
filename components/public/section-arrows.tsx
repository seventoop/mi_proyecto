"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const HEADER_OFFSET = 96;

function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = Math.max(el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, 0);
    window.scrollTo({ top, behavior: "smooth" });
}

interface SectionArrowsProps {
    prev?: string;
    next?: string;
    className?: string;
}

export default function SectionArrows({ prev, next, className }: SectionArrowsProps) {
    if (!prev && !next) return null;

    return (
        <div className={cn("flex justify-center items-center gap-3 py-2", className)}>
            {prev && (
                <button
                    type="button"
                    onClick={() => scrollToSection(prev)}
                    aria-label="Sección anterior"
                    className="w-10 h-10 rounded-full border border-border bg-background/80 backdrop-blur-sm text-foreground/50 hover:text-brand-orange hover:border-brand-orange/40 flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                    <ChevronUp className="w-5 h-5" />
                </button>
            )}
            {next && (
                <button
                    type="button"
                    onClick={() => scrollToSection(next)}
                    aria-label="Siguiente sección"
                    className="w-10 h-10 rounded-full border border-border bg-background/80 backdrop-blur-sm text-foreground/50 hover:text-brand-orange hover:border-brand-orange/40 flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                    <ChevronDown className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
