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

const SCRIPT_LOAD_TIMEOUT_MS = 12000;
const VIEWER_INIT_TIMEOUT_MS = 15000;

export type HotspotType = "info" | "scene" | "link" | "lot" | "check" | "sold" | "gallery" | "video" | "UNIT";

export interface Hotspot {
    id: string;
    type: HotspotType;
    pitch: number;
    yaw: number;
    text: string;
    unidadId?: string; // Unified with creator
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
    planCornersAbsolute: { pitch: number; yaw: number }[]; // Non-optional for consistency
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
    planCornerAdjustments?: any[];
    marks?: any[];
    canvasState?: any;
    // Added fields unified with creator
    direction?: SceneDirection;
    assetVersion?: "original" | "edited";
    originalSceneId?: string;
    hasOverlayEdits?: boolean;
    sceneKey?: string;
}

export type SceneDirection = "centro" | "norte" | "noreste" | "este" | "sureste" | "sur" | "suroeste" | "oeste" | "noroeste";

export interface Scene {
    id: string;
    title: string;
    imageUrl: string;
    processedImageUrl?: string;
    thumbnailUrl?: string;
    hotspots: Hotspot[];
    polygons?: TourPolygon[];
    floatingLabels?: FloatingLabel[];
    isDefault?: boolean;
    order?: number;
    category?: "tour360" | "render" | "real" | "avance" | "raw" | "rendered";
    direction?: SceneDirection; // Added field
    masterplanOverlay?: MasterplanOverlay;
    galleryImageId?: string;
    sceneKey?: string;
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
    onNavigate,
    allScenes,
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
    onNavigate?: (sceneId: string) => void;
    allScenes?: Scene[];
}) {
    const [viewState, setViewState] = useState({ hfov: 100, pitch: 0, yaw: 0, width: 0, height: 0 });

    useEffect(() => {
        if (!viewer || !viewerRef.current) return;
        let rafId: number;
        let isMounted = true;

        const update = () => {
            if (!isMounted || !viewer || !viewerRef.current) return;
            
            try {
                // Verificar que el visor esté inicializado y tenga los métodos necesarios
                if (typeof viewer.getHfov === 'function') {
                    const hfov = viewer.getHfov();
                    const pitch = viewer.getPitch();
                    const yaw = viewer.getYaw();
                    const width = viewerRef.current.clientWidth || 0;
                    const height = viewerRef.current.clientHeight || 0;

                    // Evitar actualizaciones con valores inválidos que rompan el renderizado
                    if (!isNaN(hfov) && !isNaN(pitch) && !isNaN(yaw) && width > 0 && height > 0) {
                        setViewState({ hfov, pitch, yaw, width, height });
                    }
                }
            } catch (e) {
                console.warn("[TourViewer] Error updating view state:", e);
            }
            
            if (isMounted) {
                rafId = requestAnimationFrame(update);
            }
        };

        rafId = requestAnimationFrame(update);
        
        return () => {
            isMounted = false;
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [viewer]);

    const projectCoords = useCallback((pitch: number, yaw: number) => {
        if (!viewer || !viewerRef.current) return null;

        // 1. Try native Pannellum projection (pixel-perfect)
        if (typeof viewer.viewToContainerPoints === "function") {
            try {
                const pts = viewer.viewToContainerPoints(pitch, yaw);
                if (pts && Array.isArray(pts) && pts.length === 2 && !isNaN(pts[0]) && !isNaN(pts[1])) {
                    return { x: pts[0], y: pts[1] };
                }
            } catch (e) { }
        }

        // 2. Fallback to robust world-to-screen projection math (matches Tour360SceneCanvas)
        // Usar dimensiones del estado si están listas, si no leer del DOM (primer render)
        const width = viewState.width || viewerRef.current.clientWidth;
        const height = viewState.height || viewerRef.current.clientHeight;
        if (width <= 0 || height <= 0) return null;

        const degToRad = Math.PI / 180;
        const p = pitch * degToRad;
        const y = yaw * degToRad;
        const vp = viewState.pitch * degToRad;
        const vy = viewState.yaw * degToRad;

        const vx = Math.cos(p) * Math.sin(y);
        const vyVec = Math.sin(p);
        const vz = Math.cos(p) * Math.cos(y);

        const s_y = Math.sin(vy);
        const c_y = Math.cos(vy);
        const rx = vx * c_y - vz * s_y;
        const rzTemp = vx * s_y + vz * c_y;

        const s_p = Math.sin(vp);
        const c_p = Math.cos(vp);
        const ry = vyVec * c_p - rzTemp * s_p;
        const rz = vyVec * s_p + rzTemp * c_p;

        if (rz <= 0) return null;

        const focalLength = (width / 2) / Math.tan((viewState.hfov * degToRad) / 2);

        const px = (rx / rz) * focalLength + width / 2;
        const py = (-ry / rz) * focalLength + height / 2;

        if (!isFinite(px) || !isFinite(py)) return null;

        return { x: px, y: py };
    }, [viewer, viewState]);

    const getPolygonPath = (points: { pitch: number; yaw: number }[]) => {
        const coords = points.map(p => projectCoords(p.pitch, p.yaw));
        return coords.map((c, i) => {
            if (!c) return "";
            return `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
        }).join(" ") + " Z";
    };

    const getHfovScale = useCallback((anchorHfov?: number) => {
        if (!viewState.hfov || !anchorHfov) return 1;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const current = Math.tan(toRad(viewState.hfov) / 2);
        const reference = Math.tan(toRad(anchorHfov) / 2);
        if (current <= 0 || reference <= 0) return 1;
        return reference / current;
    }, [viewState.hfov]);

    const handleObjectClick = (obj: any) => {
        console.log(`[TourViewer] handleObjectClick:`, obj.id, {
            targetId: obj.targetSceneId,
            targetKey: obj.targetSceneKey
        });

        if (!onNavigate || !allScenes) {
            console.warn(`[TourViewer] onNavigate or allScenes missing`);
            return;
        }

        const targetKey = obj.targetSceneKey;
        const targetId = obj.targetSceneId;
        let matchedScene: Scene | undefined = undefined;

        // 1. Prioridad: Scene Key (como en el Editor)
        if (targetKey) {
            matchedScene = allScenes.find(s =>
                s.sceneKey === targetKey ||
                (s.masterplanOverlay as any)?.sceneKey === targetKey
            );
            if (matchedScene) console.log(`[TourViewer] Matched by Key: ${matchedScene.id}`);
        }

        // 2. Resolver por ID (TourScene ID o Gallery ID)
        if (!matchedScene && targetId) {
            matchedScene = allScenes.find(s =>
                s.id === targetId ||
                s.galleryImageId === targetId ||
                (s.masterplanOverlay as any)?.galleryImageId === targetId
            );
            if (matchedScene) console.log(`[TourViewer] Matched by ID: ${matchedScene.id}`);
        }

        // 3. Fallback: Resolución por Imagen (URL)
        if (!matchedScene) {
            const targetUrl = obj.previewUrl || obj.imageUrl;
            if (targetUrl) {
                const norm = (u: string) => u.startsWith('/') ? u : '/' + u;
                const normalizedTarget = norm(targetUrl);
                matchedScene = allScenes.find(s =>
                    norm(s.imageUrl) === normalizedTarget ||
                    (s.thumbnailUrl && norm(s.thumbnailUrl) === normalizedTarget)
                );
                if (matchedScene) console.log(`[TourViewer] Matched by URL: ${matchedScene.id}`);
            }
        }

        // Navegar
        if (matchedScene) {
            console.log(`[TourViewer] Navigating to: ${matchedScene.id}`);
            onNavigate(matchedScene.id);
        } else {
            console.warn(`[TourViewer] No se pudo resolver destino para el portal:`, obj.id, { targetId, targetKey });
        }
    };

    if (!viewerReady || !currentScene) return null;

    const canvasState = (currentScene.masterplanOverlay as any)?.canvasState || {};

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

            {/* SVG Layer for Polygons, Lines, Arrows and Freehand */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="white" />
                    </marker>
                </defs>

                {/* Legacy Polygons */}
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

                {/* Freehand Strokes from canvasState */}
                {canvasState.freehandStrokes?.map((stroke: any) => {
                    const d = stroke.points?.map((p: any, i: number) => {
                        const c = projectCoords(p.pitch, p.yaw);
                        if (!c) return "";
                        return `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
                    }).join(" ");
                    if (!d) return null;

                    return (
                        <path
                            key={stroke.id}
                            d={stroke.type === 'polygon' ? d + " Z" : d}
                            fill={stroke.type === 'polygon' ? (stroke.color ? `${stroke.color}66` : "rgba(34, 197, 94, 0.4)") : "none"}
                            stroke={stroke.color || "white"}
                            strokeWidth={stroke.strokeWidth || 3}
                            className="opacity-70"
                        />
                    );
                })}

                {/* Anchored Lines and Arrows from canvasState */}
                {canvasState.anchoredLines?.map((line: any) => {
                    const p1 = projectCoords(line.pitch1, line.yaw1);
                    const p2 = projectCoords(line.pitch2, line.yaw2);
                    if (!p1 || !p2) return null;

                    return (
                        <line
                            key={line.id}
                            x1={p1.x} y1={p1.y}
                            x2={p2.x} y2={p2.y}
                            stroke={line.color || "white"}
                            strokeWidth={line.strokeWidth || 2}
                            strokeDasharray={line.type === 'dashed' ? "4 2" : undefined}
                            markerEnd={line.type === 'arrow' ? "url(#arrowhead)" : undefined}
                            opacity={0.8}
                        />
                    );
                })}

                {/* Leader Lines for Legacy Landmarks */}
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

            {canvasState.anchoredFrames?.map((frame: any) => {
                const c = projectCoords(frame.pitch, frame.yaw);
                if (!c) return null;
                const scale = getHfovScale(frame.anchorHfov);
                const w = (frame.width || 100) * scale;
                const h = (frame.height || 100) * scale;

                const hasDestination = !!(frame.targetSceneId || frame.targetSceneKey || frame.previewUrl);

                return (
                    <button
                        key={frame.id}
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (hasDestination) handleObjectClick(frame);
                        }}
                        className={cn(
                            "absolute group z-20 outline-none border-none p-0 bg-transparent will-change-transform",
                            hasDestination ? "pointer-events-auto cursor-pointer" : "pointer-events-none"
                        )}
                        style={{
                            left: c.x,
                            top: c.y,
                            width: w,
                            height: h,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <div className={cn(
                            "w-full h-full border-2 border-white/50 bg-black/20 backdrop-blur-[2px] shadow-xl overflow-hidden",
                            frame.type === 'circle' ? "rounded-full" : "rounded-xl"
                        )}>
                            {frame.previewUrl && (
                                <img src={frame.previewUrl} className="w-full h-full object-cover opacity-80" alt="Preview" />
                            )}

                            {/* Visual cue for navigation - matches editor style */}
                            {hasDestination && (
                                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-brand-500 text-white shadow-lg border border-white/20">
                                    <Play size={10} fill="currentColor" />
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}

            {/* Anchored POI Badges from canvasState */}
            {canvasState.anchoredPoiBadges?.map((badge: any) => {
                const c = projectCoords(badge.pitch, badge.yaw);
                if (!c) return null;
                const scale = getHfovScale(badge.anchorHfov);

                return (
                    <div
                        key={badge.id}
                        className="absolute flex flex-col items-center pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-30 will-change-transform"
                        style={{ left: c.x, top: c.y, scale: String(scale) }}
                    >
                        <div className={cn(
                            "p-2 rounded-full shadow-lg border-2 border-white pointer-events-auto",
                            badge.color ? `bg-[${badge.color}]` : "bg-brand-500"
                        )}
                        style={{ backgroundColor: badge.color }}
                        >
                            {badge.imageUrl ? (
                                <img src={badge.imageUrl} className="w-6 h-6 object-contain invert" alt="" />
                            ) : (
                                <MapPin className="w-5 h-5 text-white" />
                            )}
                        </div>
                        {badge.title && (
                            <div className="mt-1 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/20 whitespace-nowrap">
                                {badge.title}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Anchored Texts from canvasState */}
            {canvasState.anchoredTexts?.map((t: any) => {
                const c = projectCoords(t.pitch, t.yaw);
                if (!c) return null;
                const scale = getHfovScale(t.anchorHfov);

                return (
                    <div
                        key={t.id}
                        className="absolute px-3 py-1 rounded-full text-[12px] font-bold text-white shadow-lg pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-900/80 border border-white/20 backdrop-blur-md will-change-transform"
                        style={{ left: c.x, top: c.y, scale: String(scale) }}
                    >
                        {t.text}
                    </div>
                );
            })}

            {/* Legacy Floating Labels */}
            {currentScene.floatingLabels?.map(label => {
                const coords = projectCoords(label.pitch, label.yaw);
                if (!coords) return null;
                return (
                    <div
                        key={label.id}
                        className={cn(
                            "absolute px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg pointer-events-auto z-20 will-change-transform",
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
    const [scriptAttempt, setScriptAttempt] = useState(0);
    const [viewerInitAttempt, setViewerInitAttempt] = useState(0);
    const [isAutoTouring, setIsAutoTouring] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showRadar, setShowRadar] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);
    const autoTourTimer = useRef<NodeJS.Timeout | null>(null);

    const normalizedScenes = useMemo(
        () =>
            (Array.isArray(scenes) ? scenes : [])
                .map(normalizeViewerScene)
                .filter((scene) => !!scene.imageUrl),
        [scenes]
    );

    const [dynamicScenes, setDynamicScenes] = useState<Scene[]>(normalizedScenes);

    useEffect(() => {
        setDynamicScenes(normalizedScenes);
    }, [normalizedScenes]);

    const startScene = initialSceneId
        ? dynamicScenes.find((s) => s.id === initialSceneId)
        : dynamicScenes.find((s) => s.isDefault) || dynamicScenes[0];

    const currentScene = dynamicScenes.find((s) => s.id === currentSceneId) || startScene || null;

    useEffect(() => {
        if (error || !isLoaded) return;
        if (!startScene) {
            setError("No hay escenas válidas para mostrar en el tour.");
            return;
        }
        if (!window.pannellum || !viewerRef.current || viewerInstance.current) return;
        initViewer(startScene.id);
    }, [error, isLoaded, startScene, scriptAttempt]);

    useEffect(() => {
        if (isLoaded || error) return;

        const timeoutId = window.setTimeout(() => {
            setError("No se pudo cargar el motor 360°. Revisá tu conexión e intentá nuevamente.");
        }, SCRIPT_LOAD_TIMEOUT_MS);

        return () => window.clearTimeout(timeoutId);
    }, [isLoaded, error, scriptAttempt]);

    useEffect(() => {
        if (viewerInitAttempt === 0 || viewerReady || error) return;

        const timeoutId = window.setTimeout(() => {
            if (viewerInstance.current) {
                try {
                    viewerInstance.current.destroy();
                } catch (_) { }
                viewerInstance.current = null;
            }
            setViewerReady(false);
            setError("No se pudo iniciar el tour 360°.");
        }, VIEWER_INIT_TIMEOUT_MS);

        return () => window.clearTimeout(timeoutId);
    }, [viewerInitAttempt, viewerReady, error]);

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
        } catch (e) { }
    }, [proyectoId]);

    const initViewer = (firstSceneId: string) => {
        if (!viewerRef.current) return;

        try {
            setError(null);
            setViewerReady(false);
            setViewerInitAttempt((prev) => prev + 1);
            const scenesConfig: any = {};
            dynamicScenes.forEach((scene) => {
                scenesConfig[scene.id] = {
                    title: scene.title,
                    type: "equirectangular",
                    panorama: scene.processedImageUrl || scene.imageUrl,
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
                    crossOrigin: "anonymous", // Crucial para imágenes en S3/CDN
                },
                scenes: scenesConfig,
            });

            viewerInstance.current.on("scenechange", (sceneId: string) => {
                console.log(`[TourViewer] Pannellum scenechange event: ${sceneId}`);
                setCurrentSceneId(sceneId);
                onSceneChange?.(sceneId);
            });

            viewerInstance.current.on("error", () => {
                setError("Error al cargar la imagen 360°.");
                setViewerReady(false);
            });

            viewerInstance.current.on("load", () => {
                setViewerReady(true);
                setError(null);
            });

            setCurrentSceneId(firstSceneId);
        } catch (err) {
            setError("Error al inicializar el visor.");
            setViewerReady(false);
        }
    };

    const retryViewerLoad = () => {
        if (viewerInstance.current) {
            try {
                viewerInstance.current.destroy();
            } catch (_) { }
            viewerInstance.current = null;
        }

        setError(null);
        setViewerReady(false);
        setCurrentSceneId(null);

        if (window.pannellum) {
            setIsLoaded(true);
            setScriptAttempt((prev) => prev + 1);
            return;
        }

        setIsLoaded(false);
        setScriptAttempt((prev) => prev + 1);
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
        console.log(`[TourViewer] Main goToScene called with: ${sceneId}`);
        if (viewerInstance.current) {
            viewerInstance.current.loadScene(sceneId);

            // Forzar actualización de estado inmediata para sincronizar UI de React
            // Esto ayuda si el evento scenechange de Pannellum tarda o no se dispara
            setCurrentSceneId(sceneId);
            if (onSceneChange) onSceneChange(sceneId);
        } else {
            console.warn(`[TourViewer] Cannot goToScene: viewerInstance.current is null`);
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

    return (
        <div ref={containerRef} className={cn("relative bg-slate-900 overflow-hidden group", className)}>
            <Script
                src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
                onLoad={() => setIsLoaded(true)}
                onError={() => setError("Error al cargar Pannellum.")}
            />
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
            />

            {(!isLoaded || !viewerReady) && !error && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-brand-500 mb-4" />
                        <p className="text-white font-medium animate-pulse">Cargando experiencia 360°...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900 px-6">
                    <div className="flex max-w-md flex-col items-center text-center">
                        <X className="mb-4 h-8 w-8 text-rose-400" />
                        <p className="text-lg font-semibold">{error}</p>
                        <button
                            onClick={retryViewerLoad}
                            className="mt-5 rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-600"
                        >
                            Reintentar
                        </button>
                    </div>
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
                    onNavigate={goToScene}
                    allScenes={dynamicScenes}
                />
            )}

            {showControls && viewerReady && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all hover:bg-slate-900">
                    <button
                        onClick={goPrev}
                        className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
                        title="Anterior"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1" />

                    <button
                        onClick={togglePlay}
                        className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
                        title={isPlaying ? "Pausar" : "Giro Automático"}
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    {showAutoTour && (
                        <button
                            onClick={() => (isAutoTouring ? stopAutoTour() : startAutoTour())}
                            className={cn(
                                "p-3 rounded-xl transition-all flex items-center gap-2",
                                isAutoTouring ? "bg-brand-500 text-white" : "text-white hover:bg-white/10"
                            )}
                            title="Modo Tour"
                        >
                            {isAutoTouring ? (
                                <SkipForward className="w-5 h-5 animate-pulse" />
                            ) : (
                                <Rotate3D className="w-5 h-5" />
                            )}
                        </button>
                    )}

                    <div className="h-6 w-px bg-white/10 mx-1" />

                    <button
                        onClick={goNext}
                        className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
                        title="Siguiente"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1" />

                    <button
                        onClick={() => setShowRadar(!showRadar)}
                        className={cn(
                            "p-3 rounded-xl transition-all",
                            showRadar ? "text-brand-400 bg-brand-500/10" : "text-white hover:bg-white/10"
                        )}
                        title="Radar"
                    >
                        <Radar className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className={cn(
                            "p-3 rounded-xl transition-all",
                            showOverlays ? "text-brand-400 bg-brand-500/10" : "text-white hover:bg-white/10"
                        )}
                        title="Capas"
                    >
                        <Layers className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function Rotate3D(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3.6 9h16.8" />
            <path d="M3.6 15h16.8" />
            <path d="M11.5 3L11.5 21" />
            <path d="M11.5 3C7 3 3.5 7 3.5 12C3.5 17 7 21 11.5 21" />
            <path d="M11.5 3C16 3 19.5 7 19.5 12C19.5 17 16 21 11.5 21" />
        </svg>
    );
}

function Radar(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19.07 4.93a10 10 0 0 0-14.14 0" />
            <path d="M16.24 7.76a6 6 0 0 0-8.48 0" />
            <path d="M12 12v.01" />
            <path d="M12 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z" />
            <path d="M12 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2Z" />
            <path d="M12 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Z" />
            <path d="M12 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2Z" />
        </svg>
    );
}

function Layers(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
            <path d="m2.6 12.08 8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9" />
            <path d="m2.6 17.08 8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9" />
        </svg>
    );
}
