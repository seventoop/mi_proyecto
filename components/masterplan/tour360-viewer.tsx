"use client";

import { useEffect, useRef, useState } from "react";
import { X, Layers, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import Tour360Upscaler from "./tour360-upscaler";
import Tour360Overlay from "./tour360-overlay";

declare global {
    interface Window {
        pannellum: any;
    }
}

interface Tour360ViewerProps {
    imageUrl: string;
    onClose: () => void;
    title?: string;
}

let pannellumLoading: Promise<void> | null = null;

function loadPannellumOnce(): Promise<void> {
    if (window.pannellum) return Promise.resolve();
    if (pannellumLoading) return pannellumLoading;

    pannellumLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar Pannellum"));
        document.body.appendChild(script);

        // CSS una sola vez
        if (!document.querySelector('link[data-pannellum="1"]')) {
            const style = document.createElement("link");
            style.rel = "stylesheet";
            style.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
            style.setAttribute("data-pannellum", "1");
            document.head.appendChild(style);
        }
    });

    return pannellumLoading;
}

export default function Tour360Viewer({ imageUrl, onClose, title }: Tour360ViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);

    const [isUpscaled, setIsUpscaled] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [isEditingOverlay, setIsEditingOverlay] = useState(false);
    const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
    const activeUrl = upscaledUrl ?? imageUrl;

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await loadPannellumOnce();
            if (cancelled) return;

            if (!viewerRef.current || !window.pannellum) return;

            // guardar vista actual (si existe) antes de recrear
            const prev = instanceRef.current;
            const view = prev
                ? {
                    yaw: safeCall(() => prev.getYaw(), 0),
                    pitch: safeCall(() => prev.getPitch(), 0),
                    hfov: safeCall(() => prev.getHfov(), 100),
                }
                : { yaw: 0, pitch: 0, hfov: 100 };

            // destruir instancia anterior
            if (prev?.destroy) {
                try { prev.destroy(); } catch { }
            }
            instanceRef.current = null;

            // limpiar el contenedor por las dudas
            viewerRef.current.innerHTML = "";

            // crear nueva instancia con el panorama activo
            instanceRef.current = window.pannellum.viewer(viewerRef.current, {
                type: "equirectangular",
                panorama: activeUrl,
                autoLoad: true,
                showControls: true,
                compass: true,
                title: title || "Tour 360",
                yaw: view.yaw,
                pitch: view.pitch,
                hfov: view.hfov,
                mouseZoom: false, // Smooth zoom handler bypass
                hotSpots: [
                    {
                        pitch: -10,
                        yaw: 15,
                        type: "info",
                        text: "Lote 104 - Disponible",
                        URL: "#"
                    },
                    {
                        pitch: -5,
                        yaw: -20,
                        type: "info",
                        text: "Area Recreativa",
                    },
                    {
                        pitch: 5,
                        yaw: 50,
                        type: "info",
                        text: "Futuro Acceso",
                    }
                ]
            });
        }

        init();

        return () => {
            cancelled = true;
        };
    }, [activeUrl, title]);

    // ─── Smooth Zoom Interceptor ───
    useEffect(() => {
        const el = viewerRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => {
            if (!instanceRef.current) return;
            e.preventDefault();
            e.stopPropagation();
            const currentFov = instanceRef.current.getHfov();
            const delta = e.deltaY > 0 ? 5 : -5;
            instanceRef.current.setHfov(currentFov + delta); // Instant target update for smoother scrolling
        };
        el.addEventListener("wheel", handleWheel as any, { capture: true, passive: false });
        return () => el.removeEventListener("wheel", handleWheel as any, { capture: true } as any);
    }, []);

    const isUpscaledState = !!upscaledUrl;

    return (
        <div className="fixed inset-0 z-[3000] bg-black animate-in fade-in duration-300 font-sans">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="absolute top-4 left-4 z-50 pointer-events-none">
                <h2 className="text-white font-bold text-xl drop-shadow-md">{title}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm border border-white/10">
                        {isUpscaledState ? "✨ AI ENHANCED" : "ORIGINAL"}
                    </span>
                </div>
            </div>

            <div ref={viewerRef} className="w-full h-full" />

            {/* Overlay Layer */}
            <Tour360Overlay
                imageUrl="/masterplan-overlay.png" // Using the existing demo overlay or generic one
                isVisible={showOverlay}
                isEditing={isEditingOverlay}
                onClose={() => setIsEditingOverlay(false)}
            />

            {/* Controls Bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[3001] flex items-center gap-2">
                <button
                    onClick={() => {
                        setShowOverlay(!showOverlay);
                        if (!showOverlay) setIsEditingOverlay(true);
                    }}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md transition-all text-sm font-semibold border",
                        showOverlay
                            ? "bg-brand-500/80 border-brand-400 text-white"
                            : "bg-black/40 border-white/10 text-slate-300 hover:bg-black/60"
                    )}
                >
                    <Layers className="w-4 h-4" />
                    {showOverlay ? "Ocultar Masterplan" : "Superponer Masterplan"}
                </button>

                {showOverlay && (
                    <button
                        onClick={() => setIsEditingOverlay(!isEditingOverlay)}
                        className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md"
                        title="Editar Alineación"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}
            </div>

            <Tour360Upscaler
                originalUrl={imageUrl}
                isUpscaled={!!upscaledUrl}
                onUpscaledUrl={setUpscaledUrl}
            />
        </div>
    );
}

function safeCall<T>(fn: () => T, fallback: T): T {
    try { return fn(); } catch { return fallback; }
}
