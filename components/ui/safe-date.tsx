"use client";

import { useState, useEffect } from "react";

interface SafeDateProps {
    date: Date | string | number;
    format?: (date: Date) => string;
}

export default function SafeDate({ date, format }: SafeDateProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Return a stable placeholder or semi-transparent dots during SSR/initial hydration
        // this ensures the HTML structure remains the same but content is only visible on client
        return <span className="opacity-0">...</span>;
    }

    const d = new Date(date);

    return (
        <span>
            {format ? format(d) : d.toLocaleString()}
        </span>
    );
}
