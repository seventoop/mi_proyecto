"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResizableContainerProps {
    children: React.ReactNode;
    /** Minimum height in px */
    minHeight?: number;
    /** Maximum height in px */
    maxHeight?: number;
    /** Default height in px */
    defaultHeight?: number;
    className?: string;
    /** Show fullscreen button inside container */
    showFullscreenBtn?: boolean;
}

/**
 * ResizableContainer — wraps any content with resize handles.
 * Supports: bottom edge drag, corner drag, fullscreen toggle.
 * Designed for masterplan-viewer and masterplan-map.
 */
export default function ResizableContainer({
    children,
    minHeight = 380,
    maxHeight = 1200,
    defaultHeight = 600,
    className,
    showFullscreenBtn = true,
}: ResizableContainerProps) {
    const [height, setHeight] = useState(defaultHeight);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const startY = useRef(0);
    const startH = useRef(0);

    // ─── Listen to fullscreen change (esc key) ────────────────────────────────
    useEffect(() => {
        const onFSChange = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
        };
        document.addEventListener("fullscreenchange", onFSChange);
        return () => document.removeEventListener("fullscreenchange", onFSChange);
    }, []);

    // ─── Bottom edge resize ───────────────────────────────────────────────────
    const handleResizeStart = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            dragging.current = true;
            startY.current = e.clientY;
            startH.current = height;

            const onMove = (ev: MouseEvent) => {
                if (!dragging.current) return;
                const dy = ev.clientY - startY.current;
                setHeight(Math.min(maxHeight, Math.max(minHeight, startH.current + dy)));
            };
            const onUp = () => {
                dragging.current = false;
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        },
        [height, minHeight, maxHeight]
    );

    // ─── Corner resize (bottom-right) ────────────────────────────────────────
    const startX = useRef(0);
    const startW = useRef(0);
    const [width, setWidth] = useState<number | null>(null);

    const handleCornerStart = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            dragging.current = true;
            startY.current = e.clientY;
            startH.current = height;
            startX.current = e.clientX;
            startW.current = containerRef.current?.offsetWidth ?? 0;

            const onMove = (ev: MouseEvent) => {
                if (!dragging.current) return;
                const dy = ev.clientY - startY.current;
                const dx = ev.clientX - startX.current;
                setHeight(Math.min(maxHeight, Math.max(minHeight, startH.current + dy)));
                const newW = Math.max(400, startW.current + dx);
                setWidth(newW);
            };
            const onUp = () => {
                dragging.current = false;
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        },
        [height, minHeight, maxHeight]
    );

    // ─── Fullscreen ────────────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch {
            // Fullscreen not supported
        }
    }, []);

    const containerStyle: React.CSSProperties = isFullscreen
        ? { height: "100vh", width: "100vw" }
        : { height, width: width ? width : undefined };

    return (
        <div
            ref={containerRef}
            className={cn("relative select-none", className)}
            style={containerStyle}
        >
            {/* Children take full height */}
            <div className="w-full h-full">{children}</div>

            {/* Fullscreen button (top-right, above child controls) */}
            {showFullscreenBtn && !isFullscreen && (
                <button
                    onClick={toggleFullscreen}
                    title="Pantalla completa"
                    className="absolute top-3 right-3 z-[1100] w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
            )}
            {showFullscreenBtn && isFullscreen && (
                <button
                    onClick={toggleFullscreen}
                    title="Salir de pantalla completa"
                    className="absolute top-3 right-3 z-[1100] w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
                >
                    <Minimize2 className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Bottom resize handle */}
            {!isFullscreen && (
                <div
                    onMouseDown={handleResizeStart}
                    title="Arrastrar para redimensionar"
                    className="absolute bottom-0 left-4 right-4 h-3 z-[1050] flex items-center justify-center cursor-ns-resize group"
                >
                    <div className="w-16 h-1 rounded-full bg-slate-300/70 dark:bg-slate-600/70 group-hover:bg-brand-400 group-hover:w-20 transition-all duration-150" />
                </div>
            )}

            {/* Bottom-right corner resize handle */}
            {!isFullscreen && (
                <div
                    onMouseDown={handleCornerStart}
                    title="Arrastrar para redimensionar"
                    className="absolute bottom-0 right-0 w-5 h-5 z-[1060] cursor-nwse-resize flex items-end justify-end pb-1 pr-1 group"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400 group-hover:text-brand-400 transition-colors">
                        <path d="M9 1L1 9M9 5L5 9M9 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
            )}
        </div>
    );
}
