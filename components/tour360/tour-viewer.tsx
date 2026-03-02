"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    Loader2, Play, Pause, Maximize2, Share2, Copy, Check,
    ChevronLeft, ChevronRight, MapPin, X, Volume2, VolumeX,
    SkipForward, Info, ExternalLink, Navigation, ImageIcon,
    School, Hospital, Plane, Utensils, Trophy, Dumbbell, Music,
    TreePine, Car, Store, Phone, Mail, Globe, Search, Type, Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher";
import { Viewer } from "@photo-sphere-viewer/core";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import { AutorotatePlugin } from "@photo-sphere-viewer/autorotate-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";

export type HotspotType = "info" | "scene" | "link" | "lot" | "check" | "sold" | "gallery" | "video" | "UNIT";

export interface ImageVariants {
    thumb: string;
    "2k": string;
    "4k": string;
    original: string;
}

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

export interface Overlay2D {
    id: string;
    type: "text" | "rect" | "circle" | "line" | "arrow" | "image";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    text?: string;
    src?: string;
    style: {
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
        opacity?: number;
        radius?: number;
        fontSize?: number;
        fontWeight?: string;
        textColor?: string;
        bgColor?: string;
        shadow?: boolean;
    };
}

export interface WorldAnchor {
    id: string;
    kind: "icon" | "text" | "image";
    pitch: number;
    yaw: number;
    title?: string;
    text?: string;
    icon?: string;
    imageUrl?: string;
    width?: number;
    height?: number;
    rotation?: number;
    style: {
        scale: number;
        color?: string;
        background?: string;
        stroke?: string;
        strokeWidth?: number;
        opacity: number;
        leaderLine?: boolean;
        leaderLineLength?: number;
        fill?: string;
        radius?: number;
        fontSize?: number;
        fontWeight?: string;
        textColor?: string;
        bgColor?: string;
        shadow?: boolean;
    };
    src?: string;
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
    imageVariants?: ImageVariants;
    overlay2D?: Overlay2D[];
    worldAnchors?: WorldAnchor[];
    mapPosition?: { x: number; y: number }; // percentage 0-100 on masterplan
}

// ─── Coordinate helpers ───
const toRad = (deg: number) => deg * (Math.PI / 180);
const toDeg = (rad: number) => rad * (180 / Math.PI);

// ─── Helpers ───
const getIconComponent = (iconName?: string) => {
    switch (iconName) {
        case 'school': return School;
        case 'hospital': return Hospital;
        case 'airport': return Plane;
        case 'restaurant': return Utensils;
        case 'golf': return Trophy;
        case 'gym': return Dumbbell;
        case 'music': return Music;
        case 'tree': return TreePine;
        case 'car': return Car;
        case 'store': return Store;
        case 'info': return Info;
        case 'phone': return Phone;
        case 'mail': return Mail;
        case 'globe': return Globe;
        case 'search': return Search;
        default: return MapPin;
    }
};

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
    onUnitClick?: (unidad: { id: string; numero: string; estado: string; precio?: number; moneda?: string }) => void;
}


