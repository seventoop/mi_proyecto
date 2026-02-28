"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { cn } from "@/lib/utils";
import {
    Loader2, Play, Pause, Maximize2, Share2, Copy, Check,
    ChevronLeft, ChevronRight, MapPin, X, Volume2, VolumeX,
    SkipForward, Info, ExternalLink, Navigation, ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

declare global {
    interface Window {
        pannellum: any;
    }
}

export type HotspotType = "info" | "scene" | "link" | "lot" | "check" | "sold" | "gallery" | "video" | "UNIT";

export interface Hotspot {
    id: string;
    type: HotspotType;
    pitch: number;
    yaw: number;
    text: string;
    targetSceneId?: string;
    targetUrl?: string;
    targetThumbnail?: string;
    icon?: string;
    unidad?: {
        id: string;
        numero: string;
        estado: string;
        precio?: number;
        moneda?: string;
    };
}

export interface PolygonPoint {
    pitch: number;
    yaw: number;
}

export interface TourPolygon {
    id: string;
    points: PolygonPoint[];
    fillColor?: string;
    strokeColor?: string;
    linkedUnitId?: string;
    hoverText?: string;
}

export interface FloatingLabel {
    id: string;
    pitch: number;
    yaw: number;
    text: string;
    style?: 'street' | 'landmark';
    anchorPitch?: number;
    anchorYaw?: number;
}

export interface MasterplanOverlay {
    imageUrl: string;
    points: { pitch: number; yaw: number }[];
    opacity: number;
    isVisible: boolean;
}

export interface Scene {
    id: string;
    title: string;
    imageUrl: string;
    thumbnailUrl?: string;
    hotspots: Hotspot[];
    polygons?: TourPolygon[];
    floatingLabels?: FloatingLabel[];
    isDefault?: boolean;
    order?: number;
    masterplanOverlay?: MasterplanOverlay;
}

interface TourViewerProps {
    scenes: Scene[];
    initialSceneId?: string;
    autoRotate?: boolean;
    showControls?: boolean;
    className?: string;
    onSceneChange?: (sceneId: string) => void;
    proyectoId?: string;
    proyectoNombre?: string;
    showShare?: boolean;
    showSceneStrip?: boolean;
    showAutoTour?: boolean;
    unitInfo?: {
        numero: string;
        superficie?: number;
        precio?: number;
        estado?: string;
    } | null;
    onPolygonClick?: (polygon: TourPolygon) => void;
}


function PanoramicOverlay({
    viewer,
    viewerRef,
    currentScene,
    viewerReady,
    onPolygonClick
}: {
    viewer: any;
    viewerRef: React.RefObject<HTMLDivElement>;
    currentScene: Scene | null;
    viewerReady: boolean;
    onPolygonClick?: (polygon: TourPolygon) => void;
}) {
    const [viewState, setViewState] = useState({ hfov: 100, pitch: 0, yaw: 0 });

    useEffect(() => {
        if (!viewer) return;
        let rafId: number;
        const update = () => {
            setViewState({
                hfov: viewer.getHfov(),
                pitch: viewer.getPitch(),
                yaw: viewer.getYaw()
            });
            rafId = requestAnimationFrame(update);
        };
        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [viewer]);

    const projectCoords = (pitch: number, yaw: number) => {
        if (!viewer || !viewerRef.current) return null;

        const hfov = viewState.hfov;
        const viewPitch = viewState.pitch;
        const viewYaw = viewState.yaw;
        const container = viewerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const degToRad = Math.PI / 180;
        const p = pitch * degToRad;
        const y = yaw * degToRad;
        const vp = viewPitch * degToRad;
        const vy = viewYaw * degToRad;

        const vx = Math.cos(p) * Math.sin(y);
        const vy_vec = Math.sin(p);
        const vz = Math.cos(p) * Math.cos(y);

        const s_y = Math.sin(-vy);
        const c_y = Math.cos(-vy);
        const rx = vx * c_y - vz * s_y;
        const rz_temp = vx * s_y + vz * c_y;

        const s_p = Math.sin(-vp);
        const c_p = Math.cos(-vp);
        const ry = vy_vec * c_p - rz_temp * s_p;
        const rz = vy_vec * s_p + rz_temp * c_p;

        if (rz <= 0) return null;

        const canvas_hfov = hfov * degToRad;
        const focalLength = (width / 2) / Math.tan(canvas_hfov / 2);

        const px = (rx / rz) * focalLength + (width / 2);
        const py = (-ry / rz) * focalLength + (height / 2);

        return { x: px, y: py };
    };

    const getPolygonPath = (points: { pitch: number; yaw: number }[]) => {
        const coords = points.map(p => projectCoords(p.pitch, p.yaw));
        return coords.map((c, i) => {
            if (!c) return "";
            return `${i === 0 ? 'M' : 'L'} ${c.x},${c.y}`;
        }).join(" ") + " Z";
    };

    const getPerspectiveMatrix = (src: { x: number, y: number }[], dst: { x: number, y: number }[]) => {
        const solve = (A: number[][], b: number[]) => {
            let n = A.length;
            for (let i = 0; i < n; i++) {
                let max = i;
                for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[max][i])) max = j;
                [A[i], A[max]] = [A[max], A[i]];
                [b[i], b[max]] = [b[max], b[i]];
                for (let j = i + 1; j < n; j++) {
                    let f = A[j][i] / A[i][i];
                    b[j] -= f * b[i];
                    for (let k = i; k < n; k++) A[j][k] -= f * A[i][k];
                }
            }
            let x = new Array(n);
            for (let i = n - 1; i >= 0; i--) {
                let s = 0;
                for (let j = i + 1; j < n; j++) s += A[i][j] * x[j];
                x[i] = (b[i] - s) / A[i][i];
            }
            return x;
        };

        let A = [], b = [];
        for (let i = 0; i < 4; i++) {
            A.push([src[i].x, src[i].y, 1, 0, 0, 0, -src[i].x * dst[i].x, -src[i].y * dst[i].x]);
            b.push(dst[i].x);
            A.push([0, 0, 0, src[i].x, src[i].y, 1, -src[i].x * dst[i].y, -src[i].y * dst[i].y]);
            b.push(dst[i].y);
        }

        let h = solve(A, b);
        return [
            h[0], h[3], 0, h[6],
            h[1], h[4], 0, h[7],
            0, 0, 1, 0,
            h[2], h[5], 0, 1
        ];
    };

    if (!viewerReady || !currentScene) return null;

    return (
        <>
            {/* Perspective Masterplan Overlay */}
            {currentScene.masterplanOverlay?.isVisible && (() => {
                const overlay = currentScene.masterplanOverlay;
                const coords = overlay.points.map(p => projectCoords(p.pitch, p.yaw));

                if (coords.some(c => !c)) return null;

                const src = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 0, y: 1000 }];
                const dst = coords as { x: number, y: number }[];
                const matrix = getPerspectiveMatrix(src, dst);

                return (
                    <div
                        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
                        style={{ perspective: '1000px' }}
                    >
                        <div
                            className="absolute top-0 left-0 w-[1000px] h-[1000px] origin-top-left"
                            style={{
                                transform: `matrix3d(${matrix.join(',')})`,
                                opacity: overlay.opacity,
                                backgroundImage: `url(${overlay.imageUrl})`,
                                backgroundSize: '100% 100%'
                            }}
                        />
                    </div>
                );
            })()}

            {/* SVG Layer for Polygons */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                {currentScene.polygons?.map((poly) => (
                    <path
                        key={poly.id}
                        d={getPolygonPath(poly.points)}
                        fill={poly.fillColor || "rgba(16, 185, 129, 0.4)"}
                        stroke={poly.strokeColor || "white"}
                        strokeWidth={2}
                        className="opacity-70 transition-colors pointer-events-auto cursor-pointer hover:fill-brand-400/60"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPolygonClick?.(poly);
                        }}
                    >
                        <title>{poly.hoverText}</title>
                    </path>
                ))}

                {/* Leader Lines for Landmarks */}
                {currentScene.floatingLabels?.filter(l => l.style === 'landmark' && l.anchorPitch !== undefined).map(label => {
                    const labelCoords = projectCoords(label.pitch, label.yaw);
                    const anchorCoords = projectCoords(label.anchorPitch!, label.anchorYaw!);
                    if (!labelCoords || !anchorCoords) return null;
                    return (
                        <line
                            key={`line-${label.id}`}
                            x1={anchorCoords.x} y1={anchorCoords.y}
                            x2={labelCoords.x} y2={labelCoords.y}
                            stroke="white" strokeWidth={1} strokeDasharray="4 2" opacity={0.6}
                        />
                    );
                })}
            </svg>

            {/* Floating Labels Layer */}
            {currentScene.floatingLabels?.map(label => {
                const coords = projectCoords(label.pitch, label.yaw);
                if (!coords) return null;
                return (
                    <div
                        key={label.id}
                        className={cn(
                            "absolute px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 z-20",
                            label.style === 'street' ? "bg-slate-900/80 border border-white/20 backdrop-blur-md" : "bg-brand-500"
                        )}
                        style={{ left: coords.x, top: coords.y }}
                    >
                        {label.text}
                    </div>
                );
            })}
        </>
    );
}

