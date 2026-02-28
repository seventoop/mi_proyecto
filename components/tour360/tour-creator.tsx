"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload, Trash2, Save, MapPin, ImageIcon,
    Plus, X, Loader2, GripVertical, Pencil, Check,
    Link2, Navigation, Eye, Share2, Play, Pause,
    Maximize2, RotateCcw, Camera, Grid3x3, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import Script from "next/script";

// ─── Types ───
export type HotspotType = "info" | "scene" | "link" | "lot" | "check" | "sold" | "gallery" | "video";

export interface Hotspot {
    id: string;
    type: HotspotType;
    pitch: number;
    yaw: number;
    text: string;
    unidadId: string; // Mandatory for STP-TOUR360-PRO
    targetSceneId?: string;
    targetUrl?: string;
    targetThumbnail?: string;
    icon?: string;
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
    points: { pitch: number; yaw: number }[]; // 4 points
    opacity: number;
    isVisible: boolean;
}

export interface Scene {
    id: string;
    title: string;
    imageUrl: string;
    thumbnailUrl?: string; // Kept for future use
    hotspots: Hotspot[];
    polygons?: TourPolygon[];
    floatingLabels?: FloatingLabel[];
    isDefault?: boolean;
    order?: number;
    category?: 'raw' | 'rendered';
    masterplanOverlay?: MasterplanOverlay;
}

interface UploadProgress {
    id: string;
    filename: string;
    progress: number;
    status: "uploading" | "done" | "error";
    url?: string;
}

interface TourCreatorProps {
    proyectoId: string;
    tourId?: string; // Optional for delete action
    initialScenes?: Scene[];
    onSave: (scenes: Scene[]) => void;
    onDelete?: () => void; // Callback for delete
}

// ─── Hotspot icon options ───
const HOTSPOT_ICONS: { value: string; label: string; emoji: string }[] = [
    { value: "info", label: "Info", emoji: "ℹ️" },
    { value: "lot", label: "Lote N°", emoji: "🔢" },
    { value: "check", label: "Disponible", emoji: "✅" },
    { value: "sold", label: "Vendido", emoji: "🔴" },
    { value: "arrow", label: "Flecha", emoji: "➡️" },
    { value: "house", label: "Casa", emoji: "🏠" },
    { value: "tree", label: "Amenity", emoji: "🌳" },
    { value: "camera", label: "Foto", emoji: "📷" },
];


interface PanoramicOverlayProps {
    viewer: any;
    viewerRef: React.RefObject<HTMLDivElement>;
    activeScene: Scene | null;
    editorMode: string;
    mouseCoords: { pitch: number; yaw: number } | null;
    draggingHotspotId: string | null;
    setDraggingHotspotId: (id: string | null) => void;
    draggingLabelId: string | null;
    setDraggingLabelId: (id: string | null) => void;
    pendingLandmarkAnchor: { pitch: number; yaw: number } | null;
    pendingOverlayPoints: { pitch: number; yaw: number }[];
    currentPolygonPoints: { pitch: number; yaw: number }[];
    viewerReady: boolean;
}