function Overlay2DView({
    elements
}: {
    elements: Overlay2D[]
}) {
    if (!elements || elements.length === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-[25] overflow-hidden">
            {elements.map((el) => {
                const isImage = el.type === 'image' && el.src;
                const isShape = ['rect', 'circle'].includes(el.type);
                const isText = el.type === 'text';

                return (
                    <motion.div
                        key={el.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: el.style.opacity ?? 1 }}
                        style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`,
                            transform: `rotate(${el.rotation}deg)`,
                            backgroundColor: isText ? el.style.bgColor : (el.type === 'rect' ? el.style.fill : 'transparent'),
                            border: el.style.stroke ? `${el.style.strokeWidth}px solid ${el.style.stroke}` : 'none',
                            borderRadius: el.type === 'circle' ? '50%' : `${el.style.radius || 0}px`,
                            color: el.style.textColor,
                            fontSize: `${el.style.fontSize}px`,
                            fontWeight: el.style.fontWeight as any,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            boxShadow: el.style.shadow ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                            overflow: 'hidden',
                            pointerEvents: 'none'
                        }}
                    >
                        {isText && el.text}
                        {isImage && (
                            <img
                                src={el.src}
                                alt=""
                                className="w-full h-full object-contain"
                            />
                        )}
                        {(el.type === 'line' || el.type === 'arrow') && (
                            <svg className="w-full h-full overflow-visible">
                                <line
                                    x1="0" y1="50%" x2="100%" y2="50%"
                                    stroke={el.style.stroke}
                                    strokeWidth={el.style.strokeWidth}
                                />
                                {el.type === 'arrow' && (
                                    <path
                                        d="M 90% 40% L 100% 50% L 90% 60%"
                                        fill="none"
                                        stroke={el.style.stroke}
                                        strokeWidth={el.style.strokeWidth}
                                    />
                                )}
                            </svg>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}

function PanoramicOverlay({
    viewState,
    viewerRef,
    currentScene,
    viewerReady,
    onPolygonClick
}: {
    viewState: { hfov: number; pitch: number; yaw: number };
    viewerRef: React.RefObject<HTMLDivElement>;
    currentScene: Scene | null;
    viewerReady: boolean;
    onPolygonClick?: (polygon: TourPolygon) => void;
}) {
    const projectCoords = (pitch: number, yaw: number) => {
        if (!viewerRef.current) return null;

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
                const isLandmark = label.style === 'landmark';
                return (
                    <motion.div
                        key={label.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                            "absolute px-3 py-1.5 rounded-full text-[11px] font-bold text-white shadow-2xl pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 border transition-transform hover:scale-105",
                            isLandmark
                                ? "bg-brand-500 border-brand-400 shadow-brand-500/20"
                                : "bg-slate-900/90 border-white/20 backdrop-blur-xl shadow-black/40"
                        )}
                        style={{ left: coords.x, top: coords.y }}
                    >
                        {isLandmark && <MapPin className="w-3 h-3" />}
                        {label.text}
                    </motion.div>
                );
            })}

            {/* World Anchors Layer (Pinned elements) */}
            {currentScene.worldAnchors?.map((wa) => {
                const coords = projectCoords(wa.pitch, wa.yaw);
                if (!coords) return null;

                const IconComponent = wa.kind === 'icon' ? getIconComponent(wa.icon) : null;
                const isImage = wa.kind === 'image' && (wa.imageUrl || wa.src);
                const isText = wa.kind === 'text';

                return (
                    <motion.div
                        key={wa.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: wa.style.opacity ?? 1 }}
                        className="absolute flex flex-col items-center justify-center z-20 pointer-events-none"
                        style={{
                            left: coords.x,
                            top: coords.y,
                            width: wa.kind === 'icon' ? 'auto' : `${wa.width || 100}px`,
                            height: wa.kind === 'icon' ? 'auto' : `${wa.height || 100}px`,
                            transform: `translate(-50%, -50%) rotate(${wa.rotation || 0}deg)`,
                        }}
                    >
                        {/* Leader Line */}
                        {wa.style.leaderLine && (
                            <div
                                className="absolute bottom-1/2 left-1/2 w-0.5 bg-white/50 origin-bottom"
                                style={{ height: `${wa.style.leaderLineLength || 100}px`, transform: 'translateX(-50%) translateY(0)' }}
                            />
                        )}

                        {/* Title Above */}
                        {wa.title && (
                            <div
                                className="mb-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[10px] font-bold text-white whitespace-nowrap shadow-xl"
                                style={{ transform: wa.style.leaderLine ? `translateY(-${wa.style.leaderLineLength || 100}px)` : 'none' }}
                            >
                                {wa.title}
                            </div>
                        )}

                        {/* Pin / Icon / Content */}
                        <div
                            className={cn(
                                "flex items-center justify-center rounded-full shadow-2xl transition-all duration-300",
                                wa.kind === 'icon' ? "w-10 h-10 border-2" : "w-full h-full"
                            )}
                            style={{
                                backgroundColor: wa.kind === 'icon' ? wa.style.color : (isText ? wa.style.bgColor : (wa.style.fill || 'transparent')),
                                borderColor: 'white',
                                color: wa.style.textColor || 'white',
                                padding: wa.kind === 'icon' ? '8px' : '0',
                                scale: wa.style.scale,
                                transform: wa.style.leaderLine ? `translateY(-${wa.style.leaderLineLength || 100}px)` : 'none'
                            }}
                        >
                            {wa.kind === 'icon' && IconComponent && <IconComponent className="w-full h-full" />}
                            {isText && wa.text}
                            {isImage && (
                                <img src={wa.imageUrl || wa.src} alt="" className="w-full h-full object-contain pointer-events-none rounded-lg" />
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </>
    );
}

function Minimap({
    scenes,
    currentSceneId,
    masterplanImageUrl,
    open,
    onToggle,
    onNavigate,
}: {
    scenes: Scene[];
    currentSceneId: string | null;
    masterplanImageUrl?: string;
    open: boolean;
    onToggle: () => void;
    onNavigate: (sceneId: string) => void;
}) {
    if (!masterplanImageUrl && scenes.length === 0) return null;

    return (
        <div className="absolute bottom-24 right-4 z-30">
            <button
                onClick={onToggle}
                className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors shadow-lg"
                title={open ? 'Cerrar mapa' : 'Abrir mapa'}
            >
                <MapPin className="w-3 h-3" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.2 }}
                        className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 relative"
                    >
                        {masterplanImageUrl ? (
                            <img src={masterplanImageUrl} alt="Minimap" className="w-full h-full object-cover opacity-80" />
                        ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <MapPin className="w-8 h-8 text-slate-600" />
                            </div>
                        )}

                        {/* Scene dots */}
                        {scenes.map((scene, i) => {
                            const total = scenes.length;
                            // If scene has mapPosition, use it; otherwise distribute in a grid
                            const x = scene.mapPosition ? scene.mapPosition.x : ((i % 4) / 3) * 80 + 10;
                            const y = scene.mapPosition ? scene.mapPosition.y : (Math.floor(i / 4) / Math.max(1, Math.ceil(total / 4) - 1)) * 80 + 10;
                            const isActive = scene.id === currentSceneId;

                            return (
                                <button
                                    key={scene.id}
                                    onClick={() => onNavigate(scene.id)}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 group"
                                    style={{ left: `${x}%`, top: `${y}%` }}
                                    title={scene.title}
                                >
                                    {isActive && (
                                        <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-75" style={{ width: 12, height: 12, top: -2, left: -2 }} />
                                    )}
                                    <span className={cn(
                                        "block w-2 h-2 rounded-full border shadow-lg transition-all",
                                        isActive
                                            ? "bg-brand-500 border-white scale-125"
                                            : "bg-white/70 border-white/40 hover:bg-white hover:scale-110"
                                    )} />
                                </button>
                            );
                        })}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent py-1 px-2">
                            <span className="text-[9px] font-bold text-white/80 uppercase tracking-wide">Plano</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!open && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={onToggle}
                    className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl relative"
                    title="Abrir mapa"
                >
                    {masterplanImageUrl ? (
                        <img src={masterplanImageUrl} alt="Minimap" className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white/60" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                </motion.button>
            )}
        </div>
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
    onUnitClick,
}: TourViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const viewerInstance = useRef<Viewer | null>(null);
    const goToSceneRef = useRef<(sceneId: string) => void>(() => {});
    const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(autoRotate);
    const [error, setError] = useState<string | null>(null);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [viewerReady, setViewerReady] = useState(false);
    const [activeSceneId, setActiveSceneId] = useState(initialSceneId || (scenes.length > 0 ? scenes[0].id : ""));
    const [quality, setQuality] = useState<"auto" | "2k" | "4k" | "ultra">("auto");
    const [currentResolution, setCurrentResolution] = useState<string>("");
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showRadar, setShowRadar] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);
    const [isAutoTouring, setIsAutoTouring] = useState(false);
    const [copied, setCopied] = useState(false);
    const autoTourTimer = useRef<NodeJS.Timeout | null>(null);
    const [viewState, setViewState] = useState({ hfov: 100, pitch: 0, yaw: 0 });
    const [isPanoLoading, setIsPanoLoading] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [gyroEnabled, setGyroEnabled] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Hotspot['unidad'] | null>(null);
    const [minimapOpen, setMinimapOpen] = useState(true);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const gyroListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

    // Dynamic scenes state to handle real-time updates
    const [dynamicScenes, setDynamicScenes] = useState<Scene[]>(scenes);

    useEffect(() => {
        if (!proyectoId) return;

        const pusher = getPusherClient();
        if (!pusher) return; // Pusher not configured — skip subscription
        const channel = pusher.subscribe(CHANNELS.UNIDADES);

        channel.bind(EVENTS.UNIDAD_STATUS_CHANGED, (data: { id: string; estado: string }) => {
            setDynamicScenes(prev => prev.map(scene => ({
                ...scene,
                hotspots: scene.hotspots.map(hs => {
                    if (hs.unidad?.id === data.id) {
                        return { ...hs, unidad: { ...hs.unidad, estado: data.estado } };
                    }
                    return hs;
                })
            })));
        });

        return () => {
            channel.unbind(EVENTS.UNIDAD_STATUS_CHANGED);
            pusher.unsubscribe(CHANNELS.UNIDADES);
        };
    }, [proyectoId]);

    const startScene = initialSceneId
        ? dynamicScenes.find((s) => s.id === initialSceneId)
        : dynamicScenes.find((s) => s.isDefault) || dynamicScenes[0];

    const currentScene = dynamicScenes.find((s) => s.id === currentSceneId) || startScene;
    const currentIndex = dynamicScenes.findIndex((s) => s.id === currentSceneId);

    const getBestPanorama = useCallback((scene: Scene) => {
        const variants = scene.imageVariants;
        if (!variants) return scene.imageUrl;
        if (quality === "ultra") return variants.original || scene.imageUrl;
        if (quality === "4k") return variants["4k"] || variants.original || scene.imageUrl;
        if (quality === "2k") return variants["2k"] || variants.original || scene.imageUrl;
        if (typeof window !== "undefined") {
            const w = window.innerWidth;
            if (w < 768) return variants["2k"] || variants.original || scene.imageUrl;
            if (w < 1920) return variants["4k"] || variants.original || scene.imageUrl;
        }
        return variants.original || scene.imageUrl;
    }, [quality]);

    // Initialize PSV
    useEffect(() => {
        if (!viewerRef.current || !startScene || viewerInstance.current) return;
        initViewer(startScene.id);
        return () => {
            viewerInstance.current?.destroy();
            viewerInstance.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startScene?.id]);

    const refreshMarkers = useCallback((sceneId: string, psv: Viewer) => {
        const markersPlugin = psv.getPlugin<MarkersPlugin>(MarkersPlugin);
        if (!markersPlugin) return;
        markersPlugin.clearMarkers();

        const scene = dynamicScenes.find(s => s.id === sceneId);
        if (!scene) return;

        scene.hotspots.forEach(hs => {
            const div = document.createElement('div');
            hotspotTooltip(div, hs);
            markersPlugin.addMarker({
                id: hs.id,
                position: { yaw: toRad(hs.yaw), pitch: toRad(hs.pitch) },
                element: div,
                data: hs,
            });
        });

        markersPlugin.addEventListener('select-marker', ({ marker }) => {
            const hs = marker.data as Hotspot;
            handleHotspotClick(null as any, hs);
            if (hs.targetSceneId) {
                goToSceneRef.current(hs.targetSceneId);
            }
        }, { once: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dynamicScenes]);

    const initViewer = (firstSceneId: string) => {
        if (!viewerRef.current || !startScene) return;

        try {
            const psv = new Viewer({
                container: viewerRef.current,
                panorama: getBestPanorama(startScene),
                defaultYaw: 0,
                defaultPitch: 0,
                defaultZoomLvl: 50,
                minFov: 30,
                maxFov: 110,
                navbar: false,
                plugins: [
                    [AutorotatePlugin, {
                        autostartDelay: null,
                        autostartOnIdle: false,
                        autorotatePitch: 0,
                        autorotateSpeed: '2rpm',
                    }],
                    [MarkersPlugin, {}],
                ],
            });

            viewerInstance.current = psv;

            psv.addEventListener('position-updated', ({ position }) => {
                const el = viewerRef.current;
                if (!el) return;
                const maxFov = psv.config.maxFov ?? 110;
                const minFov = psv.config.minFov ?? 30;
                const vFov = maxFov - (maxFov - minFov) * (psv.getZoomLevel() / 100);
                const ar = el.clientWidth / el.clientHeight;
                const hFov = 2 * Math.atan(Math.tan(toRad(vFov) / 2) * ar) * (180 / Math.PI);
                setViewState({
                    pitch: toDeg(position.pitch),
                    yaw: toDeg(position.yaw),
                    hfov: hFov,
                });
            });

            psv.addEventListener('zoom-updated', ({ zoomLevel }) => {
                const el = viewerRef.current;
                if (!el) return;
                const maxFov = psv.config.maxFov ?? 110;
                const minFov = psv.config.minFov ?? 30;
                const vFov = maxFov - (maxFov - minFov) * (zoomLevel / 100);
                const ar = el.clientWidth / el.clientHeight;
                const hFov = 2 * Math.atan(Math.tan(toRad(vFov) / 2) * ar) * (180 / Math.PI);
                setViewState(prev => ({ ...prev, hfov: hFov }));
            });

            psv.addEventListener('ready', () => {
                setViewerReady(true);
                setCurrentSceneId(firstSceneId);
                refreshMarkers(firstSceneId, psv);
            });

            if (isPlaying) {
                psv.getPlugin<AutorotatePlugin>(AutorotatePlugin)?.start();
            }
        } catch (err) {
            console.error("Init error:", err);
            setError("Error al inicializar el visor.");
        }
    };

    const hotspotTooltip = (hotSpotDiv: HTMLElement, args: Hotspot) => {
        hotSpotDiv.classList.add("custom-hotspot-container");

        // Use real-time state from the component if available, otherwise use initial unit data
        const currentEstado = (args.unidad as any)?.estado || "DISPONIBLE";
        const numero = args.unidad?.numero || args.text || "";
        const precio = args.unidad?.precio ? `${args.unidad.moneda === 'USD' ? 'USD $' : '$'}${args.unidad.precio.toLocaleString()}` : null;

        let statusClass = "available";
        if (["RESERVADA", "RESERVADA_PENDIENTE"].includes(currentEstado)) statusClass = "reserved";
        if (["VENDIDA", "SUSPENDIDA"].includes(currentEstado)) statusClass = "sold";

        switch (args.type) {
            case "UNIT":
            case "lot":
                hotSpotDiv.innerHTML = `
                    <div class="hotspot-pro-wrapper ${statusClass}">
                        <div class="hotspot-main-pulse"></div>
                        <div class="hotspot-pro-marker">
                            <span class="hotspot-number">${numero}</span>
                        </div>
                        <div class="hotspot-pro-tooltip">
                            <div class="tooltip-header">
                                <span class="tooltip-title">Unidad ${numero}</span>
                                <span class="tooltip-status-badge ${statusClass}">${currentEstado.replace('_', ' ')}</span>
                            </div>
                            ${precio ? `<div class="tooltip-price">${precio}</div>` : ''}
                            <div class="tooltip-footer">
                                <span>Ver detalle</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case "scene":
                hotSpotDiv.innerHTML = `
                    <div class="hotspot-scene-wrapper">
                        <div class="hotspot-scene-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                        <div class="hotspot-scene-label">${args.text || "Ir a escena"}</div>
                    </div>
                `;
                break;
            default:
                hotSpotDiv.innerHTML = `
                    <div class="hotspot-generic-tooltip">
                        <span>${args.text}</span>
                    </div>
                `;
                break;
        }
    };

    const handleHotspotClick = (_e: MouseEvent, args: Hotspot) => {
        if (args.unidad) {
            setSelectedUnit(args.unidad);
            if (onUnitClick) onUnitClick(args.unidad);
        }
        if (args.targetUrl) {
            window.open(args.targetUrl, "_blank");
        }
    };

    const toggleGyro = useCallback(() => {
        const psv = viewerInstance.current;
        if (!psv) return;
        if (gyroEnabled) {
            if (gyroListenerRef.current) {
                window.removeEventListener('deviceorientation', gyroListenerRef.current);
                gyroListenerRef.current = null;
            }
            setGyroEnabled(false);
        } else {
            const doEnable = () => {
                const handler = (e: DeviceOrientationEvent) => {
                    if (e.alpha === null || e.beta === null || e.gamma === null) return;
                    const yaw = -e.alpha * (Math.PI / 180);
                    const pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, (e.beta - 45) * (Math.PI / 180)));
                    psv.rotate({ yaw, pitch });
                };
                window.addEventListener('deviceorientation', handler, { passive: true });
                gyroListenerRef.current = handler;
                setGyroEnabled(true);
            };
            const req = (DeviceOrientationEvent as any).requestPermission;
            if (typeof req === 'function') {
                req().then((p: string) => { if (p === 'granted') doEnable(); });
            } else {
                doEnable();
            }
        }
    }, [gyroEnabled]);

    // ─── Navigation ───
    const goToScene = useCallback((sceneId: string) => {
        const psv = viewerInstance.current;
        if (!psv) return;
        const scene = dynamicScenes.find(s => s.id === sceneId);
        if (!scene) return;
        setIsPanoLoading(true);
        psv.setPanorama(getBestPanorama(scene)).finally(() => setIsPanoLoading(false));
        setCurrentSceneId(sceneId);
        onSceneChange?.(sceneId);
        refreshMarkers(sceneId, psv);
    }, [dynamicScenes, getBestPanorama, refreshMarkers, onSceneChange]);

    // Keep ref in sync so refreshMarkers can call it without stale closure
    goToSceneRef.current = goToScene;

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
        viewerInstance.current?.getPlugin<AutorotatePlugin>(AutorotatePlugin)?.start();

        autoTourTimer.current = setInterval(() => {
            goNext();
        }, 8000);
    };

    const stopAutoTour = () => {
        setIsAutoTouring(false);
        viewerInstance.current?.getPlugin<AutorotatePlugin>(AutorotatePlugin)?.stop();
        if (autoTourTimer.current) {
            clearInterval(autoTourTimer.current);
            autoTourTimer.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (autoTourTimer.current) clearInterval(autoTourTimer.current);
            if (gyroListenerRef.current) window.removeEventListener('deviceorientation', gyroListenerRef.current);
        };
    }, []);

    const resetControlsTimer = useCallback(() => {
        setControlsVisible(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }, []);

    useEffect(() => {
        resetControlsTimer();
        return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
    }, [resetControlsTimer]);

    // ─── Rotation toggle ───
    const togglePlay = () => {
        if (!viewerInstance.current) return;
        const autoRotate = viewerInstance.current.getPlugin<AutorotatePlugin>(AutorotatePlugin);
        if (isPlaying) {
            autoRotate?.stop();
        } else {
            autoRotate?.start();
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
        <div className={cn("relative w-full h-[500px] bg-black overflow-hidden rounded-2xl", className)} onMouseMove={resetControlsTimer} onTouchStart={resetControlsTimer}>
            {/* Loading / Transition overlay */}
            {(!viewerReady || isPanoLoading) && (
                <div className="absolute inset-0 z-20 pointer-events-none">
                    {!viewerReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-brand-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-brand-500/20 animate-pulse" />
                                </div>
                            </div>
                            <span className="mt-4 text-sm text-slate-400 font-medium">Cargando tour 360°</span>
                        </div>
                    )}
                    {viewerReady && isPanoLoading && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300">
                            <div className="w-10 h-10 rounded-full border-3 border-white/30 border-t-white animate-spin" />
                        </div>
                    )}
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
                viewState={viewState}
                viewerRef={viewerRef}
                currentScene={currentScene || null}
                viewerReady={viewerReady}
                onPolygonClick={onPolygonClick}
            />

            {/* ─── Radar / Compass ─── */}
            {showRadar && viewerReady && (
                <div className="absolute top-20 left-4 z-20 flex flex-col items-center" style={{ opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.3s' }}>
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

            {/* ─── Mini Masterplan Toggle ─── */}
            {currentScene?.masterplanOverlay?.imageUrl && (
                <div className="absolute top-20 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={() => setShowOverlays(!showOverlays)}
                        className={cn(
                            "relative w-24 h-24 rounded-2xl border-2 overflow-hidden transition-all shadow-2xl",
                            showOverlays ? "border-brand-500 scale-105" : "border-white/20 opacity-80 hover:opacity-100 active:scale-95"
                        )}
                    >
                        <img
                            src={currentScene.masterplanOverlay.imageUrl}
                            className="w-full h-full object-cover grayscale-[0.2]"
                            alt="Mini Map"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-md py-1 text-[8px] font-black text-white uppercase tracking-tighter">
                            Plano 360
                        </div>
                    </button>
                </div>
            )}

            {/* ─── Top bar ─── */}
            {showControls && viewerReady && (
                <div
                    className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between transition-opacity duration-300"
                    style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
                >
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
            {showControls && viewerReady && (
                <div
                    className="absolute bottom-0 inset-x-0 z-10 transition-opacity duration-300"
                    style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
                >
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
                            <div className="h-4 w-px bg-white/10 mx-1" />

                            {/* Quality Selector */}
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                {(['auto', '2k', '4k', 'ultra'] as const).map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setQuality(q)}
                                        className={cn(
                                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                                            quality === q
                                                ? "bg-brand-500 text-white shadow-lg"
                                                : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

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

                            {/* Reset View */}
                            <button
                                onClick={() => {
                                    if (viewerInstance.current) {
                                        viewerInstance.current.rotate({ yaw: 0, pitch: 0 });
                                        viewerInstance.current.zoom(50);
                                    }
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                                title="Restablecer vista"
                            >
                                <Navigation className="w-4 h-4 rotate-180" />
                            </button>

                            <div className="w-px h-5 bg-white/10 mx-0.5" />

                            {/* Gyroscope (mobile) */}
                            <button
                                onClick={toggleGyro}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    gyroEnabled ? "text-brand-400 bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
                                )}
                                title={gyroEnabled ? "Desactivar giroscopio" : "Activar giroscopio"}
                            >
                                <Smartphone className="w-4 h-4" />
                            </button>

                            {/* Fullscreen */}
                            <button
                                onClick={() => {
                                    const el = viewerRef.current;
                                    if (!document.fullscreenElement) el?.requestFullscreen();
                                    else document.exitFullscreen();
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                                title="Pantalla completa"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Interactive Minimap ─── */}
            {viewerReady && (
                <Minimap
                    scenes={dynamicScenes}
                    currentSceneId={currentSceneId}
                    masterplanImageUrl={dynamicScenes.find(s => s.masterplanOverlay?.imageUrl)?.masterplanOverlay?.imageUrl}
                    open={minimapOpen}
                    onToggle={() => setMinimapOpen(prev => !prev)}
                    onNavigate={goToScene}
                />
            )}

            {/* ─── Unit side panel ─── */}
            <AnimatePresence>
                {selectedUnit && (
                    <motion.div
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute top-16 right-4 z-30 w-72"
                    >
                        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                <span className="text-sm font-bold text-white">Unidad {selectedUnit.numero}</span>
                                <button
                                    onClick={() => setSelectedUnit(null)}
                                    className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                            {/* Status badge */}
                            <div className="px-4 py-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Estado</span>
                                    <span className={cn(
                                        "text-xs font-bold px-2 py-1 rounded-lg",
                                        selectedUnit.estado === 'DISPONIBLE' ? 'bg-emerald-500/20 text-emerald-400' :
                                        ['RESERVADA', 'RESERVADA_PENDIENTE'].includes(selectedUnit.estado) ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-red-500/20 text-red-400'
                                    )}>
                                        {selectedUnit.estado.replace('_', ' ')}
                                    </span>
                                </div>
                                {selectedUnit.precio && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">Precio</span>
                                        <span className="text-sm font-extrabold text-white">
                                            {selectedUnit.moneda === 'USD' ? 'USD $' : '$'}{selectedUnit.precio.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {onUnitClick && (
                                    <button
                                        onClick={() => { onUnitClick(selectedUnit); setSelectedUnit(null); }}
                                        className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
                                    >
                                        Ver detalle completo
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                /* PSV Container Reset */
                .psv-container { background: #000 !important; }
                .psv-loader { display: none !important; }

                /* Custom Hotspot Container */
                .custom-hotspot-container {
                    width: 0 !important;
                    height: 0 !important;
                    overflow: visible !important;
                }

                /* PRO HOTSPOT WRAPPER */
                .hotspot-pro-wrapper {
                    position: relative;
                    transform: translate(-50%, -50%);
                    width: 36px;
                    height: 36px;
                    cursor: pointer;
                }

                .hotspot-pro-marker {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 3px solid currentColor;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 2;
                    position: relative;
                    transition: all 0.2s ease;
                }

                .hotspot-pro-wrapper.available .hotspot-pro-marker { color: #10b981; }
                .hotspot-pro-wrapper.reserved .hotspot-pro-marker { color: #f59e0b; }
                .hotspot-pro-wrapper.sold .hotspot-pro-marker { color: #ef4444; }

                .hotspot-number {
                    color: #0f172a;
                    font-size: 11px;
                    font-weight: 800;
                    font-family: 'Inter', sans-serif;
                }

                .hotspot-main-pulse {
                    position: absolute;
                    inset: -4px;
                    border-radius: 50%;
                    background: currentColor;
                    opacity: 0.3;
                    z-index: 1;
                }

                .hotspot-pro-wrapper:hover .hotspot-pro-marker {
                    transform: scale(1.1);
                    background: currentColor;
                }
                .hotspot-pro-wrapper:hover .hotspot-number {
                    color: white;
                }

                /* RICH TOOLTIP */
                .hotspot-pro-tooltip {
                    position: absolute;
                    bottom: 120%;
                    left: 50%;
                    transform: translateX(-50%) translateY(10px);
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 12px;
                    border-radius: 14px;
                    min-width: 180px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 100;
                    color: white;
                }

                .hotspot-pro-wrapper:hover .hotspot-pro-tooltip {
                    opacity: 1;
                    visibility: visible;
                    transform: translateX(-50%) translateY(0);
                }

                .tooltip-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 8px;
                }

                .tooltip-title {
                    font-weight: 700;
                    font-size: 14px;
                }

                .tooltip-status-badge {
                    font-size: 9px;
                    font-weight: 900;
                    padding: 2px 6px;
                    border-radius: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .tooltip-status-badge.available { background: #10b98120; color: #34d399; }
                .tooltip-status-badge.reserved { background: #f59e0b20; color: #fbbf24; }
                .tooltip-status-badge.sold { background: #ef444420; color: #f87171; }

                .tooltip-price {
                    font-size: 18px;
                    font-weight: 800;
                    color: white;
                    margin-bottom: 10px;
                }

                .tooltip-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    font-weight: 600;
                    color: #94a3b8;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 8px;
                }

                /* SCENE HOTSPOT */
                .hotspot-scene-wrapper {
                    position: relative;
                    transform: translate(-50%, -50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                }

                .hotspot-scene-icon {
                    width: 44px;
                    height: 44px;
                    background: #3b82f6;
                    border: 3px solid white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.5);
                    margin-bottom: 6px;
                }

                .hotspot-scene-label {
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(8px);
                    color: white;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 20px;
                    white-space: nowrap;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .hotspot-scene-wrapper:hover {
                    transform: translate(-50%, -50%) scale(1.1);
                }

                /* GENERIC TOOLTIP */
                .hotspot-generic-tooltip {
                    background: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(8px);
                    color: white;
                    padding: 5px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    transform: translate(-50%, -120%);
                    white-space: nowrap;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                
            `}</style>
        </div>
    );
}