export default function TourViewer({
    scenes,
    initialSceneId,
    autoRotate = false,
    showControls = true,
    className,
    onSceneChange,
    proyectoId,
    proyectoNombre,
    showShare = true,
    showSceneStrip = true,
    showAutoTour = true,
    unitInfo = null,
    onPolygonClick,
}: TourViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const viewerInstance = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(autoRotate);
    const [error, setError] = useState<string | null>(null);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewerReady, setViewerReady] = useState(false);
    const [isAutoTouring, setIsAutoTouring] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showRadar, setShowRadar] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);
    const autoTourTimer = useRef<NodeJS.Timeout | null>(null);
    const [viewState, setViewState] = useState({ hfov: 100, pitch: 0, yaw: 0 });

    useEffect(() => {
        if (!viewerInstance.current || !viewerReady) return;
        let rafId: number;
        const update = () => {
            if (viewerInstance.current) {
                setViewState({
                    hfov: viewerInstance.current.getHfov(),
                    pitch: viewerInstance.current.getPitch(),
                    yaw: viewerInstance.current.getYaw()
                });
            }
            rafId = requestAnimationFrame(update);
        };
        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [viewerReady]);

    const startScene = initialSceneId
        ? scenes.find((s) => s.id === initialSceneId)
        : scenes.find((s) => s.isDefault) || scenes[0];

    const currentScene = scenes.find((s) => s.id === currentSceneId) || startScene;
    const currentIndex = scenes.findIndex((s) => s.id === currentSceneId);

    // Initialize Pannellum
    useEffect(() => {
        if (!window.pannellum || !viewerRef.current || !startScene || viewerInstance.current) return;
        initViewer(startScene.id);
    }, [isLoaded, startScene]);

    // SVG Overlay Loop moved to PanoramicOverlay sub-component




    // Dynamic scenes state to handle real-time updates
    const [dynamicScenes, setDynamicScenes] = useState<Scene[]>(scenes);

    useEffect(() => {
        if (!proyectoId) return;

        const { pusherClient } = require("@/lib/pusher");
        const { CHANNELS, EVENTS } = require("@/lib/pusher");

        const channel = pusherClient.subscribe(CHANNELS.UNIDADES);

        channel.bind(EVENTS.UNIDAD_ESTADO_CAMBIADO, (data: { unidadId: string, nuevoEstado: string }) => {
            setDynamicScenes(prev => prev.map(scene => ({
                ...scene,
                hotspots: scene.hotspots.map(hs => {
                    if (hs.unidad?.id === data.unidadId) {
                        return { ...hs, unidad: { ...hs.unidad, estado: data.nuevoEstado } };
                    }
                    return hs;
                })
            })));

            // Re-render Pannellum hotSpots if currently active
            if (viewerInstance.current) {
                // This is tricky as Pannellum doesn't allow easy hotspot update without re-render or internal API access
                // For now, reflecting in the tooltip logic is the priority
            }
        });

        return () => {
            pusherClient.unsubscribe(CHANNELS.UNIDADES);
        };
    }, [proyectoId]);

    const initViewer = (firstSceneId: string) => {
        if (!viewerRef.current) return;

        try {
            const scenesConfig: any = {};
            scenes.forEach((scene) => {
                scenesConfig[scene.id] = {
                    title: scene.title,
                    type: "equirectangular",
                    panorama: scene.imageUrl,
                    hotSpots: scene.hotspots.map((h) => ({
                        pitch: h.pitch,
                        yaw: h.yaw,
                        type: h.type === "scene" ? "scene" : "info",
                        text: h.text,
                        sceneId: h.targetSceneId,
                        URL: h.targetUrl,
                        createTooltipFunc: hotspotTooltip,
                        createTooltipArgs: h,
                    })),
                };
            });

            viewerInstance.current = window.pannellum.viewer(viewerRef.current, {
                default: {
                    firstScene: firstSceneId,
                    sceneFadeDuration: 800,
                    autoLoad: true,
                    autoRotate: isPlaying ? 2 : 0,
                    showControls: false,
                },
                scenes: scenesConfig,
            });

            viewerInstance.current.on("scenechange", (sceneId: string) => {
                setCurrentSceneId(sceneId);
                onSceneChange?.(sceneId);
            });

            viewerInstance.current.on("error", () => {
                setError("Error al cargar la imagen 360°.");
            });

            viewerInstance.current.on("load", () => {
                setViewerReady(true);
            });

            setCurrentSceneId(firstSceneId);
        } catch (err) {
            console.error("Init error:", err);
            setError("Error al inicializar el visor.");
        }
    };

    const hotspotTooltip = (hotSpotDiv: HTMLElement, args: Hotspot) => {
        hotSpotDiv.classList.add("custom-hotspot-container");

        // Use real-time state from the component if available, otherwise use initial unit data
        const currentEstado = (args.unidad as any)?.estado || "DISPONIBLE";

        switch (args.type) {
            case "lot":
                hotSpotDiv.innerHTML = `<div class="hotspot-lot-marker">${args.text}</div>`;
                break;
            case "check": // Dynamic status
            case "sold":
            case "UNIT": // New professional type
                const isSold = ["VENDIDA", "RESERVADA", "SUSPENDIDA"].includes(currentEstado);
                hotSpotDiv.innerHTML = `
                    <div class="hotspot-status-marker ${isSold ? 'sold' : 'available'}">
                        ${isSold
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
                    }
                    </div>`;
                break;
            case "scene":
                if (args.targetThumbnail) {
                    hotSpotDiv.innerHTML = `<div class="hotspot-bubble-marker"><img src="${args.targetThumbnail}" /></div>`;
                } else {
                    hotSpotDiv.innerHTML = `<div class="hotspot-status-marker scene"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>`;
                }
                break;
            default:
                hotSpotDiv.classList.add("custom-tooltip");
                const span = document.createElement("span");
                span.innerHTML = args.text || (args.unidad?.numero ? `Unidad ${args.unidad.numero}` : "");
                hotSpotDiv.appendChild(span);
                break;
        }
    };

    // ─── Navigation ───
    const goToScene = (sceneId: string) => {
        if (viewerInstance.current) {
            viewerInstance.current.loadScene(sceneId);
        }
    };

    const goNext = () => {
        const idx = scenes.findIndex((s) => s.id === currentSceneId);
        if (idx < scenes.length - 1) {
            goToScene(scenes[idx + 1].id);
        } else {
            goToScene(scenes[0].id); // Loop
        }
    };

    const goPrev = () => {
        const idx = scenes.findIndex((s) => s.id === currentSceneId);
        if (idx > 0) {
            goToScene(scenes[idx - 1].id);
        } else {
            goToScene(scenes[scenes.length - 1].id);
        }
    };

    // ─── Auto-tour ───
    const startAutoTour = () => {
        setIsAutoTouring(true);
        viewerInstance.current?.startAutoRotate(2);

        autoTourTimer.current = setInterval(() => {
            goNext();
        }, 8000);
    };

    const stopAutoTour = () => {
        setIsAutoTouring(false);
        viewerInstance.current?.stopAutoRotate();
        if (autoTourTimer.current) {
            clearInterval(autoTourTimer.current);
            autoTourTimer.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (autoTourTimer.current) clearInterval(autoTourTimer.current);
        };
    }, []);

    // ─── Rotation toggle ───
    const togglePlay = () => {
        if (!viewerInstance.current) return;
        if (isPlaying) {
            viewerInstance.current.stopAutoRotate();
        } else {
            viewerInstance.current.startAutoRotate(2);
        }
        setIsPlaying(!isPlaying);
    };

    // ─── Share ───
    const shareUrl = typeof window !== "undefined"
        ? `${window.location.origin}/proyectos/${proyectoId}/tour360${currentSceneId ? `?scene=${currentSceneId}` : ""}`
        : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareWhatsApp = () => {
        const text = `🏡 Mirá el tour 360° de ${proyectoNombre || "este proyecto"}: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    return (
        <div className={cn("relative w-full h-[500px] bg-black overflow-hidden rounded-2xl group", className)}>
            <Script
                src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
                strategy="afterInteractive"
                onLoad={() => setIsLoaded(true)}
            />
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css" />

            {/* Loading */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-white z-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <span className="ml-3 font-medium">Cargando motor 360°...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-rose-400 z-20">
                    <p>{error}</p>
                </div>
            )}

            <div ref={viewerRef} className="w-full h-full" />

            {/* ─── Perspective Masterplan Overlay ─── */}
            <PanoramicOverlay
                viewer={viewerInstance.current}
                viewerRef={viewerRef}
                currentScene={currentScene || null}
                viewerReady={viewerReady}
                onPolygonClick={onPolygonClick}
            />

            {/* ─── Radar / Compass ─── */}
            {showRadar && viewerReady && (
                <div className="absolute top-20 left-4 z-20 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="relative w-20 h-20 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <div className="w-[80%] h-[80%] border border-dashed border-white rounded-full" />
                            <div className="absolute top-1 text-[7px] text-white">N</div>
                            <div className="absolute bottom-1 text-[7px] text-white">S</div>
                        </div>
                        <motion.div
                            className="absolute inset-0 origin-center"
                            animate={{ rotate: viewState.yaw }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[35px] border-b-brand-500/40 blur-[2px]" />
                            <Navigation className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 text-brand-500 fill-brand-500" />
                        </motion.div>
                    </div>
                </div>
            )}

            {/* ─── Top bar ─── */}
            {showControls && isLoaded && (
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {/* Scene title */}
                    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
                        <span className="text-sm font-semibold text-white">
                            {currentScene?.title || "Tour 360°"}
                        </span>
                        {scenes.length > 1 && (
                            <span className="text-xs text-slate-400 ml-2">
                                {currentIndex + 1}/{scenes.length}
                            </span>
                        )}
                    </div>

                    {/* Top actions */}
                    <div className="flex items-center gap-1">
                        {/* Unit info toggle */}
                        {unitInfo && (
                            <button
                                onClick={() => setShowInfoPanel(!showInfoPanel)}
                                className="p-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 text-white/80 hover:text-white transition-colors"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        )}

                        {/* Share button */}
                        {showShare && (
                            <button
                                onClick={() => setShowSharePanel(!showSharePanel)}
                                className="p-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 text-white/80 hover:text-white transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Share panel ─── */}
            <AnimatePresence>
                {showSharePanel && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="absolute top-4 right-4 z-20 w-[260px]"
                    >
                        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white">Compartir Tour</span>
                                <button onClick={() => setShowSharePanel(false)} className="p-1 hover:bg-slate-700/50 rounded">
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            </div>

                            <button
                                onClick={handleShareWhatsApp}
                                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                📱 Compartir por WhatsApp
                            </button>

                            <div className="flex gap-2">
                                <input
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 truncate"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    {copied ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Unit info panel ─── */}
            <AnimatePresence>
                {showInfoPanel && unitInfo && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        className="absolute top-16 left-4 z-20 w-[220px]"
                    >
                        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white">Lote {unitInfo.numero}</span>
                                <button onClick={() => setShowInfoPanel(false)} className="p-1 hover:bg-slate-700/50 rounded">
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            </div>
                            {unitInfo.superficie && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Superficie</span>
                                    <span className="text-white font-medium">{unitInfo.superficie} m²</span>
                                </div>
                            )}
                            {unitInfo.precio && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Precio</span>
                                    <span className="text-emerald-400 font-bold">USD ${unitInfo.precio.toLocaleString()}</span>
                                </div>
                            )}
                            {unitInfo.estado && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Estado</span>
                                    <span className="text-white font-medium">{unitInfo.estado}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Bottom controls ─── */}
            {showControls && isLoaded && (
                <div className="absolute bottom-0 inset-x-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {/* Scene strip */}
                    {showSceneStrip && scenes.length > 1 && (
                        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto">
                            {scenes.map((scene, i) => (
                                <button
                                    key={scene.id}
                                    onClick={() => goToScene(scene.id)}
                                    className={cn(
                                        "shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                                        currentSceneId === scene.id
                                            ? "border-brand-500 scale-105"
                                            : "border-transparent opacity-50 hover:opacity-100"
                                    )}
                                >
                                    <div className="relative w-16 h-10">
                                        <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-white">{i + 1}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Main controls bar */}
                    <div className="flex items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                        <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-xl border border-white/10">
                            {/* Prev */}
                            {scenes.length > 1 && (
                                <button onClick={goPrev} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )}

                            {/* Play/Pause rotation */}
                            <button onClick={togglePlay} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Auto-rotar">
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>

                            {/* Auto tour */}
                            {showAutoTour && scenes.length > 1 && (
                                <button
                                    onClick={isAutoTouring ? stopAutoTour : startAutoTour}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        isAutoTouring
                                            ? "bg-brand-500 text-white"
                                            : "hover:bg-white/10 text-white/80"
                                    )}
                                    title={isAutoTouring ? "Detener paseo guiado" : "Paseo guiado automático"}
                                >
                                    <SkipForward className="w-4 h-4" />
                                </button>
                            )}

                            {/* Next */}
                            {scenes.length > 1 && (
                                <button onClick={goNext} className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}

                            <div className="w-px h-5 bg-white/10 mx-0.5" />

                            <div className="w-px h-5 bg-white/10 mx-0.5" />

                            {/* Radar Toggle */}
                            <button
                                onClick={() => setShowRadar(!showRadar)}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    showRadar ? "text-brand-400 bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
                                )}
                                title="Radar de visión"
                            >
                                <Navigation className="w-4 h-4" />
                            </button>

                            {/* Overlay Toggle */}
                            {currentScene?.masterplanOverlay && (
                                <button
                                    onClick={() => setShowOverlays(!showOverlays)}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        showOverlays ? "text-indigo-400 bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
                                    )}
                                    title="Plano superpuesto"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </button>
                            )}

                            <div className="w-px h-5 bg-white/10 mx-0.5" />

                            {/* Fullscreen */}
                            <button
                                onClick={() => viewerInstance.current?.toggleFullscreen()}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                                title="Pantalla completa"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-tour indicator */}
            <AnimatePresence>
                {isAutoTouring && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-brand-500 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold"
                    >
                        <SkipForward className="w-4 h-4 animate-pulse" />
                        Paseo guiado
                        <button onClick={stopAutoTour} className="ml-1 p-1 hover:bg-white/20 rounded">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .pnlm-hotspot-base {
                    /* Default style reset - we use custom HTML mostly now */
                }
                /* Custom Hotspot Container */
                .custom-hotspot-container {
                    width: 0 !important;
                    height: 0 !important;
                    overflow: visible !important;
                }
                
                /* LOT NUMBER MARKER */
                .hotspot-lot-marker {
                    background: white;
                    color: #0f172a;
                    font-weight: 800;
                    font-family: 'Inter', sans-serif;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border: 2px solid #0f172a;
                    transform: translate(-50%, -50%);
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    cursor: pointer;
                }
                .hotspot-lot-marker:hover {
                    transform: translate(-50%, -50%) scale(1.2);
                    z-index: 10;
                }

                /* STATUS MARKERS */
                .hotspot-status-marker {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    transform: translate(-50%, -50%);
                    cursor: pointer;
                }
                .hotspot-status-marker.available { /* Available - Green/Ecological */
                    background: #10b981;
                }
                .hotspot-status-marker.sold { /* Sold - Red */
                    background: #ef4444;
                }
                .hotspot-status-marker.scene {
                    background: #3b82f6;
                }

                /* BUBBLE PREVIEW MARKER */
                .hotspot-bubble-marker {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    border: 3px solid white;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    transform: translate(-50%, -50%);
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    cursor: pointer;
                    background: #1e293b;
                }
                .hotspot-bubble-marker img {
                    width: 100%;
                    height: 100%;
                    object-cover: cover;
                }
                .hotspot-bubble-marker:hover {
                    transform: translate(-50%, -50%) scale(1.4);
                    z-index: 50;
                    border-color: #3b82f6;
                }

                /* INFO & DEFAULT TOOLTIP */
                .custom-tooltip span {
                    visibility: hidden;
                    position: absolute;
                    border-radius: 8px;
                    background-color: rgba(15, 23, 42, 0.95);
                    color: #fff;
                    text-align: center;
                    padding: 6px 12px;
                    z-index: 1;
                    bottom: 140%;
                    left: 50%;
                    transform: translateX(-50%);
                    white-space: nowrap;
                    font-size: 13px;
                    font-weight: 500;
                    font-family: Inter, sans-serif;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                }
                .custom-tooltip:hover span {
                    visibility: visible;
                }
                
                /* PANNELLUM OVERRIDES */
                .pnlm-controls-container {
                    display: none !important;
                }
                .pnlm-panorama-info {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
