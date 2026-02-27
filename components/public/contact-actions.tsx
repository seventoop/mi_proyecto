"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";

export default function ContactActions() {

    return (
        <>
            <div className="flex flex-col sm:flex-row gap-3">
                <a
                    href="https://wa.me/5491112345678"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground/70 font-semibold hover:bg-brand-orange/10 hover:border-brand-orange/20 hover:text-brand-orange transition-all text-sm"
                >
                    <MessageSquare className="w-4 h-4" /> Chat WhatsApp
                </a>
            </div>
        </>
    );
}
