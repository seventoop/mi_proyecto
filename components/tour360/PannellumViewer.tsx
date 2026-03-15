"use client";

import { useEffect, useRef, useState } from "react";

export interface PannellumScene {
    id: string;
    title: string;
    imageUrl: string;
    thumbnailUrl?: string | null;
    pannellumHotspots?: any[] | null;
}

interface PannellumViewerProps {
    scenes: PannellumScene[];
    initialSceneId?: string;
    isAdmin?: boolean;
    onHotspotClick?: (hotspot: any) => void;
    onLoteClick?: (unidadId: string) => void;
}

// Load Pannellum via CDN (avoids SSR issues)
let pannellumLoaded = false;
let pannellumLoadPromise: Promise<void> | null = null;

function loadPannellum(): Promise<void> {
    if (pannellumLoaded) return Promise.resolve();
    if (pannellumLoadPromise) return pannellumLoadPromise;

    pannellumLoadPromise = new Promise((resolve) => {
        // CSS
        if (!document.querySelector('link[href*="pannellum"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
            document.head.appendChild(link);
        }
        // JS
        if (!document.querySelector('script[src*="pannellum"]')) {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
            script.onload = () => { pannellumLoaded = true; resolve(); };
            script.onerror = () => resolve(); // resolve anyway to avoid hang
            document.head.appendChild(script);
        } else {
            pannellumLoaded = true;
            resolve();
        }
    });
    return pannellumLoadPromise;
}

export default function PannellumViewer({
    scenes, initialSceneId, isAdmin = false, onHotspotClick, onLoteClick
}: PannellumViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const [loaded, setLoaded] = useState(false);
    const [activeSceneId, setActiveSceneId] = useState(initialSceneId || scenes[0]?.id || "");

    useEffect(() => {
        if (!containerRef.current || scenes.length === 0) return;

        loadPannellum().then(() => {
            const pannellum = (window as any).pannellum;
            if (!pannellum || !containerRef.current) return;

            // Destroy previous instance
            if (viewerRef.current) {
                try { viewerRef.current.destroy(); } catch {}
                viewerRef.current = null;
            }

            // Build config
            const scenesConfig: Record<string, any> = {};
            scenes.forEach(scene => {
                const hotspots = (scene.pannellumHotspots || []).map((h: any) => ({
                    pitch: h.pitch ?? 0,
                    yaw: h.yaw ?? 0,
                    type: h.type === "scene" ? "scene" : "info",
                    text: h.text || h.unidadNumero || "",
                    sceneId: h.targetSceneId,
                    cssClass: h.type === "unit"
                        ? "pannellum-hotspot-unit"
                        : h.type === "scene"
                        ? "pannellum-hotspot-scene"
                        : "pannellum-hotspot-info",
                    clickHandlerFunc: h.type === "unit" && onLoteClick
                        ? (_: any, args: any) => { onLoteClick(args.unidadId); }
                        : undefined,
                    clickHandlerArgs: { unidadId: h.unidadId },
                }));

                scenesConfig[scene.id] = {
                    title: scene.title,
                    panorama: scene.imageUrl,
                    hotSpots: hotspots,
                };
            });

            const firstScene = initialSceneId && scenesConfig[initialSceneId]
                ? initialSceneId
                : scenes[0]?.id;

            try {
                viewerRef.current = pannellum.viewer(containerRef.current, {
                    default: {
                        firstScene,
                        sceneFadeDuration: 1000,
                        autoLoad: true,
                        showControls: true,
                    },
                    scenes: scenesConfig,
                });

                viewerRef.current.on("scenechange", (sceneId: string) => {
                    setActiveSceneId(sceneId);
                });

                setLoaded(true);
            } catch (err) {
                console.error("Pannellum init error:", err);
            }
        });

        return () => {
            if (viewerRef.current) {
                try { viewerRef.current.destroy(); } catch {}
                viewerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenes]);

    const switchScene = (sceneId: string) => {
        if (viewerRef.current) {
            try { viewerRef.current.loadScene(sceneId); } catch {}
        }
        setActiveSceneId(sceneId);
    };

    if (scenes.length === 0) {
        return (
            <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
                <p className="text-slate-500 text-sm">Sin escenas disponibles</p>
            </div>
        );
    }

    return (
        <div className="relative w-full" style={{ height: 600 }}>
            {/* Custom hotspot CSS */}
            <style>{`
                .pannellum-hotspot-unit { background:#f59e0b!important; border-radius:50%!important; width:20px!important; height:20px!important; cursor:pointer!important; }
                .pannellum-hotspot-scene { background:#3b82f6!important; border-radius:50%!important; }
                .pannellum-hotspot-info { background:#22c55e!important; border-radius:50%!important; }
            `}</style>

            <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-xl">
                    <div className="text-slate-400 text-sm animate-pulse">Cargando tour 360°...</div>
                </div>
            )}

            {/* Scene thumbnails */}
            {scenes.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 backdrop-blur-sm rounded-xl p-2 z-10">
                    {scenes.map(scene => (
                        <button
                            key={scene.id}
                            onClick={() => switchScene(scene.id)}
                            className={`w-16 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                                activeSceneId === scene.id ? "border-brand-500 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                            }`}
                        >
                            {scene.thumbnailUrl
                                ? <img src={scene.thumbnailUrl} alt={scene.title} className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-slate-700 flex items-center justify-center text-[9px] text-white text-center px-1">{scene.title}</div>
                            }
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
