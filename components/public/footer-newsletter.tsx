"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import NewsletterModal from "./newsletter-modal";

export default function FooterNewsletter() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white text-sm font-bold transition-all hover:scale-105 active:scale-95"
            >
                <Mail className="w-4 h-4" />
                Newsletter
            </button>
            <NewsletterModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
