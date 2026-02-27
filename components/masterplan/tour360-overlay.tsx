"use client";

import { useState, useRef, useEffect } from "react";
import { Move, Maximize, RotateCw, Layers, Eye, EyeOff, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverlayConfig {
    opacity: number;
    scale: number;
    rotateX: number; // Perspective (Tilt)
    rotateZ: number; // Rotation
    translateX: number;
    translateY: number;
}

interface Tour360OverlayProps {
    imageUrl: string; // The masterplan image
    isVisible: boolean;
    isEditing: boolean;
    onSave?: (config: OverlayConfig) => void;
    onClose: () => void;
}

export default function Tour360Overlay({ imageUrl, isVisible, isEditing, onSave, onClose }: Tour360OverlayProps) {
    const [config, setConfig] = useState<OverlayConfig>({
        opacity: 0.6,
        scale: 1,
        rotateX: 45, // Initial perspective tilt roughly matching a drone shot
        rotateZ: 0,
        translateX: 0,
        translateY: 0,
    });

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-[2000] pointer-events-none overflow-hidden flex items-center justify-center">

            {/* The Overlay Layer */}
            <div
                className="relative transition-opacity duration-300 origin-center will-change-transform"
                style={{
                    opacity: config.opacity,
                    transform: `
                        perspective(1000px)
                        translate3d(${config.translateX}px, ${config.translateY}px, 0)
                        scale(${config.scale})
                        rotateX(${config.rotateX}deg)
                        rotateZ(${config.rotateZ}deg)
                    `,
                    pointerEvents: isEditing ? "auto" : "none", // Only interactive in edit mode (if we add drag handlers later)
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt="Masterplan Overlay"
                    className="max-w-[80vw] max-h-[80vh] object-contain drop-shadow-2xl border-2 border-transparent"
                    style={{
                        borderColor: isEditing ? "#3b82f6" : "transparent",
                        borderStyle: isEditing ? "dashed" : "none"
                    }}
                />
            </div>

            {/* Editing Controls (Only visible when editing) */}
            {isEditing && (
                <div className="absolute bottom-24 right-4 z-[2001] bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white w-64 pointer-events-auto animate-in slide-in-from-right-10">
                    <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-brand-400" />
                            Alinear Masterplan
                        </h3>
                        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3 text-xs">
                        {/* Opacity */}
                        <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3 text-slate-400" />
                            <label className="w-20">Opacidad</label>
                            <input
                                type="range" min="0.1" max="1" step="0.05"
                                value={config.opacity}
                                onChange={(e) => setConfig({ ...config, opacity: parseFloat(e.target.value) })}
                                className="flex-1 accent-brand-500 h-1.5"
                            />
                        </div>

                        {/* Scale */}
                        <div className="flex items-center gap-2">
                            <Maximize className="w-3 h-3 text-slate-400" />
                            <label className="w-20">Escala</label>
                            <input
                                type="range" min="0.1" max="3" step="0.05"
                                value={config.scale}
                                onChange={(e) => setConfig({ ...config, scale: parseFloat(e.target.value) })}
                                className="flex-1 accent-brand-500 h-1.5"
                            />
                        </div>

                        {/* Rotation Z */}
                        <div className="flex items-center gap-2">
                            <RotateCw className="w-3 h-3 text-slate-400" />
                            <label className="w-20">Rotación</label>
                            <input
                                type="range" min="-180" max="180" step="1"
                                value={config.rotateZ}
                                onChange={(e) => setConfig({ ...config, rotateZ: parseFloat(e.target.value) })}
                                className="flex-1 accent-brand-500 h-1.5"
                            />
                        </div>

                        {/* Perspective X */}
                        <div className="flex items-center gap-2">
                            <Move className="w-3 h-3 text-slate-400" />
                            <label className="w-20">Perspectiva</label>
                            <input
                                type="range" min="0" max="80" step="1"
                                value={config.rotateX}
                                onChange={(e) => setConfig({ ...config, rotateX: parseFloat(e.target.value) })}
                                className="flex-1 accent-brand-500 h-1.5"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button className="flex-1 bg-brand-600 hover:bg-brand-500 py-1.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                                <Save className="w-3 h-3" />
                                Guardar Alineación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
