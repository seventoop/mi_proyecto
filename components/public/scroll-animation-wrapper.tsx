"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollAnimationWrapperProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right" | "none";
}

export default function ScrollAnimationWrapper({
    children,
    className,
    delay = 0,
    direction = "up"
}: ScrollAnimationWrapperProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { rootMargin: "-60px", threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const translateMap = {
        up: "translate-y-4",
        down: "-translate-y-4",
        left: "translate-x-4",
        right: "-translate-x-4",
        none: "",
    };

    return (
        <div
            ref={ref}
            className={cn(
                "transition-all duration-500 ease-out",
                isVisible
                    ? "opacity-100 translate-y-0 translate-x-0"
                    : `opacity-0 ${translateMap[direction]}`,
                className
            )}
            style={delay > 0 ? { transitionDelay: `${delay * 1000}ms` } : undefined}
        >
            {children}
        </div>
    );
}
