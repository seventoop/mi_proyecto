"use client";

import { useEffect, useRef, useState } from "react";
import { X, Layers, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import Tour360Upscaler from "./tour360-upscaler";
import Tour360Overlay from "./tour360-overlay";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

interface Tour360ViewerProps {
    imageUrl: string;
    onClose: () => void;
    title?: string;
}

export default function Tour360Viewer({ imageUrl, onClose, title }: Tour360ViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<Viewer | null>(null);
    const lastViewRef = useRef<{ yaw: number; pitch: number; zoom: number }>({ yaw: 0, pitch: 0, zoom: 50 });

    const [showOverlay, setShowOverlay] = useState(false);
    const [isEditingOverlay, setIsEditingOverlay] = useState(false);
    const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
    const activeUrl = upscaledUrl ?? imageUrl;

    useEffect(() => {
        if (!viewerRef.current) return;

        // Save current view before recreating
        if (instanceRef.current) {
            try {
                const pos = instanceRef.current.getPosition();
                lastViewRef.current = {
                    yaw: pos.yaw * (180 / Math.PI),
                    pitch: pos.pitch * (180 / Math.PI),
                    zoom: instanceRef.current.getZoomLevel(),
                };
            } catch { }
            try { instanceRef.current.destroy(); } catch { }
            instanceRef.current = null;
        }

        const psv = new Viewer({
            container: viewerRef.current,
            panorama: activeUrl,
            defaultYaw: lastViewRef.current.yaw * (Math.PI / 180),
            defaultPitch: lastViewRef.current.pitch * (Math.PI / 180),
            defaultZoomLvl: lastViewRef.current.zoom,
            navbar: ['zoom', 'fullscreen'],
        });

        instanceRef.current = psv;

        return () => {
            try {
                const pos = psv.getPosition();
                lastViewRef.current = {
                    yaw: pos.yaw * (180 / Math.PI),
                    pitch: pos.pitch * (180 / Math.PI),
                    zoom: psv.getZoomLevel(),
                };
            } catch { }
            try { psv.destroy(); } catch { }
            instanceRef.current = null;
        };
    }, [activeUrl]);

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