function PanoramicOverlay({
    viewer,
    viewerRef,
    activeScene,
    editorMode,
    mouseCoords,
    draggingHotspotId,
    setDraggingHotspotId,
    draggingLabelId,
    setDraggingLabelId,
    pendingLandmarkAnchor,
    pendingOverlayPoints,
    currentPolygonPoints,
    viewerReady
}: PanoramicOverlayProps) {
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

    if (!viewerReady || !activeScene) return null;

    return (
        <>
            {/* Perspective Masterplan Overlay */}
            {activeScene.masterplanOverlay?.isVisible && (() => {
                const overlay = activeScene.masterplanOverlay;
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

            {/* SVG Overlay for Polygons & Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                {/* Polygons */}
                {activeScene.polygons?.map(poly => (
                    <path
                        key={poly.id}
                        d={getPolygonPath(poly.points)}
                        fill={poly.fillColor || "rgba(16, 185, 129, 0.4)"}
                        stroke={poly.strokeColor || "white"}
                        strokeWidth={2}
                        className="opacity-70"
                    />
                ))}

                {/* Current drawing polygon */}
                {editorMode === 'polygon' && currentPolygonPoints.length > 0 && (
                    <>
                        <path
                            d={getPolygonPath([...currentPolygonPoints])}
                            fill="rgba(59, 130, 246, 0.3)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                        />
                        {currentPolygonPoints.map((p, i) => {
                            const c = projectCoords(p.pitch, p.yaw);
                            return c ? <circle key={i} cx={c.x} cy={c.y} r={4} fill="#3b82f6" /> : null;
                        })}
                    </>
                )}

                {/* Leader Lines for Landmarks */}
                {activeScene.floatingLabels?.filter(l => l.style === 'landmark' && l.anchorPitch !== undefined).map(label => {
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

                {/* Interaction Points for Hotspots (Dragging) */}
                {activeScene.hotspots.map(hs => {
                    const c = projectCoords(hs.pitch, hs.yaw);
                    if (!c) return null;
                    return (
                        <circle
                            key={`drag-${hs.id}`}
                            cx={c.x} cy={c.y} r={14}
                            fill={draggingHotspotId === hs.id ? "rgba(59, 130, 246, 0.4)" : "transparent"}
                            stroke={draggingHotspotId === hs.id ? "#3b82f6" : "rgba(255,255,255,0.1)"}
                            strokeWidth={2}
                            strokeDasharray={draggingHotspotId === hs.id ? "none" : "2 2"}
                            className="cursor-move pointer-events-auto hover:stroke-brand-400"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingHotspotId(hs.id);
                            }}
                        >
                            <title>Arrastrar para mover</title>
                        </circle>
                    );
                })}

                {/* Interaction Points for Labels (Dragging) */}
                {activeScene.floatingLabels?.map(lbl => {
                    const c = projectCoords(lbl.pitch, lbl.yaw);
                    if (!c) return null;
                    return (
                        <rect
                            key={`drag-lbl-${lbl.id}`}
                            x={c.x - 40} y={c.y - 12} width={80} height={24} rx={12}
                            fill={draggingLabelId === lbl.id ? "rgba(59, 130, 246, 0.2)" : "transparent"}
                            stroke={draggingLabelId === lbl.id ? "#3b82f6" : "transparent"}
                            strokeWidth={2}
                            className="cursor-move pointer-events-auto"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingLabelId(lbl.id);
                            }}
                        />
                    );
                })}

                {/* Ghost Previews for new placements */}
                {mouseCoords && !draggingHotspotId && !draggingLabelId && (
                    <g opacity={0.7} className="pointer-events-none">
                        {(() => {
                            const c = projectCoords(mouseCoords.pitch, mouseCoords.yaw);
                            if (!c) return null;

                            if (editorMode === 'hotspot') {
                                return (
                                    <g>
                                        <circle cx={c.x} cy={c.y} r={16} fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" />
                                        <text x={c.x} y={c.y} dy=".3em" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">+</text>
                                    </g>
                                );
                            }

                            if (editorMode === 'label' && !pendingLandmarkAnchor) {
                                return (
                                    <g transform={`translate(${c.x}, ${c.y})`}>
                                        <rect x="-40" y="-12" width="80" height="24" rx="12" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" />
                                        <text y="4" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">Nueva Etiqueta</text>
                                    </g>
                                );
                            }

                            return null;
                        })()}
                    </g>
                )}

                {/* Pending Landmark Line */}
                {pendingLandmarkAnchor && editorMode === 'label' && mouseCoords && (
                    <g>
                        {(() => {
                            const p1 = projectCoords(pendingLandmarkAnchor.pitch, pendingLandmarkAnchor.yaw);
                            const p2 = projectCoords(mouseCoords.pitch, mouseCoords.yaw);
                            if (!p1 || !p2) return null;
                            return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" />;
                        })()}
                    </g>
                )}

                {/* Pending Overlay Points */}
                {editorMode === 'overlay' && pendingOverlayPoints.map((p, i) => {
                    const c = projectCoords(p.pitch, p.yaw);
                    return c ? (
                        <g key={`pending-ov-${i}`}>
                            <circle cx={c.x} cy={c.y} r={6} fill="white" stroke="#3b82f6" strokeWidth={2} />
                            <text x={c.x} y={c.y} dy=".3em" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold">{i + 1}</text>
                        </g>
                    ) : null;
                })}
            </svg>

            {/* Floating Labels Layer */}
            {activeScene.floatingLabels?.map(label => {
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

export default function TourCreator({
    proyectoId,
    tourId,
    initialScenes = [],
    onSave,
    onDelete,
}: TourCreatorProps) {
    const [scenes, setScenes] = useState<Scene[]>(initialScenes);
    const [activeSceneId, setActiveSceneId] = useState<string | null>(
        initialScenes[0]?.id || null
    );
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isPlacingHotspot, setIsPlacingHotspot] = useState(false);
    const [editingTitle, setEditingTitle] = useState<string | null>(null);
    const [editTitleValue, setEditTitleValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pannellumLoaded, setPannellumLoaded] = useState(false);
    const [viewerReady, setViewerReady] = useState(false);
    const [hotspotMode, setHotspotMode] = useState<HotspotType>("info");
    const [linkTargetScene, setLinkTargetScene] = useState<string>("");

    // Start with "view" mode, can switch to 'hotspot', 'polygon', 'label', 'overlay'
    const [editorMode, setEditorMode] = useState<'view' | 'hotspot' | 'polygon' | 'label' | 'overlay'>('view');

    // Polygon Editor State
    const [currentPolygonPoints, setCurrentPolygonPoints] = useState<PolygonPoint[]>([]);
    const [polygonProperties, setPolygonProperties] = useState<{ hoverText: string, linkedUnitId: string }>({ hoverText: "", linkedUnitId: "" });

    // Gallery Tabs
    const [activeTab, setActiveTab] = useState<'raw' | 'rendered'>('raw');

    // Mouse tracking for ghost hotspot & dragging
    const [mouseCoords, setMouseCoords] = useState<{ pitch: number, yaw: number } | null>(null);
    const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(null);
    const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
    const [lastDragTime, setLastDragTime] = useState(0);
    const [projectUnits, setProjectUnits] = useState<{ id: string, numero: string }[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<string>("");

    // Landmark Placement State
    const [pendingLandmarkAnchor, setPendingLandmarkAnchor] = useState<{ pitch: number, yaw: number } | null>(null);

    // Overlay Alignment State
    const [pendingOverlayPoints, setPendingOverlayPoints] = useState<{ pitch: number, yaw: number }[]>([]);

    const [isUpscaling, setIsUpscaling] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    const viewerRef = useRef<HTMLDivElement>(null);
    const viewerInstance = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeScene = scenes.find((s) => s.id === activeSceneId) || null;

    // Filter scenes by category (default to 'raw' if undefined for backward compatibility)
    const filteredScenes = scenes.filter(s => (s.category || 'raw') === activeTab);

    // ─── Upscale Handler ───
    const handleUpscale = async (scene: Scene) => {
        if (!scene.imageUrl) return;

        setIsUpscaling(true);
        try {
            // Validate image URL availability first
            const checkRes = await fetch(scene.imageUrl, { method: "HEAD" });
            if (!checkRes.ok) throw new Error("La imagen original no es accesible");

            const enhancedImageSrc = await upscaleImageClientSide(scene.imageUrl, (msg) => {
                console.log(msg);
            });

            if (!enhancedImageSrc) throw new Error("Falló el procesamiento de la imagen");

            // Create new scene for the rendered version
            const newScene: Scene = {
                ...scene,
                id: `scene-${Date.now()}-ai`,
                title: `${scene.title} (Mejorada)`,
                imageUrl: enhancedImageSrc,
                category: 'rendered',
                isDefault: false,
            };

            setScenes((prev) => [...prev, newScene]);
            setActiveTab('rendered'); // Switch to rendered tab to show result

            alert("¡Imagen mejorada con éxito! Se ha creado una copia en la galería de Renderizadas.");
        } catch (error: any) {
            console.error("Upscale failed", error);
            alert(`Error al mejorar la imagen: ${error.message || "Verifica el formato o la conexión."}`);
        } finally {
            setIsUpscaling(false);
        }
    };

    // ─── Initialize/reinitialize Pannellum viewer ───
    useEffect(() => {
        if (!pannellumLoaded || !viewerRef.current || scenes.length === 0) return;

        const sceneId = activeSceneId || scenes[0].id;
        const scene = scenes.find((s) => s.id === sceneId);
        if (!scene) return;

        // Reuse instance if already exists
        if (viewerInstance.current) {
            try {
                if (viewerInstance.current.getScene() !== sceneId) {
                    viewerInstance.current.loadScene(sceneId);
                }
                return;
            } catch (e) {
                console.warn("Instance reuse failed, recreating...", e);
                viewerInstance.current.destroy();
                viewerInstance.current = null;
            }
        }

        try {
            // Build scenes config for Pannellum
            const scenesConfig: any = {};
            scenes.forEach((s) => {
                scenesConfig[s.id] = {
                    title: s.title,
                    type: "equirectangular",
                    panorama: s.imageUrl,
                    hotSpots: s.hotspots
                        .filter((h) => h.type !== "scene" || h.targetSceneId)
                        .map((h) => ({
                            pitch: h.pitch,
                            yaw: h.yaw,
                            type: h.type === "scene" ? "scene" : "info",
                            text: h.text,
                            sceneId: h.type === "scene" ? h.targetSceneId : undefined,
                            cssClass: `hotspot-icon-${h.icon || "info"}`,
                        })),
                };
            });

            viewerInstance.current = window.pannellum.viewer(viewerRef.current, {
                default: {
                    firstScene: sceneId,
                    sceneFadeDuration: 800,
                    autoLoad: true,
                    autoRotate: 0,
                    showControls: false,
                    compass: false,
                },
                scenes: scenesConfig,
            });

            viewerInstance.current.on("load", () => {
                setViewerReady(true);
            });

            viewerInstance.current.on("scenechange", (newSceneId: string) => {
                setActiveSceneId(newSceneId);
            });
        } catch (err) {
            console.error("Pannellum init error:", err);
        }

        return () => {
            // Only destroy if component unmounts
        };
    }, [pannellumLoaded]); // Re-init ONLY if JS library loads or for structural changes

    // Global cleanup on unmount
    useEffect(() => {
        return () => {
            if (viewerInstance.current) {
                viewerInstance.current.destroy();
                viewerInstance.current = null;
            }
        };
    }, []);


    // ─── Handle click on panorama to place hotspot ───
    // ─── Fetch Units ───
    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const { getAllUnidades } = await import("@/lib/actions/unidades");
                const res = await getAllUnidades({ proyectoId, pageSize: 1000 });
                if (res.success && res.data) {
                    setProjectUnits(res.data.map((u: any) => ({ id: u.id, numero: u.numero })));
                }
            } catch (error) {
                console.error("Error fetching units:", error);
            }
        };
        fetchUnits();
    }, [proyectoId]);

    // ─── Handle click on panorama to place objects ───
    const handleViewerClick = useCallback(
        (e: React.MouseEvent) => {
            if (editorMode === 'view' || !viewerInstance.current || !activeSceneId) return;

            const viewer = viewerInstance.current;
            const coords = viewer.mouseEventToCoords(e.nativeEvent);
            if (!coords) return;

            const [pitch, yaw] = coords;

            if (editorMode === 'hotspot') {
                if (!selectedUnitId) {
                    alert("Por favor, selecciona una unidad antes de colocar el hotspot.");
                    return;
                }

                const targetScene = scenes.find(s => s.id === linkTargetScene);
                const selectedUnit = projectUnits.find(u => u.id === selectedUnitId);

                const newHotspot: Hotspot = {
                    id: `hs-${Date.now()}`,
                    type: hotspotMode,
                    pitch,
                    yaw,
                    text: hotspotMode === "scene"
                        ? (targetScene?.title || "Ir a escena")
                        : (selectedUnit ? `Unidad ${selectedUnit.numero}` : "Punto de interés"),
                    unidadId: selectedUnitId,
                    targetSceneId: hotspotMode === "scene" ? linkTargetScene : undefined,
                    targetThumbnail: hotspotMode === "scene" ? targetScene?.imageUrl : undefined,
                    icon: hotspotMode === "lot" ? "lot" : "info",
                };

                setScenes((prev) =>
                    prev.map((s) =>
                        s.id === activeSceneId
                            ? { ...s, hotspots: [...s.hotspots, newHotspot] }
                            : s
                    )
                );
                // Don't exit mode, allow multiple placements? Or exit?
                // setIsPlacingHotspot(false); 
                // Currently keeping existing behavior of exiting placement
                setEditorMode('view');
            } else if (editorMode === 'polygon') {
                // Add point to current polygon
                setCurrentPolygonPoints(prev => [...prev, { pitch, yaw }]);
            } else if (editorMode === 'label') {
                if (!pendingLandmarkAnchor) {
                    // Step 1: Place anchor
                    setPendingLandmarkAnchor({ pitch, yaw });
                } else {
                    // Step 2: Place label and finish
                    const text = prompt("Texto de la etiqueta:");
                    if (text) {
                        const newLabel: FloatingLabel = {
                            id: `lbl-${Date.now()}`,
                            pitch,
                            yaw,
                            text,
                            style: 'landmark',
                            anchorPitch: pendingLandmarkAnchor.pitch,
                            anchorYaw: pendingLandmarkAnchor.yaw
                        };

                        setScenes((prev) =>
                            prev.map((s) =>
                                s.id === activeSceneId
                                    ? { ...s, floatingLabels: [...(s.floatingLabels || []), newLabel] }
                                    : s
                            )
                        );
                    }
                    setPendingLandmarkAnchor(null);
                    setEditorMode('view');
                }
            } else if (editorMode === 'overlay') {
                const nextPoints = [...pendingOverlayPoints, { pitch, yaw }];
                if (nextPoints.length < 4) {
                    setPendingOverlayPoints(nextPoints);
                } else {
                    const imageUrl = prompt("URL de la imagen del plano (PNG/JPG):");
                    if (imageUrl) {
                        const overlay: MasterplanOverlay = {
                            imageUrl,
                            points: nextPoints as [any, any, any, any],
                            opacity: 0.6,
                            isVisible: true
                        };
                        setScenes((prev) =>
                            prev.map((s) =>
                                s.id === activeSceneId
                                    ? { ...s, masterplanOverlay: overlay }
                                    : s
                            )
                        );
                    }
                    setPendingOverlayPoints([]);
                    setEditorMode('view');
                }
            }
        },
        [editorMode, activeSceneId, hotspotMode, linkTargetScene, pendingLandmarkAnchor, pendingOverlayPoints]
    );

    const handleViewerMouseMove = useCallback((e: React.MouseEvent) => {
        if (!viewerInstance.current) return;
        const coords = viewerInstance.current.mouseEventToCoords(e.nativeEvent);
        if (!coords) return;
        const [pitch, yaw] = coords;

        setMouseCoords({ pitch, yaw });

        if (draggingHotspotId && activeSceneId) {
            setScenes(prev => prev.map(s =>
                s.id === activeSceneId
                    ? {
                        ...s, hotspots: s.hotspots.map(h =>
                            h.id === draggingHotspotId ? { ...h, pitch, yaw } : h
                        )
                    }
                    : s
            ));
            setLastDragTime(Date.now());
        }

        if (draggingLabelId && activeSceneId) {
            setScenes(prev => prev.map(s =>
                s.id === activeSceneId
                    ? {
                        ...s, floatingLabels: s.floatingLabels?.map(l =>
                            l.id === draggingLabelId ? { ...l, pitch, yaw } : l
                        )
                    }
                    : s
            ));
            setLastDragTime(Date.now());
        }
    }, [draggingHotspotId, draggingLabelId, activeSceneId]);

    const handleGlobalMouseUp = useCallback(() => {
        if (draggingHotspotId || draggingLabelId) {
            setDraggingHotspotId(null);
            setDraggingLabelId(null);
            setLastDragTime(Date.now());
        }
    }, [draggingHotspotId, draggingLabelId]);

    // Helper to finish polygon
    const finishPolygon = () => {
        if (currentPolygonPoints.length < 3) {
            alert("Un polígono necesita al menos 3 puntos.");
            return;
        }
        if (!activeSceneId) return;

        const newPolygon: TourPolygon = {
            id: `poly-${Date.now()}`,
            points: [...currentPolygonPoints],
            fillColor: "rgba(16, 185, 129, 0.4)", // Default green
            strokeColor: "rgba(255, 255, 255, 0.8)",
            hoverText: polygonProperties.hoverText || "Lote Disponible",
            linkedUnitId: polygonProperties.linkedUnitId
        };

        setScenes(prev => prev.map(s =>
            s.id === activeSceneId
                ? { ...s, polygons: [...(s.polygons || []), newPolygon] }
                : s
        ));

        // Reset
        setCurrentPolygonPoints([]);
        setPolygonProperties({ hoverText: "", linkedUnitId: "" });
        setEditorMode('view');
    };

    // Helper to undo last point
    const undoPolygonPoint = () => {
        setCurrentPolygonPoints(prev => prev.slice(0, -1));
    };

    // Cancel polygon
    const cancelPolygon = () => {
        setCurrentPolygonPoints([]);
        setEditorMode('view');
    };


    // ─── File upload ───
    const uploadFile = async (file: File): Promise<{ url: string; filename: string } | null> => {
        const id = `upload-${Date.now()}-${Math.random()}`;
        setUploads((prev) => [
            ...prev,
            { id, filename: file.name, progress: 0, status: "uploading" },
        ]);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload/360", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setUploads((prev) =>
                prev.map((u) => (u.id === id ? { ...u, status: "done", progress: 100, url: data.url } : u))
            );
            return { url: data.url, filename: file.name };
        } catch (err) {
            setUploads((prev) =>
                prev.map((u) => (u.id === id ? { ...u, status: "error", progress: 0 } : u))
            );
            return null;
        }
    };

    // ─── 2:1 Equirectangular Validation ───
    const validateEquirectangular = (file: File): Promise<{ valid: boolean; width: number; height: number; ratio: number }> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                const valid = Math.abs(ratio - 2) < 0.2; // 10% tolerance for 2:1
                resolve({ valid, width: img.width, height: img.height, ratio });
                URL.revokeObjectURL(img.src);
            };
            img.onerror = () => {
                resolve({ valid: false, width: 0, height: 0, ratio: 0 });
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFilesSelected = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const validFiles = fileArray.filter((f) =>
            f.type.startsWith("image/") || f.type === "application/pdf"
        );

        if (validFiles.length === 0) return;

        // Validate 2:1 aspect ratio for equirectangular panoramas
        const validatedFiles: File[] = [];
        for (const file of validFiles) {
            if (file.type.startsWith("image/")) {
                const result = await validateEquirectangular(file);
                if (!result.valid) {
                    const proceed = confirm(
                        `⚠️ "${file.name}" no tiene proporción 2:1 (equirectangular).\n\n` +
                        `Resolución: ${result.width}×${result.height} (ratio ${result.ratio.toFixed(2)}:1)\n` +
                        `Se recomienda una imagen con proporción 2:1 para una experiencia 360° óptima.\n\n` +
                        `¿Desea continuar de todas formas?`
                    );
                    if (!proceed) continue;
                }
            }
            validatedFiles.push(file);
        }

        if (validatedFiles.length === 0) return;

        // Upload all validated files
        const results = await Promise.all(validatedFiles.map(uploadFile));

        // Create scenes from successful uploads
        const newScenes: Scene[] = results
            .filter((r): r is { url: string; filename: string } => r !== null)
            .map((r, i) => ({
                id: `scene-${Date.now()}-${i}`,
                title: r.filename
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[-_]/g, " ")
                    .replace(/^\w/, (c) => c.toUpperCase()),
                imageUrl: r.url,
                hotspots: [],
                isDefault: scenes.length === 0 && i === 0,
                order: scenes.length + i,
                category: activeTab, // Assign current tab category
            }));

        if (newScenes.length > 0) {
            setScenes((prev) => [...prev, ...newScenes]);
            if (!activeSceneId) {
                setActiveSceneId(newScenes[0].id);
            }
        }

        // Clear completed uploads after a delay
        setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.status !== "done"));
        }, 2000);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFilesSelected(e.dataTransfer.files);
    };

    // ─── Scene management ───
    // ─── Scene management ───
    const deleteScene = (sceneId: string) => {
        setScenes((prev) => prev.filter((s) => s.id !== sceneId));
        if (activeSceneId === sceneId) {
            const remaining = scenes.filter((s) => s.id !== sceneId);
            setActiveSceneId(remaining[0]?.id || null);
        }
    };

    const startEditingTitle = (scene: Scene) => {
        setEditingTitle(scene.id);
        setEditTitleValue(scene.title);
    };

    const saveSceneTitle = () => {
        if (editingTitle && editTitleValue.trim()) {
            setScenes((prev) =>
                prev.map((s) =>
                    s.id === editingTitle ? { ...s, title: editTitleValue.trim() } : s
                )
            );
        }
        setEditingTitle(null);
    };

    const removeHotspot = (sceneId: string, hotspotId: string) => {
        setScenes((prev) =>
            prev.map((s) =>
                s.id === sceneId
                    ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) }
                    : s
            )
        );
    };

    const updateHotspot = (sceneId: string, hotspotId: string, updates: Partial<Hotspot>) => {
        setScenes((prev) =>
            prev.map((s) =>
                s.id === sceneId
                    ? {
                        ...s,
                        hotspots: s.hotspots.map((h) =>
                            h.id === hotspotId ? { ...h, ...updates } : h
                        ),
                    }
                    : s
            )
        );
    };

    // ─── Save tour ───
    const handleSave = async () => {
        if (scenes.length === 0) return;
        setIsSaving(true);
        try {
            const { upsertTour } = await import("@/lib/actions/tours");

            const payload = {
                id: tourId,
                proyectoId,
                nombre: "Tour 360 - " + new Date().toLocaleDateString(),
                scenes: scenes.map((s, idx) => ({
                    id: s.id.startsWith("scene-") ? undefined : s.id,
                    title: s.title,
                    imageUrl: s.imageUrl,
                    isDefault: s.isDefault || (idx === 0 && !scenes.some(sc => sc.isDefault)),
                    order: idx,
                    category: (s.category || "raw").toUpperCase(),
                    hotspots: s.hotspots.map(h => ({
                        unidadId: (h as any).unidadId || "demo-unidad", // TODO: Wire actual unit picker
                        type: h.type.toUpperCase(),
                        pitch: h.pitch,
                        yaw: h.yaw,
                        text: h.text,
                        targetSceneId: h.targetSceneId
                    }))
                }))
            };

            const res = await upsertTour(payload);
            if (res.success) {
                alert("Tour guardado con éxito.");
                onSave(scenes);
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error("Save error:", error);
            alert(`Error al guardar: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Delete tour ───
    const handleDeleteTour = async () => {
        if (!onDelete || !confirm("¿Estás seguro de que quieres eliminar este tour completo? Esta acción no se puede deshacer.")) return;

        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
            {/* Pannellum Scripts */}
            <Script
                src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
                strategy="afterInteractive"
                onLoad={() => setPannellumLoaded(true)}
            />
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css" />

            {/* ─── Gallery Modal / View ─── */}
            <AnimatePresence>
                {/* Gallery Mode implementation could go here as an overlay or separate view */}
            </AnimatePresence>

            {/* Main editor layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 min-h-0">
                {/* ─── Left: Viewer ─── */}
                <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 min-h-[400px]">
                    {scenes.length > 0 ? (
                        <>
                            <div
                                ref={viewerRef}
                                className={cn(
                                    "w-full h-full",
                                    (editorMode !== 'view' || draggingHotspotId || draggingLabelId) && "cursor-crosshair"
                                )}
                                onClick={(e) => {
                                    // Prevent click if recently finished a drag
                                    if (Date.now() - lastDragTime < 200) return;
                                    handleViewerClick(e);
                                }}
                                onMouseMove={handleViewerMouseMove}
                                onMouseUp={handleGlobalMouseUp}
                                onMouseLeave={() => setMouseCoords(null)}
                            />

                            <PanoramicOverlay
                                viewer={viewerInstance.current}
                                viewerRef={viewerRef}
                                activeScene={activeScene}
                                editorMode={editorMode}
                                mouseCoords={mouseCoords}
                                draggingHotspotId={draggingHotspotId}
                                setDraggingHotspotId={setDraggingHotspotId}
                                draggingLabelId={draggingLabelId}
                                setDraggingLabelId={setDraggingLabelId}
                                pendingLandmarkAnchor={pendingLandmarkAnchor}
                                pendingOverlayPoints={pendingOverlayPoints}
                                currentPolygonPoints={currentPolygonPoints}
                                viewerReady={viewerReady}
                            />

                            {/* Editor Mode Indicator & Controls */}
                            <AnimatePresence>
                                {editorMode !== 'view' && (
                                    <motion.div
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -20, opacity: 0 }}
                                        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white px-4 py-3 rounded-xl shadow-xl flex flex-col items-center gap-3 min-w-[300px]"
                                    >
                                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-400">
                                            {editorMode === 'hotspot' && <><MapPin className="w-4 h-4" /> Colocando Hotspot</>}
                                            {editorMode === 'polygon' && <><Grid3x3 className="w-4 h-4" /> Dibujando Polígono ({currentPolygonPoints.length} ptos)</>}
                                            {editorMode === 'label' && <><Pencil className="w-4 h-4" /> Colocando Etiqueta</>}
                                            {editorMode === 'overlay' && <><ImageIcon className="w-4 h-4" /> Ajustando Plano ({pendingOverlayPoints.length}/4 ptos)</>}
                                        </div>

                                        <div className="text-xs text-slate-400 text-center">
                                            {editorMode === 'label' && !pendingLandmarkAnchor && "Hacé clic en el punto exacto de interés (el piso o un objeto)."}
                                            {editorMode === 'label' && pendingLandmarkAnchor && "Hacé clic donde querés que flote la etiqueta de texto."}
                                            {editorMode === 'overlay' && "Hacé clic en las 4 esquinas del terreno donde irá el plano."}
                                            {editorMode !== 'label' && editorMode !== 'overlay' && `Hacé clic en la imagen para ${editorMode === 'polygon' ? 'agregar un punto' : 'colocar el elemento'}.`}
                                        </div>

                                        {editorMode === 'polygon' && (
                                            <div className="flex flex-col gap-2 w-full">
                                                <input
                                                    type="text"
                                                    placeholder="Lote N° / Texto"
                                                    value={polygonProperties.hoverText}
                                                    onChange={e => setPolygonProperties(prev => ({ ...prev, hoverText: e.target.value }))}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
                                                />
                                                <div className="flex gap-2 w-full">
                                                    <button onClick={undoPolygonPoint} disabled={currentPolygonPoints.length === 0} className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs">Deshacer</button>
                                                    <button onClick={finishPolygon} disabled={currentPolygonPoints.length < 3} className="flex-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">Terminar</button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                if (editorMode === 'polygon') cancelPolygon();
                                                else setEditorMode('view');
                                            }}
                                            className="absolute -top-2 -right-2 p-1 bg-slate-800 rounded-full border border-slate-600 hover:bg-slate-700"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Editor Toolbar (Bottom Left - Floating Stick) */}
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
                                <div className="bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 p-2 flex flex-col gap-2 shadow-2xl">
                                    <button
                                        onClick={() => setEditorMode(editorMode === 'label' ? 'view' : 'label')}
                                        className={cn("p-4 rounded-full transition-all duration-300 shadow-lg", editorMode === 'label' ? "bg-white text-black scale-110" : "hover:bg-white/10 text-white/70")}
                                        title="Ubicación"
                                    >
                                        <MapPin className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={() => setEditorMode(editorMode === 'polygon' ? 'view' : 'polygon')}
                                        className={cn("p-4 rounded-full transition-all duration-300 shadow-lg", editorMode === 'polygon' ? "bg-white text-black scale-110" : "hover:bg-white/10 text-white/70")}
                                        title="Dibujar Polígono"
                                    >
                                        <Grid3x3 className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={() => setEditorMode(editorMode === 'hotspot' ? 'view' : 'hotspot')}
                                        className={cn("p-4 rounded-full transition-all duration-300 shadow-lg", editorMode === 'hotspot' ? "bg-white text-black scale-110" : "hover:bg-white/10 text-white/70")}
                                        title="Editar"
                                    >
                                        <Pencil className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={() => setEditorMode(editorMode === 'overlay' ? 'view' : 'overlay')}
                                        className={cn("p-4 rounded-full transition-all duration-300 shadow-lg", editorMode === 'overlay' ? "bg-white text-black scale-110" : "hover:bg-white/10 text-white/70")}
                                        title="Galería"
                                    >
                                        <ImageIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Viewer controls - Floating Pill */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-6 py-4 rounded-[1.5rem] border border-white/10 shadow-2xl min-w-[300px]">
                                <button
                                    onClick={() => viewerInstance.current?.isAutoRotating()
                                        ? viewerInstance.current?.stopAutoRotate()
                                        : viewerInstance.current?.startAutoRotate(2)
                                    }
                                    className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-white transition-all shadow-inner"
                                    title="Auto-rotar"
                                >
                                    <RotateCcw className="w-6 h-6" />
                                </button>

                                <span className="text-sm font-bold text-white tracking-wide truncate flex-1 text-center">
                                    {activeScene?.title || "Sin escena"}
                                </span>

                                <button
                                    onClick={() => viewerInstance.current?.toggleFullscreen()}
                                    className="p-3 bg-white/5 hover:bg-white/20 rounded-xl text-white transition-all shadow-inner"
                                    title="Pantalla completa"
                                >
                                    <Maximize2 className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Upscaling Overlay */}
                            <AnimatePresence>
                                {isUpscaling && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
                                    >
                                        <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                                            <div className="relative w-20 h-20 mx-auto mb-6">
                                                <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                                                <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                                                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-brand-400 animate-pulse" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Mejorando Imagen con IA</h3>
                                            <p className="text-slate-400 text-sm mb-6">
                                                Esto puede tomar unos momentos. Estamos aumentando la resolución y reduciendo el ruido.
                                            </p>
                                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-brand-500 to-indigo-500"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 15, repeat: Infinity }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    ) : (
                        /* Empty state: drag & drop zone */
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all",
                                isDragging
                                    ? "bg-brand-500/10 border-2 border-dashed border-brand-500"
                                    : "hover:bg-slate-800/50"
                            )}
                        >
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="mb-4"
                            >
                                <Camera className="w-16 h-16 text-slate-500" />
                            </motion.div>
                            <h3 className="text-lg font-bold text-slate-300 mb-1">
                                Subí tus imágenes 360°
                            </h3>
                            <p className="text-sm text-slate-500 text-center max-w-sm">
                                Arrastrá fotos del drone o cámara 360° aquí.
                                <br />
                                Se generan las escenas automáticamente.
                            </p>
                            <p className="text-xs text-slate-600 mt-3">
                                PNG, JPG, WEBP • Equirectangular • Máximo 20MB
                            </p>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                    />
                </div>

                {/* ─── Right: Sidebar ─── */}
                <div className="flex flex-col bg-black rounded-3xl border border-white/5 overflow-hidden min-h-0 shadow-2xl">
                    {/* Toggle Gallery Button */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                        <div className="flex items-center gap-2">
                            <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                                <DialogTrigger asChild>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-white text-xs font-bold rounded-xl transition-all border border-white/5">
                                        <ImageIcon className="w-4 h-4" />
                                        Galería de Imágenes
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 bg-slate-950 border-slate-800 text-white">
                                    <DialogHeader className="p-4 border-b border-slate-800">
                                        <DialogTitle>Galería de Imágenes 360°</DialogTitle>
                                        <DialogDescription className="text-slate-400">
                                            Gestiona tus imágenes originales y las renderizadas por IA.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="flex p-2 gap-2 border-b border-slate-800 bg-slate-900/50">
                                            <button
                                                onClick={() => setActiveTab('raw')}
                                                className={cn(
                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
                                                    activeTab === 'raw'
                                                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                                )}
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Originales ({scenes.filter(s => (s.category || 'raw') === 'raw').length})
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('rendered')}
                                                className={cn(
                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2",
                                                    activeTab === 'rendered'
                                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                                )}
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                Renderizadas ({scenes.filter(s => s.category === 'rendered').length})
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {/* Upload Card */}
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="aspect-square rounded-xl border-2 border-dashed border-slate-800 hover:border-brand-500/50 hover:bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer transition-all group"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                        <Plus className="w-6 h-6 text-slate-500 group-hover:text-brand-400" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 group-hover:text-brand-400">Subir Imagen</span>
                                                </div>

                                                {filteredScenes.map((scene) => (
                                                    <div key={scene.id} className="group relative aspect-square rounded-xl bg-slate-900 overflow-hidden border border-slate-800 hover:border-brand-500/50 transition-all">
                                                        <img src={scene.imageUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />

                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-white text-xs font-bold truncate mb-1">{scene.title}</p>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveSceneId(scene.id);
                                                                        setIsGalleryOpen(false); // Intelligent behavior: Close gallery on selection
                                                                    }}
                                                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-brand-600 text-white text-[10px] font-bold rounded"
                                                                >
                                                                    Ver
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteScene(scene.id)}
                                                                    className="p-1.5 bg-slate-800 hover:bg-rose-600 text-white rounded"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {activeSceneId === scene.id && (
                                                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500 shadow-glow"></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {filteredScenes.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                                    <ImageIcon className="w-12 h-12 text-slate-600 mb-2" />
                                                    <p className="text-slate-500">No hay imágenes en esta galería</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Scene list header (Hidden/Simplified as we have the Gallery Modal now, but keeping for quick access) */}
                    {/* ... Existing Sidebar Content ... */}
                    <div className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        Acceso Rápido
                    </div>

                    {/* Tabs / Acceso Rápido Pills */}
                    <div className="flex p-1.5 mx-4 gap-1 bg-[#1A1A1A] rounded-xl border border-white/5 shadow-inner">
                        <button
                            onClick={() => setActiveTab('raw')}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                activeTab === 'raw'
                                    ? "bg-[#333333] text-white shadow-lg"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Originales
                        </button>
                        <button
                            onClick={() => setActiveTab('rendered')}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                activeTab === 'rendered'
                                    ? "bg-[#333333] text-white shadow-lg"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Renderizadas (AI)
                        </button>
                    </div>

                    {/* Upload progress */}
                    <AnimatePresence>
                        {uploads.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-b border-slate-800/50"
                            >
                                <div className="p-3 space-y-2">
                                    {uploads.map((upload) => (
                                        <div key={upload.id} className="flex items-center gap-2">
                                            <Loader2
                                                className={cn(
                                                    "w-3.5 h-3.5 shrink-0",
                                                    upload.status === "uploading" && "animate-spin text-indigo-400",
                                                    upload.status === "done" && "text-emerald-400",
                                                    upload.status === "error" && "text-rose-400"
                                                )}
                                            />
                                            <span className="text-xs text-slate-400 truncate flex-1">
                                                {upload.filename}
                                            </span>
                                            {upload.status === "done" && (
                                                <Check className="w-3 h-3 text-emerald-400" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Scene thumbnails - Modern Cards */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {filteredScenes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-600 opacity-50">
                                <ImageIcon className="w-10 h-10 mb-2" />
                                <span className="text-xs font-medium">Sin escenas</span>
                            </div>
                        ) : (
                            filteredScenes.map((scene, index) => (
                                <motion.div
                                    key={scene.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setActiveSceneId(scene.id)}
                                    className="group flex flex-col gap-2 cursor-pointer"
                                >
                                    <div className={cn(
                                        "relative h-36 rounded-2xl overflow-hidden border-2 transition-all duration-300",
                                        activeSceneId === scene.id
                                            ? "border-brand-500 ring-4 ring-brand-500/20"
                                            : "border-white/5 hover:border-white/20"
                                    )}>
                                        <img
                                            src={scene.imageUrl}
                                            alt={scene.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

                                        {/* Scene number badge */}
                                        <div className="absolute top-3 left-3 w-6 h-6 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-[11px] font-black text-white">
                                            {index + 1}
                                        </div>

                                        {/* Default badge */}
                                        {scene.isDefault && (
                                            <div className="absolute bottom-3 right-3 text-[10px] font-black bg-[#10B981] text-white px-2 py-0.5 rounded-md shadow-lg shadow-emerald-500/20">
                                                INICIO
                                            </div>
                                        )}

                                        {/* Quick Actions (Appear on hover) */}
                                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteScene(scene.id);
                                                }}
                                                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-white backdrop-blur-md transition-colors border border-red-500/20"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="px-1 flex items-center justify-between">
                                        {editingTitle === scene.id ? (
                                            <div className="flex items-center gap-1 flex-1">
                                                <input
                                                    value={editTitleValue}
                                                    onChange={(e) => setEditTitleValue(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && saveSceneTitle()}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-xs font-bold text-white/70 truncate group-hover:text-white transition-colors">
                                                    {scene.title}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditingTitle(scene);
                                                    }}
                                                    className="p-1 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* ─── Hotspot Controls ─── */}
                    {activeScene && (
                        <div className="border-t border-white/5 p-4 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                    Hotspots
                                </span>
                            </div>

                            {/* Add hotspot controls pills */}
                            <div className="flex flex-col gap-3">
                                {/* Unit Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 pl-1 uppercase">Vincular a Unidad:</label>
                                    <select
                                        value={selectedUnitId}
                                        onChange={(e) => setSelectedUnitId(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                                    >
                                        <option value="">Seleccionar Unidad...</option>
                                        {projectUnits.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                Unidad {u.numero}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setHotspotMode("info");
                                            setIsPlacingHotspot(true);
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all",
                                            isPlacingHotspot && hotspotMode === "info"
                                                ? "bg-white/10 text-white border-white/20"
                                                : "bg-[#1A1A1A] text-slate-400 border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <MapPin className="w-3.5 h-3.5" /> Info
                                    </button>
                                    <button
                                        onClick={() => {
                                            setHotspotMode("scene");
                                            setIsPlacingHotspot(true);
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all",
                                            isPlacingHotspot && hotspotMode === "scene"
                                                ? "bg-white/10 text-white border-white/20"
                                                : "bg-[#1A1A1A] text-slate-400 border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <Navigation className="w-3.5 h-3.5" /> Escena
                                    </button>
                                    <button
                                        onClick={() => {
                                            setHotspotMode("link");
                                            setIsPlacingHotspot(true);
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all",
                                            isPlacingHotspot && hotspotMode === "link"
                                                ? "bg-white/10 text-white border-white/20"
                                                : "bg-[#1A1A1A] text-slate-400 border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <Link2 className="w-3.5 h-3.5" /> Link
                                    </button>
                                </div>

                                {/* Scene target selector */}
                                {isPlacingHotspot && hotspotMode === "scene" && (
                                    <select
                                        value={linkTargetScene}
                                        onChange={(e) => setLinkTargetScene(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Seleccionar escena destino</option>
                                        {scenes
                                            .filter((s) => s.id !== activeSceneId)
                                            .map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.title}
                                                </option>
                                            ))}
                                    </select>
                                )}
                            </div>

                            {/* Existing hotspots list */}
                            {activeScene.hotspots.length > 0 && (
                                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                                    {activeScene.hotspots.map((h) => (
                                        <div
                                            key={h.id}
                                            className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800"
                                        >
                                            <span className="text-xs">
                                                {h.type === "info" ? "ℹ️" : h.type === "scene" ? "➡️" : "🔗"}
                                            </span>
                                            <input
                                                value={h.text}
                                                onChange={(e) =>
                                                    updateHotspot(activeScene.id, h.id, { text: e.target.value })
                                                }
                                                className="flex-1 bg-transparent text-xs text-slate-300 focus:outline-none"
                                            />
                                            <button
                                                onClick={() => removeHotspot(activeScene.id, h.id)}
                                                className="p-0.5 text-rose-500/60 hover:text-rose-400 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Masterplan Overlay Controls ─── */}
                    {activeScene && activeScene.masterplanOverlay && (
                        <div className="border-t border-slate-800/50 p-4 space-y-3 bg-indigo-500/5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                    Plano Superpuesto
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            setScenes(prev => prev.map(s => s.id === activeSceneId ? {
                                                ...s,
                                                masterplanOverlay: { ...s.masterplanOverlay!, isVisible: !s.masterplanOverlay!.isVisible }
                                            } : s));
                                        }}
                                        className={cn(
                                            "p-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors",
                                            activeScene.masterplanOverlay.isVisible ? "text-indigo-400" : "text-slate-600"
                                        )}
                                        title="Alternar Visibilidad"
                                    >
                                        <Eye className={cn("w-3.5 h-3.5", !activeScene.masterplanOverlay.isVisible && "opacity-50")} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm("¿Eliminar el plano de esta escena?")) {
                                                setScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, masterplanOverlay: undefined } : s));
                                            }
                                        }}
                                        className="p-1.5 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-600 hover:text-rose-400 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-500">
                                    <span>Opacidad</span>
                                    <span className="text-indigo-300 font-mono">{Math.round((activeScene.masterplanOverlay?.opacity || 0) * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={activeScene.masterplanOverlay?.opacity || 0}
                                    onChange={(e) => {
                                        const opacity = parseFloat(e.target.value);
                                        setScenes(prev => prev.map(s => s.id === activeSceneId ? {
                                            ...s,
                                            masterplanOverlay: { ...s.masterplanOverlay!, opacity }
                                        } : s));
                                    }}
                                    className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    {/* Save button - Large & Primary */}
                    <div className="p-4 border-t border-white/5 bg-[#0A0A0A]">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || scenes.length === 0}
                            className="w-full py-4 rounded-2xl bg-white text-black text-sm font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="w-5 h-5" /> Guardar Tour
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom: Removed Redundant Scene Strip as requested by design */}

            {/* Hotspot styling */}
            <style jsx global>{`
                .pnlm-hotspot-base {
                    border-radius: 50%;
                    border: 2px solid white;
                    background: rgba(139, 195, 74, 0.8);
                    cursor: pointer;
                    transition: all 0.2s;
                    width: 24px !important;
                    height: 24px !important;
                }
                .pnlm-hotspot-base:hover {
                    transform: scale(1.3);
                    background: rgba(139, 195, 74, 1);
                    box-shadow: 0 0 20px rgba(139, 195, 74, 0.5);
                }
                .pnlm-tooltip span {
                    background: rgba(15, 23, 42, 0.95) !important;
                    border-radius: 8px !important;
                    padding: 4px 10px !important;
                    font-family: Inter, sans-serif !important;
                    font-size: 12px !important;
                    border: 1px solid rgba(100, 116, 139, 0.3) !important;
                }
                .pnlm-controls-container {
                    display: none !important;
                }
                .pnlm-panorama-info {
                    display: none !important;
                }

                /* Custom Hotspot Styles (Mirrored from Viewer) */
                .hotspot-lot-marker {
                    background: white;
                    color: #0f172a;
                    font-weight: 800;
                    border-radius: 50%;
                    width: 24px; height: 24px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 10px;
                    border: 1.5px solid #0f172a;
                    transform: translate(-50%, -50%);
                }
                .hotspot-status-marker {
                    width: 20px; height: 20px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: white; border: 1.5px solid white;
                    transform: translate(-50%, -50%);
                }
                .hotspot-status-marker.available { background: #10b981; }
                .hotspot-status-marker.sold { background: #ef4444; }
                .hotspot-status-marker.scene { background: #3b82f6; }

                .hotspot-bubble-marker {
                    width: 40px; height: 40px;
                    border-radius: 50%; border: 2px solid white;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    transform: translate(-50%, -50%);
                }
                .hotspot-bubble-marker img {
                    width: 100%; height: 100%; object-fit: cover;
                }
            `}</style>
        </div>
    );
}

// Helper for upscaling
// Helper for upscaling using Web Worker
async function upscaleImageClientSide(
    imageUrl: string,
    onProgress: (msg: string) => void
): Promise<string> {
    onProgress("Enviando a procesar (IA Servidor)...");

    const response = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error en el servidor de IA");
    }

    const data = await response.json();
    return data.resultUrl; // Returns base64
}
