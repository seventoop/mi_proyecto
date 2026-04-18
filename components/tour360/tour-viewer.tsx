"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Script from "next/script";
import { cn } from "@/lib/utils";
import Viewer360LotesOverlay from "@/components/masterplan/viewer360-lotes-overlay";
import type { MasterplanUnit } from "@/lib/masterplan-store";
import type { SvgViewBox } from "@/lib/geo-projection";
import { getGeoOverlayViewerState } from "@/lib/tour-overlay";
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
    mode?: "geo-calibrated" | "manual";
    imageUrl?: string;
    imageKind?: "360" | "foto" | "panoramica";
    points?: { pitch: number; yaw: number }[];
    planCornersAbsolute?: { pitch: number; yaw: number }[];
    opacity?: number;
    isVisible: boolean;
    altitudM?: number;
    imageHeading?: number;
    latOffset?: number;
    lngOffset?: number;
    planRotation?: number;
    planScale?: number;
    planScaleX?: number;
    planScaleY?: number;
    pitchBias?: number;
    cameraRoll?: number;
    showLabels?: boolean;
    showPerimeter?: boolean;
    cleanMode?: boolean;
    transformLocked?: boolean;
    snapEnabled?: boolean;
    alignmentGuides?: boolean;
    flipX?: boolean;
    flipY?: boolean;
    selectedPlanId?: string;
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
    category?: string;
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
    overlayUnits?: MasterplanUnit[];
    overlayBounds?: [[number, number], [number, number]] | null;
    overlayRotation?: number;
    overlaySvgViewBox?: SvgViewBox | null;
}

function normalizeViewerScene(scene: Scene, index: number): Scene {
    return {
        ...scene,
        id: scene.id || `scene-${index}`,
        title: scene.title || `Escena ${index + 1}`,
        imageUrl: scene.imageUrl || "",
        hotspots: Array.isArray(scene.hotspots) ? scene.hotspots : [],
        polygons: Array.isArray(scene.polygons) ? scene.polygons : [],
        floatingLabels: Array.isArray(scene.floatingLabels) ? scene.floatingLabels : [],
    };
}


