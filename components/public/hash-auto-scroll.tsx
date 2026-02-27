"use client";

import { useEffect } from "react";

/**
 * Client component that auto-scrolls to a hash target on mount.
 * Place this inside the Home page so that navigating from another
 * page to /#contacto (for example) will trigger the scroll once
 * the DOM is ready.
 */
export default function HashAutoScroll() {
    useEffect(() => {
        const hash = window.location.hash;
        if (!hash) return;

        const id = hash.slice(1);

        // Small delay to ensure the DOM is fully painted
        const timer = setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return null;
}