function PanoramicOverlay({
    viewer,
    viewerRef,
    currentScene,
    viewerReady,
    onPolygonClick,
    overlayUnits,
    overlayBounds,
    overlayRotation,
    overlaySvgViewBox,
}: {
    viewer: any;
    viewerRef: React.RefObject<HTMLDivElement>;
    currentScene: Scene | null;
    viewerReady: boolean;
    onPolygonClick?: (polygon: TourPolygon) => void;
    overlayUnits?: MasterplanUnit[];
    overlayBounds?: [[number, number], [number, number]] | null;
    overlayRotation?: number;
    overlaySvgViewBox?: SvgViewBox | null;
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

        if (typeof viewer.viewToContainerPoints === "function") {
            const pts = viewer.viewToContainerPoints(pitch, yaw);
            if (pts && Array.isArray(pts) && pts.length === 2 && !isNaN(pts[0]) && !isNaN(pts[1])) {
                return { x: pts[0], y: pts[1] };
            }
        }

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
            return `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
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
        if (!h) return null;
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
            {/* Virtual Tour Overlay (Lotes/Planos) */}
            {currentScene.masterplanOverlay?.isVisible &&
                currentScene.masterplanOverlay?.imageUrl &&
                overlayBounds && (() => {
                const overlay = getGeoOverlayViewerState(currentScene.masterplanOverlay);
                const baseLat = (overlayBounds[0][0] + overlayBounds[1][0]) / 2;
                const baseLng = (overlayBounds[0][1] + overlayBounds[1][1]) / 2;
                const cosLat = Math.cos((baseLat * Math.PI) / 180) || 1;
                const camLat = baseLat + (overlay.latOffset || 0) / 111320;
                const camLng = baseLng + (overlay.lngOffset || 0) / (111320 * cosLat);

                return (
                    <Viewer360LotesOverlay
                        viewer={viewer}
                        units={overlayUnits || []}
                        overlayImageUrl={currentScene.masterplanOverlay?.imageUrl}
                        overlayBounds={overlayBounds}
                        overlayRotation={overlayRotation ?? 0}
                        svgViewBox={overlaySvgViewBox || { x: 0, y: 0, w: 1000, h: 1000 }}
                        camLat={camLat}
                        camLng={camLng}
                        camAlt={overlay.altitudM}
                        imageHeading={overlay.imageHeading}
                        latOffset={overlay.latOffset}
                        lngOffset={overlay.lngOffset}
                        planRotation={overlay.planRotation}
                        planScale={overlay.planScale}
                        planScaleX={overlay.planScaleX}
                        planScaleY={overlay.planScaleY}
                        planCornerAdjustments={overlay.planCornerAdjustments}
                        planCornersAbsolute={overlay.planCornersAbsolute}
                        mode={overlay.mode}
                        pitchBias={overlay.pitchBias}
                        cameraRoll={overlay.cameraRoll}
                        opacity={overlay.opacity}
                        showLabels={overlay.showLabels}
                        showPerimeter={overlay.showPerimeter}
                        cleanMode={overlay.cleanMode}
                        transformLocked={overlay.transformLocked}
                        alignmentGuides={overlay.alignmentGuides}
                        flipX={overlay.flipX}
                        flipY={overlay.flipY}
                        isEditing={false}
                    />
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
    overlayUnits = [],
    overlayBounds = null,
    overlayRotation = 0,
    overlaySvgViewBox = null,
}: TourViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
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

    const normalizedScenes = useMemo(
        () =>
            (Array.isArray(scenes) ? scenes : [])
                .map(normalizeViewerScene)
                .filter((scene) => !!scene.imageUrl),
        [scenes]
    );

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

    const [dynamicScenes, setDynamicScenes] = useState<Scene[]>(normalizedScenes);

    useEffect(() => {
        setDynamicScenes(normalizedScenes);
    }, [normalizedScenes]);

    const startScene = initialSceneId
        ? dynamicScenes.find((s) => s.id === initialSceneId)
        : dynamicScenes.find((s) => s.isDefault) || dynamicScenes[0];

    const currentScene = dynamicScenes.find((s) => s.id === currentSceneId) || startScene || null;

    useEffect(() => {
        if (!window.pannellum || !viewerRef.current || !startScene || viewerInstance.current) return;
        initViewer(startScene.id);
    }, [isLoaded, startScene]);

    useEffect(() => {
        if (!proyectoId) return;
        try {
          const { pusherClient, CHANNELS, EVENTS } = require("@/lib/pusher");
          if (!pusherClient) return;
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
          });
          return () => { pusherClient.unsubscribe(CHANNELS.UNIDADES); };
        } catch (e) {}
    }, [proyectoId]);

    const initViewer = (firstSceneId: string) => {
        if (!viewerRef.current) return;

        try {
            const scenesConfig: any = {};
            dynamicScenes.forEach((scene) => {
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
                    compass: false,
                    mouseZoom: false,
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
            setError("Error al inicializar el visor.");
        }
    };

    const hotspotTooltip = (hotSpotDiv: HTMLElement, args: Hotspot) => {
        hotSpotDiv.classList.add("custom-hotspot-container");
        const currentEstado = (args.unidad as any)?.estado || "DISPONIBLE";

        switch (args.type) {
            case "lot":
                hotSpotDiv.innerHTML = `<div class="hotspot-lot-marker">${args.text}</div>`;
                break;
            case "check":
            case "sold":
            case "UNIT":
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

    const goToScene = (sceneId: string) => {
        if (viewerInstance.current) {
            viewerInstance.current.loadScene(sceneId);
        }
    };

    const goNext = () => {
        const idx = dynamicScenes.findIndex((s) => s.id === currentSceneId);
        if (idx < dynamicScenes.length - 1) goToScene(dynamicScenes[idx + 1].id);
        else goToScene(dynamicScenes[0].id);
    };

    const goPrev = () => {
        const idx = dynamicScenes.findIndex((s) => s.id === currentSceneId);
        if (idx > 0) goToScene(dynamicScenes[idx - 1].id);
        else goToScene(dynamicScenes[dynamicScenes.length - 1].id);
    };

    const startAutoTour = () => {
        setIsAutoTouring(true);
        viewerInstance.current?.startAutoRotate(2);
        autoTourTimer.current = setInterval(() => { goNext(); }, 8000);
    };

    const stopAutoTour = () => {
        setIsAutoTouring(false);
        viewerInstance.current?.stopAutoRotate();
        if (autoTourTimer.current) { clearInterval(autoTourTimer.current); autoTourTimer.current = null; }
    };

    useEffect(() => {
        const el = viewerRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => {
            if (!viewerInstance.current) return;
            e.preventDefault();
            e.stopPropagation();
            const currentFov = viewerInstance.current.getHfov();
            const delta = e.deltaY > 0 ? 5 : -5;
            viewerInstance.current.setHfov(currentFov + delta);
        };
        el.addEventListener("wheel", handleWheel as any, { capture: true, passive: false });
        return () => el.removeEventListener("wheel", handleWheel as any, { capture: true } as any);
    }, []);

    const togglePlay = () => {
        if (!viewerInstance.current) return;
        if (isPlaying) viewerInstance.current.stopAutoRotate();
        else viewerInstance.current.startAutoRotate(2);
        setIsPlaying(!isPlaying);
    };

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

            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-white z-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <span className="ml-3 font-medium">Cargando motor 360°...</span>
                </div>
            )}

            <div ref={viewerRef} id="panoramaControl" className="w-full h-full" />

            {viewerReady && (
                <PanoramicOverlay
                    viewer={viewerInstance.current}
                    viewerRef={viewerRef}
                    currentScene={currentScene}
                    viewerReady={viewerReady}
                    onPolygonClick={onPolygonClick}
                    overlayUnits={overlayUnits}
                    overlayBounds={overlayBounds}
                    overlayRotation={overlayRotation}
                    overlaySvgViewBox={overlaySvgViewBox}
                />
            )}

            {/* Controls and Overlays UI (Simplified for brevity) */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <button onClick={goPrev} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronLeft/></button>
                <button onClick={goNext} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronRight/></button>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                <button onClick={togglePlay} className="text-white">{isPlaying ? <Pause/> : <Play/>}</button>
                <div className="h-4 w-px bg-white/20mx-1" />
                <button onClick={() => setShowOverlays(!showOverlays)} className={cn("text-white", !showOverlays && "opacity-50")}>
                    <ImageIcon size={18}/>
                </button>
            </div>
        </div>
    );
}
