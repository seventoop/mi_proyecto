"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Viewer } from "@photo-sphere-viewer/core";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import {
    Anchor,
    ArrowRight,
    Camera,
    Check,
    Circle as CircleIcon,
    Grid3x3,
    ImageIcon,
    Link2,
    Loader2,
    MapPin,
    Maximize2,
    Navigation,
    Pencil,
    Plus,
    RotateCcw,
    RotateCw,
    Square,
    Trash2,
    Type,
    X,
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

/**
 * =========================================================
 * Types
 * =========================================================
 */

export type HotspotType =
    | "info"
    | "scene"
    | "link"
    | "lot"
    | "check"
    | "sold"
    | "gallery"
    | "video";

export interface Hotspot {
    id: string;
    type: HotspotType;
    pitch: number;
    yaw: number;
    text: string;
    unidadId?: string; // REQUIRED for UNIT after normalization
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
    style?: "street" | "landmark";
    anchorPitch?: number;
    anchorYaw?: number;
}

export interface MasterplanOverlay {
    imageUrl: string;
    points: { pitch: number; yaw: number }[]; // 4 points
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
        opacity?: number;
        stroke?: string;
        strokeWidth?: number;
        bgColor?: string;
        textColor?: string;
        fontSize?: number;
        fontWeight?: string;
        radius?: number;
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
        opacity: number;
        color?: string;
        bgColor?: string;
        leaderLine?: boolean;
        leaderLineLength?: number;
        shadow?: boolean;
        textColor?: string;
        fontSize?: number;
        fontWeight?: string;
        radius?: number;
    };
    src?: string;
}

export interface Scene {
    id: string;
    title: string;
    imageUrl: string;
    thumbnailUrl?: string;

    hotspots: Hotspot[];

    isDefault?: boolean;
    order?: number;
    category?: "raw" | "rendered";

    polygons?: TourPolygon[];
    floatingLabels?: FloatingLabel[];
    masterplanOverlay?: MasterplanOverlay;

    // ✅ Persisted complex JSON
    overlay2D?: Overlay2D[];
    worldAnchors?: WorldAnchor[];

    // passthrough for backend compatibility
    imageVariants?: any;
}

interface UploadProgress {
    id: string;
    filename: string;
    progress: number;
    status: "uploading" | "processing" | "done" | "error";
    url?: string;
}

interface TourCreatorProps {
    proyectoId: string;
    tourId?: string;
    initialScenes?: Scene[];
    onSave: (scenes: Scene[]) => void;
    onDelete?: () => void;
}

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

const jsonParseSafe = <T,>(val: any, fallback: T): T => {
    if (!val) return fallback;
    if (typeof val === "string") {
        try {
            return JSON.parse(val) as T;
        } catch {
            return fallback;
        }
    }
    return val as T;
};

const normalizeHotspotType = (type: string): "INFO" | "SCENE" | "LINK" | "UNIT" => {
    const t = String(type || "").toLowerCase();
    if (t === "scene") return "SCENE";
    if (t === "link") return "LINK";
    if (["lot", "check", "sold", "unit"].includes(t)) return "UNIT";
    return "INFO";
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * =========================================================
 * Overlay2D (Canva layer)
 * =========================================================
 */

function Overlay2DLayer(props: {
    elements: Overlay2D[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onUpdate: (id: string, updates: Partial<Overlay2D>) => void;
    onDelete: (id: string) => void;
    viewer: any;
}) {
    const { elements, selectedId, onSelect, onUpdate, onDelete, viewer } = props;

    const [dragState, setDragState] = useState<{
        id: string;
        type: "move" | "resize" | "rotate";
        handle?: string;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
        initialR: number;
    } | null>(null);

    const lockViewer = () => { /* PSV handles pointer capture natively */ };
    const unlockViewer = () => { /* PSV handles pointer capture natively */ };

    const onPointerDown = (
        e: React.PointerEvent,
        id: string,
        type: "move" | "resize" | "rotate",
        handle?: string
    ) => {
        e.stopPropagation();
        const el = elements.find((x) => x.id === id);
        if (!el) return;

        onSelect(id);
        setDragState({
            id,
            type,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            initialX: el.x,
            initialY: el.y,
            initialW: el.width,
            initialH: el.height,
            initialR: el.rotation,
        });

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        lockViewer();
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragState) return;
        e.stopPropagation();

        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        const el = elements.find((x) => x.id === dragState.id);
        if (!el) return;

        if (dragState.type === "move") {
            onUpdate(dragState.id, { x: dragState.initialX + dx, y: dragState.initialY + dy });
            return;
        }

        if (dragState.type === "resize") {
            let x = dragState.initialX;
            let y = dragState.initialY;
            let w = dragState.initialW;
            let h = dragState.initialH;

            const hnd = dragState.handle || "";
            if (hnd.includes("right")) w = Math.max(10, dragState.initialW + dx);
            if (hnd.includes("bottom")) h = Math.max(10, dragState.initialH + dy);

            if (hnd.includes("left")) {
                const newW = Math.max(10, dragState.initialW - dx);
                x = dragState.initialX + (dragState.initialW - newW);
                w = newW;
            }
            if (hnd.includes("top")) {
                const newH = Math.max(10, dragState.initialH - dy);
                y = dragState.initialY + (dragState.initialH - newH);
                h = newH;
            }

            onUpdate(dragState.id, { x, y, width: w, height: h });
            return;
        }

        // rotate
        if (dragState.type === "rotate") {
            const cx = dragState.initialX + dragState.initialW / 2;
            const cy = dragState.initialY + dragState.initialH / 2;
            const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
            onUpdate(dragState.id, { rotation: angle + 90 });
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!dragState) return;
        e.stopPropagation();
        setDragState(null);
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch { }
        unlockViewer();
    };

    return (
        <div
            className="absolute inset-0 z-40 pointer-events-none overflow-hidden"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            {elements.map((el) => {
                const isSel = selectedId === el.id;
                const opacity = el.style.opacity ?? 1;

                const style: React.CSSProperties = {
                    position: "absolute",
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    transform: `rotate(${el.rotation}deg)`,
                    opacity,
                    pointerEvents: "auto",
                    cursor: "move",
                    userSelect: "none",
                    zIndex: isSel ? 999 : 50,
                    boxShadow: el.style.shadow ? "0 10px 30px rgba(0,0,0,0.35)" : undefined,
                };

                return (
                    <div
                        key={el.id}
                        style={style}
                        onPointerDown={(e) => onPointerDown(e, el.id, "move")}
                        className={cn("group", isSel && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent")}
                    >
                        {/* render */}
                        {el.type === "rect" && (
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundColor: el.style.bgColor ?? "rgba(99,102,241,0.25)",
                                    border: `${el.style.strokeWidth ?? 2}px solid ${el.style.stroke ?? "#6366f1"}`,
                                    borderRadius: `${el.style.radius ?? 10}px`,
                                }}
                            />
                        )}

                        {el.type === "circle" && (
                            <div
                                className="w-full h-full rounded-full"
                                style={{
                                    backgroundColor: el.style.bgColor ?? "rgba(99,102,241,0.25)",
                                    border: `${el.style.strokeWidth ?? 2}px solid ${el.style.stroke ?? "#6366f1"}`,
                                }}
                            />
                        )}

                        {el.type === "text" && (
                            <div
                                className="w-full h-full flex items-center justify-center p-2 text-center break-words overflow-hidden"
                                style={{
                                    backgroundColor: el.style.bgColor ?? "rgba(15,23,42,0.75)",
                                    color: el.style.textColor ?? "#fff",
                                    border: `${el.style.strokeWidth ?? 1}px solid ${el.style.stroke ?? "rgba(255,255,255,0.18)"}`,
                                    borderRadius: `${el.style.radius ?? 12}px`,
                                    fontSize: el.style.fontSize ?? 14,
                                    fontWeight: el.style.fontWeight as any,
                                }}
                            >
                                {el.text}
                            </div>
                        )}

                        {el.type === "line" && (
                            <div
                                className="w-full h-0 absolute top-1/2 -translate-y-1/2"
                                style={{
                                    borderTop: `${el.style.strokeWidth ?? 3}px solid ${el.style.stroke ?? "#fff"}`,
                                }}
                            />
                        )}

                        {el.type === "arrow" && (
                            <div className="w-full h-0 absolute top-1/2 -translate-y-1/2 flex items-center">
                                <div
                                    className="w-full"
                                    style={{
                                        borderTop: `${el.style.strokeWidth ?? 3}px solid ${el.style.stroke ?? "#fff"}`,
                                    }}
                                />
                                <div
                                    className="absolute right-0 w-3 h-3 border-t-2 border-r-2 rotate-45 -translate-y-1/2"
                                    style={{
                                        borderColor: el.style.stroke ?? "#fff",
                                        borderWidth: el.style.strokeWidth ?? 2,
                                    }}
                                />
                            </div>
                        )}

                        {el.type === "image" && (el.src || "") && (
                            <img src={el.src} alt="" className="w-full h-full object-contain pointer-events-none rounded-xl" />
                        )}

                        {/* handles */}
                        {isSel && (
                            <>
                                {["top-left", "top-right", "bottom-left", "bottom-right"].map((h) => (
                                    <div
                                        key={h}
                                        onPointerDown={(e) => onPointerDown(e, el.id, "resize", h)}
                                        className={cn(
                                            "absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-full z-[1000]",
                                            h === "top-left" && "-top-1.5 -left-1.5 cursor-nwse-resize",
                                            h === "top-right" && "-top-1.5 -right-1.5 cursor-nesw-resize",
                                            h === "bottom-left" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                                            h === "bottom-right" && "-bottom-1.5 -right-1.5 cursor-nwse-resize"
                                        )}
                                    />
                                ))}
                                <div
                                    onPointerDown={(e) => onPointerDown(e, el.id, "rotate")}
                                    className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center cursor-alias z-[1000]"
                                >
                                    <RotateCw className="w-3 h-3 text-indigo-600" />
                                    <div className="absolute top-6 left-1/2 -translate-x-px w-px h-2 bg-indigo-500" />
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(el.id);
                                    }}
                                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg"
                                    title="Eliminar elemento 2D"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * =========================================================
 * Panoramic Overlay (Polygons, Labels, WorldAnchors, Hotspots)
 * =========================================================
 */

function PanoramicOverlay(props: {
    viewer: any;
    viewerRef: React.RefObject<HTMLDivElement>;
    activeScene: Scene | null;
    editorMode: string;
    mouseCoords: { pitch: number; yaw: number } | null;
    currentPolygonPoints: PolygonPoint[];
    pendingOverlayPoints: { pitch: number; yaw: number }[];
    pendingLandmarkAnchor: { pitch: number; yaw: number } | null;
    viewerReady: boolean;

    selectedElementId: string | null;
    setSelectedElementId: (id: string | null) => void;

    onUpdateHotspotPos: (hotspotId: string, pitch: number, yaw: number) => void;
    onUpdateLabelPos: (labelId: string, pitch: number, yaw: number) => void;
    onUpdateWorldAnchorPos: (anchorId: string, pitch: number, yaw: number) => void;
    onDeleteElement: (kind: "hotspot" | "label" | "worldAnchor", id: string) => void;
}) {
    const {
        viewer,
        viewerRef,
        activeScene,
        editorMode,
        mouseCoords,
        currentPolygonPoints,
        pendingOverlayPoints,
        pendingLandmarkAnchor,
        viewerReady,
        selectedElementId,
        setSelectedElementId,
        onUpdateHotspotPos,
        onUpdateLabelPos,
        onUpdateWorldAnchorPos,
        onDeleteElement,
    } = props;

    const [viewState, setViewState] = useState({ hfov: 100, pitch: 0, yaw: 0 });
    const [drag, setDrag] = useState<{ kind: "hotspot" | "label" | "worldAnchor"; id: string } | null>(null);

    useEffect(() => {
        if (!viewer || !viewerReady) return;

        const psvViewer = viewer as Viewer;

        const onPosition = ({ position }: any) => {
            const el = viewerRef.current;
            if (!el) return;
            const maxFov = psvViewer.config.maxFov ?? 110;
            const minFov = psvViewer.config.minFov ?? 30;
            const vFov = maxFov - (maxFov - minFov) * (psvViewer.getZoomLevel() / 100);
            const ar = el.clientWidth / el.clientHeight;
            const hFov = 2 * Math.atan(Math.tan(vFov * Math.PI / 180 / 2) * ar) * (180 / Math.PI);
            setViewState({
                hfov: hFov,
                pitch: position.pitch * (180 / Math.PI),
                yaw: position.yaw * (180 / Math.PI),
            });
        };

        const onZoom = ({ zoomLevel }: any) => {
            const el = viewerRef.current;
            if (!el) return;
            const maxFov = psvViewer.config.maxFov ?? 110;
            const minFov = psvViewer.config.minFov ?? 30;
            const vFov = maxFov - (maxFov - minFov) * (zoomLevel / 100);
            const ar = el.clientWidth / el.clientHeight;
            const hFov = 2 * Math.atan(Math.tan(vFov * Math.PI / 180 / 2) * ar) * (180 / Math.PI);
            setViewState(prev => ({ ...prev, hfov: hFov }));
        };

        try {
            psvViewer.addEventListener('position-updated', onPosition);
            psvViewer.addEventListener('zoom-updated', onZoom);
        } catch { }

        return () => {
            try {
                psvViewer.removeEventListener('position-updated', onPosition);
                psvViewer.removeEventListener('zoom-updated', onZoom);
            } catch { }
        };
    }, [viewer, viewerReady, viewerRef, activeScene?.id]);

    const projectCoords = (pitch: number, yaw: number) => {
        if (!viewer || !viewerRef.current) return null;
        try {
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

            if (rz <= 0.05) return null;

            const canvas_hfov = hfov * degToRad;
            const focalLength = (width / 2) / Math.tan(canvas_hfov / 2);

            const px = (rx / rz) * focalLength + width / 2;
            const py = (-ry / rz) * focalLength + height / 2;

            if (px < -width || px > width * 2 || py < -height || py > height * 2) return null;
            return { x: px, y: py };
        } catch {
            return null;
        }
    };

    const getPolygonPath = (points: PolygonPoint[], closed = true) => {
        if (!points.length) return "";
        const segs: string[] = [];
        let moved = false;

        for (const pt of points) {
            const c = projectCoords(pt.pitch, pt.yaw);
            if (!c) continue;
            if (!moved) {
                segs.push(`M ${c.x},${c.y}`);
                moved = true;
            } else {
                segs.push(`L ${c.x},${c.y}`);
            }
        }
        if (segs.length < 2) return "";
        if (closed && segs.length >= 3) return segs.join(" ") + " Z";
        return segs.join(" ");
    };

    const onPointerDown = (e: React.PointerEvent, kind: "hotspot" | "label" | "worldAnchor", id: string) => {
        if (!viewer || !viewerReady) return;
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        setDrag({ kind, id });
        setSelectedElementId(id);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!viewer || !viewerReady || !drag) return;
        e.stopPropagation();
        try {
            const psvViewer = viewer as Viewer;
            const rect = (psvViewer.container as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const pos = psvViewer.dataHelper.viewerCoordsToSphericalCoords({ x, y });
            if (!pos) return;
            const pitch = pos.pitch * (180 / Math.PI);
            const yaw = pos.yaw * (180 / Math.PI);

            if (drag.kind === "hotspot") onUpdateHotspotPos(drag.id, pitch, yaw);
            if (drag.kind === "label") onUpdateLabelPos(drag.id, pitch, yaw);
            if (drag.kind === "worldAnchor") onUpdateWorldAnchorPos(drag.id, pitch, yaw);
        } catch { }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!drag) return;
        e.stopPropagation();
        setDrag(null);
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch { }
    };

    if (!viewerReady || !activeScene) return null;

    return (
        <div className="absolute inset-0 z-20 pointer-events-none" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            {/* MASTERPLAN overlay (perspective) */}
            {activeScene.masterplanOverlay?.isVisible && (() => {
                const overlay = activeScene.masterplanOverlay!;
                const coords = overlay.points.map((p) => projectCoords(p.pitch, p.yaw));
                if (coords.some((c) => !c)) return null;

                // Perspective transform helper (4-point)
                const src = [
                    { x: 0, y: 0 },
                    { x: 1000, y: 0 },
                    { x: 1000, y: 1000 },
                    { x: 0, y: 1000 },
                ];
                const dst = coords as { x: number; y: number }[];

                const solve = (A: number[][], b: number[]) => {
                    const n = A.length;
                    for (let i = 0; i < n; i++) {
                        let max = i;
                        for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[max][i])) max = j;
                        [A[i], A[max]] = [A[max], A[i]];
                        [b[i], b[max]] = [b[max], b[i]];
                        for (let j = i + 1; j < n; j++) {
                            const f = A[j][i] / A[i][i];
                            b[j] -= f * b[i];
                            for (let k = i; k < n; k++) A[j][k] -= f * A[i][k];
                        }
                    }
                    const x = new Array(n).fill(0);
                    for (let i = n - 1; i >= 0; i--) {
                        let s = 0;
                        for (let j = i + 1; j < n; j++) s += A[i][j] * x[j];
                        x[i] = (b[i] - s) / A[i][i];
                    }
                    return x;
                };

                const getPerspectiveMatrix = () => {
                    const A: number[][] = [];
                    const b: number[] = [];
                    for (let i = 0; i < 4; i++) {
                        A.push([src[i].x, src[i].y, 1, 0, 0, 0, -src[i].x * dst[i].x, -src[i].y * dst[i].x]);
                        b.push(dst[i].x);
                        A.push([0, 0, 0, src[i].x, src[i].y, 1, -src[i].x * dst[i].y, -src[i].y * dst[i].y]);
                        b.push(dst[i].y);
                    }
                    const h = solve(A, b);
                    return [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1];
                };

                const matrix = getPerspectiveMatrix();

                return (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ perspective: "1000px" }}>
                        <div
                            className="absolute top-0 left-0 w-[1000px] h-[1000px] origin-top-left"
                            style={{
                                transform: `matrix3d(${matrix.join(",")})`,
                                opacity: overlay.opacity,
                                backgroundImage: `url(${overlay.imageUrl})`,
                                backgroundSize: "100% 100%",
                            }}
                        />
                    </div>
                );
            })()}

            {/* SVG polygons + helpers */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                {/* Saved polygons */}
                {activeScene.polygons?.map((poly) => (
                    <path
                        key={poly.id}
                        d={getPolygonPath(poly.points)}
                        fill={poly.fillColor || "rgba(16, 185, 129, 0.35)"}
                        stroke={poly.strokeColor || "rgba(255,255,255,0.85)"}
                        strokeWidth={2}
                        opacity={0.8}
                    />
                ))}

                {/* Current polygon */}
                {editorMode === "polygon" && currentPolygonPoints.length > 0 && (
                    <>
                        <path
                            d={getPolygonPath(currentPolygonPoints, false)}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="4 2"
                            opacity={0.9}
                        />
                        {currentPolygonPoints.map((p, i) => {
                            const c = projectCoords(p.pitch, p.yaw);
                            if (!c) return null;
                            return <circle key={i} cx={c.x} cy={c.y} r={5} fill="#3b82f6" opacity={0.85} />;
                        })}
                    </>
                )}

                {/* Pending overlay points (masterplan) */}
                {editorMode === "overlay" &&
                    pendingOverlayPoints.map((p, i) => {
                        const c = projectCoords(p.pitch, p.yaw);
                        if (!c) return null;
                        return (
                            <g key={`ovpt-${i}`}>
                                <circle cx={c.x} cy={c.y} r={6} fill="white" stroke="#3b82f6" strokeWidth={2} />
                                <text x={c.x} y={c.y} dy=".3em" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">
                                    {i + 1}
                                </text>
                            </g>
                        );
                    })}

                {/* Pending landmark line */}
                {pendingLandmarkAnchor && editorMode === "label" && mouseCoords && (() => {
                    const p1 = projectCoords(pendingLandmarkAnchor.pitch, pendingLandmarkAnchor.yaw);
                    const p2 = projectCoords(mouseCoords.pitch, mouseCoords.yaw);
                    if (!p1 || !p2) return null;
                    return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" />;
                })()}
            </svg>

            {/* HOTSPOTS (draggable) */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                {activeScene.hotspots.map((hs) => {
                    const c = projectCoords(hs.pitch, hs.yaw);
                    if (!c) return null;
                    const selected = selectedElementId === hs.id;
                    return (
                        <div
                            key={hs.id}
                            className={cn(
                                "absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2",
                                selected && "ring-2 ring-indigo-500 rounded-full"
                            )}
                            style={{ left: c.x, top: c.y }}
                            onPointerDown={(e) => onPointerDown(e, "hotspot", hs.id)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElementId(hs.id);
                            }}
                            title="Arrastrá para mover"
                        >
                            <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[11px] font-black">
                                {hs.type === "scene" ? "→" : hs.type === "link" ? "🔗" : "i"}
                            </div>

                            {selected && (
                                <button
                                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteElement("hotspot", hs.id);
                                    }}
                                    title="Eliminar hotspot"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* LABELS (draggable) */}
                {activeScene.floatingLabels?.map((lbl) => {
                    const c = projectCoords(lbl.pitch, lbl.yaw);
                    if (!c) return null;
                    const selected = selectedElementId === lbl.id;
                    return (
                        <div
                            key={lbl.id}
                            className={cn(
                                "absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[11px] font-black shadow-xl",
                                lbl.style === "street" ? "bg-slate-900/85 text-white border border-white/10" : "bg-emerald-500 text-white",
                                selected && "ring-2 ring-indigo-500"
                            )}
                            style={{ left: c.x, top: c.y }}
                            onPointerDown={(e) => onPointerDown(e, "label", lbl.id)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElementId(lbl.id);
                            }}
                            title="Arrastrá para mover"
                        >
                            {lbl.text}

                            {selected && (
                                <button
                                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteElement("label", lbl.id);
                                    }}
                                    title="Eliminar label"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* WORLD ANCHORS (draggable) */}
                {activeScene.worldAnchors?.map((wa) => {
                    const c = projectCoords(wa.pitch, wa.yaw);
                    if (!c) return null;
                    const selected = selectedElementId === wa.id;
                    const scale = wa.style?.scale ?? 1;
                    const opacity = wa.style?.opacity ?? 1;

                    return (
                        <div
                            key={wa.id}
                            className={cn(
                                "absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 flex flex-col items-center",
                                selected && "z-50"
                            )}
                            style={{ left: c.x, top: c.y, opacity }}
                            onPointerDown={(e) => onPointerDown(e, "worldAnchor", wa.id)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElementId(wa.id);
                            }}
                            title="Arrastrá para mover"
                        >
                            {wa.style?.leaderLine && (
                                <div
                                    className="w-[2px] bg-white/50"
                                    style={{ height: wa.style.leaderLineLength ?? 100, marginBottom: 8 }}
                                />
                            )}

                            {wa.title && (
                                <div className="mb-2 px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] font-black text-white whitespace-nowrap">
                                    {wa.title}
                                </div>
                            )}

                            <div
                                className={cn(
                                    "shadow-2xl border-2 border-white/80",
                                    wa.kind === "icon" ? "w-11 h-11 rounded-full" : "rounded-2xl"
                                )}
                                style={{
                                    transform: `scale(${scale})`,
                                    backgroundColor: wa.kind === "icon" ? wa.style?.bgColor ?? "#6366f1" : "rgba(15,23,42,0.7)",
                                    padding: wa.kind === "icon" ? 10 : 10,
                                    minWidth: wa.kind !== "icon" ? 120 : undefined,
                                }}
                            >
                                {wa.kind === "icon" && <Anchor className="w-full h-full text-white" />}
                                {wa.kind === "text" && (
                                    <div
                                        className="text-white text-[12px] font-bold"
                                        style={{
                                            color: wa.style?.textColor ?? "#fff",
                                            fontSize: wa.style?.fontSize ?? 12,
                                            fontWeight: wa.style?.fontWeight as any,
                                        }}
                                    >
                                        {wa.text || "Texto"}
                                    </div>
                                )}
                                {wa.kind === "image" && (wa.imageUrl || wa.src) && (
                                    <img src={wa.imageUrl || wa.src} alt="" className="w-full h-full object-contain rounded-xl" />
                                )}
                            </div>

                            {selected && (
                                <button
                                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteElement("worldAnchor", wa.id);
                                    }}
                                    title="Eliminar anchor"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * =========================================================
 * Main Component
 * =========================================================
 */

export default function TourCreator({
    proyectoId,
    tourId,
    initialScenes = [],
    onSave,
    onDelete,
}: TourCreatorProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const viewerInstance = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [viewerReady, setViewerReady] = useState(false);

    const [scenes, setScenes] = useState<Scene[]>([]);
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const [isDraggingFiles, setIsDraggingFiles] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    const [editorMode, setEditorMode] = useState<
        "view" | "hotspot" | "polygon" | "label" | "overlay" | "overlay2D" | "worldAnchor"
    >("view");

    const [hotspotMode, setHotspotMode] = useState<HotspotType>("info");
    const [linkTargetScene, setLinkTargetScene] = useState<string>("");

    const [projectUnits, setProjectUnits] = useState<{ id: string; numero: string }[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<string>("");

    const [mouseCoords, setMouseCoords] = useState<{ pitch: number; yaw: number } | null>(null);
    const [lastDragTime, setLastDragTime] = useState(0);

    // polygons
    const [currentPolygonPoints, setCurrentPolygonPoints] = useState<PolygonPoint[]>([]);
    const [polygonHoverText, setPolygonHoverText] = useState<string>("Lote Disponible");
    const [polygonLinkedUnitId, setPolygonLinkedUnitId] = useState<string>("");

    // masterplan overlay placement
    const [pendingOverlayPoints, setPendingOverlayPoints] = useState<{ pitch: number; yaw: number }[]>([]);

    // labels placement
    const [pendingLandmarkAnchor, setPendingLandmarkAnchor] = useState<{ pitch: number; yaw: number } | null>(null);

    // selection
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

    // Overlay2D selection
    const [selected2DId, setSelected2DId] = useState<string | null>(null);

    const activeScene = useMemo(() => scenes.find((s) => s.id === activeSceneId) || null, [scenes, activeSceneId]);

    /**
     * =========================================================
     * Hydration initialScenes
     * =========================================================
     */
    useEffect(() => {
        if (!initialScenes?.length) {
            setScenes([]);
            setActiveSceneId(null);
            return;
        }

        const hydrated = initialScenes.map((s) => ({
            ...s,
            hotspots: s.hotspots || [],
            polygons: jsonParseSafe<TourPolygon[]>((s as any).polygons, []),
            floatingLabels: jsonParseSafe<FloatingLabel[]>((s as any).floatingLabels, []),
            masterplanOverlay: jsonParseSafe<MasterplanOverlay | undefined>((s as any).masterplanOverlay, undefined),
            overlay2D: jsonParseSafe<Overlay2D[]>((s as any).overlay2D, []),
            worldAnchors: jsonParseSafe<WorldAnchor[]>((s as any).worldAnchors, []),
            category: (s.category?.toLowerCase() || "raw") as "raw" | "rendered",
        }));

        setScenes(hydrated);
        setActiveSceneId(hydrated.find((x) => x.isDefault)?.id || hydrated[0]?.id || null);
    }, [initialScenes]);

    /**
     * =========================================================
     * Fetch Units
     * =========================================================
     */
    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const { getAllUnidades } = await import("@/lib/actions/unidades");
                const res = await getAllUnidades({ proyectoId, pageSize: 1000 });
                if (res.success && res.data) {
                    setProjectUnits(res.data.map((u: any) => ({ id: u.id, numero: u.numero })));
                }
            } catch (err) {
                console.error("Error fetching units:", err);
            }
        };
        if (proyectoId) fetchUnits();
    }, [proyectoId]);

    /**
     * =========================================================
     * PSV init / scene switch
     * =========================================================
     */
    const hasScenes = scenes.length > 0;

    // Create the viewer once when scenes become available
    useEffect(() => {
        if (!viewerRef.current || !hasScenes || viewerInstance.current) return;

        const scene = scenes.find(s => s.id === activeSceneId) || scenes[0];

        try {
            const psv = new Viewer({
                container: viewerRef.current,
                panorama: scene.imageUrl,
                defaultYaw: 0,
                defaultPitch: 0,
                defaultZoomLvl: 50,
                minFov: 30,
                maxFov: 110,
                navbar: false,
                plugins: [[MarkersPlugin, {}]],
            });

            viewerInstance.current = psv;
            psv.addEventListener('ready', () => setViewerReady(true));
        } catch (err) {
            console.error("PSV init error:", err);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasScenes]);

    // Switch panorama when active scene changes (viewer already exists)
    useEffect(() => {
        if (!viewerInstance.current || !viewerReady || !activeSceneId) return;
        const scene = scenes.find(s => s.id === activeSceneId);
        if (!scene) return;
        try {
            (viewerInstance.current as Viewer).setPanorama(scene.imageUrl);
        } catch { }
    }, [activeSceneId, viewerReady, scenes]);

    useEffect(() => {
        return () => {
            try {
                (viewerInstance.current as Viewer)?.destroy();
            } catch { }
            viewerInstance.current = null;
        };
    }, []);

    /**
     * =========================================================
     * Viewer interactions
     * =========================================================
     */
    const getPSVCoordsFromEvent = useCallback((e: React.MouseEvent): { pitch: number; yaw: number } | null => {
        const psv = viewerInstance.current as Viewer | null;
        if (!psv) return null;
        try {
            const rect = (psv.container as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const pos = psv.dataHelper.viewerCoordsToSphericalCoords({ x, y });
            if (!pos) return null;
            return {
                pitch: pos.pitch * (180 / Math.PI),
                yaw: pos.yaw * (180 / Math.PI),
            };
        } catch {
            return null;
        }
    }, []);

    const handleViewerMouseMove = useCallback(
        (e: React.MouseEvent) => {
            const coords = getPSVCoordsFromEvent(e);
            if (!coords) return;
            setMouseCoords(coords);
        },
        [getPSVCoordsFromEvent]
    );

    const handleViewerClick = useCallback(
        (e: React.MouseEvent) => {
            if (!activeSceneId) return;

            // avoid click right after a drag
            if (Date.now() - lastDragTime < 180) return;

            if (editorMode === "view") return;

            const coords = getPSVCoordsFromEvent(e);
            if (!coords) return;
            const { pitch, yaw } = coords;

            // HOTSPOT
            if (editorMode === "hotspot") {
                if (!selectedUnitId) {
                    alert("Seleccioná una unidad antes de colocar el hotspot.");
                    return;
                }

                const targetScene = scenes.find((s) => s.id === linkTargetScene);
                const selectedUnit = projectUnits.find((u) => u.id === selectedUnitId);

                const newHotspot: Hotspot = {
                    id: uid("hs"),
                    type: hotspotMode,
                    pitch,
                    yaw,
                    text:
                        hotspotMode === "scene"
                            ? targetScene?.title || "Ir a escena"
                            : selectedUnit
                                ? `Unidad ${selectedUnit.numero}`
                                : "Punto",
                    unidadId: selectedUnitId,
                    targetSceneId: hotspotMode === "scene" ? linkTargetScene : undefined,
                    targetThumbnail: hotspotMode === "scene" ? targetScene?.imageUrl : undefined,
                    icon: hotspotMode === "lot" ? "lot" : "info",
                };

                setScenes((prev) =>
                    prev.map((s) => (s.id === activeSceneId ? { ...s, hotspots: [...(s.hotspots || []), newHotspot] } : s))
                );

                setEditorMode("view");
                return;
            }

            // POLYGON
            if (editorMode === "polygon") {
                setCurrentPolygonPoints((prev) => [...prev, { pitch, yaw }]);
                return;
            }

            // LABEL
            if (editorMode === "label") {
                if (!pendingLandmarkAnchor) {
                    setPendingLandmarkAnchor({ pitch, yaw });
                    return;
                }

                const text = prompt("Texto de la etiqueta:");
                if (text && text.trim()) {
                    const newLbl: FloatingLabel = {
                        id: uid("lbl"),
                        text: text.trim(),
                        pitch: pendingLandmarkAnchor.pitch,
                        yaw: pendingLandmarkAnchor.yaw,
                        anchorPitch: pitch,
                        anchorYaw: yaw,
                        style: "landmark",
                    };

                    setScenes((prev) =>
                        prev.map((s) =>
                            s.id === activeSceneId ? { ...s, floatingLabels: [...(s.floatingLabels || []), newLbl] } : s
                        )
                    );
                }

                setPendingLandmarkAnchor(null);
                setEditorMode("view");
                return;
            }

            // MASTERPLAN overlay (4 points)
            if (editorMode === "overlay") {
                const next = [...pendingOverlayPoints, { pitch, yaw }];
                if (next.length < 4) {
                    setPendingOverlayPoints(next);
                    return;
                }
                const imageUrl = prompt("URL de imagen del masterplan (PNG/JPG):");
                if (imageUrl && imageUrl.trim()) {
                    const overlay: MasterplanOverlay = {
                        imageUrl: imageUrl.trim(),
                        points: next,
                        opacity: 0.6,
                        isVisible: true,
                    };
                    setScenes((prev) => prev.map((s) => (s.id === activeSceneId ? { ...s, masterplanOverlay: overlay } : s)));
                }
                setPendingOverlayPoints([]);
                setEditorMode("view");
                return;
            }

            // WORLD ANCHOR (FIJAR)
            if (editorMode === "worldAnchor") {
                const title = prompt("Título del punto (ej: Escuela, Acceso, etc):") || "Punto";
                const newWA: WorldAnchor = {
                    id: uid("wa"),
                    kind: "icon",
                    pitch,
                    yaw,
                    title,
                    style: {
                        scale: 1,
                        opacity: 1,
                        bgColor: "#6366f1",
                        leaderLine: true,
                        leaderLineLength: 90,
                        shadow: true,
                        textColor: "#fff",
                        fontSize: 12,
                        fontWeight: "900",
                        radius: 12,
                    },
                };

                setScenes((prev) =>
                    prev.map((s) => (s.id === activeSceneId ? { ...s, worldAnchors: [...(s.worldAnchors || []), newWA] } : s))
                );
                setEditorMode("view");
                return;
            }
        },
        [
            editorMode,
            activeSceneId,
            scenes,
            hotspotMode,
            linkTargetScene,
            selectedUnitId,
            projectUnits,
            pendingLandmarkAnchor,
            pendingOverlayPoints,
            lastDragTime,
            getPSVCoordsFromEvent,
        ]
    );

    /**
     * =========================================================
     * Update / Delete overlay elements
     * =========================================================
     */
    const updateScene = (sceneId: string, updater: (s: Scene) => Scene) => {
        setScenes((prev) => prev.map((s) => (s.id === sceneId ? updater(s) : s)));
    };

    const onUpdateHotspotPos = (hotspotId: string, pitch: number, yaw: number) => {
        if (!activeSceneId) return;
        updateScene(activeSceneId, (s) => ({
            ...s,
            hotspots: (s.hotspots || []).map((h) => (h.id === hotspotId ? { ...h, pitch, yaw } : h)),
        }));
        setLastDragTime(Date.now());
    };

    const onUpdateLabelPos = (labelId: string, pitch: number, yaw: number) => {
        if (!activeSceneId) return;
        updateScene(activeSceneId, (s) => ({
            ...s,
            floatingLabels: (s.floatingLabels || []).map((l) => (l.id === labelId ? { ...l, pitch, yaw } : l)),
        }));
        setLastDragTime(Date.now());
    };

    const onUpdateWorldAnchorPos = (anchorId: string, pitch: number, yaw: number) => {
        if (!activeSceneId) return;
        updateScene(activeSceneId, (s) => ({
            ...s,
            worldAnchors: (s.worldAnchors || []).map((a) => (a.id === anchorId ? { ...a, pitch, yaw } : a)),
        }));
        setLastDragTime(Date.now());
    };

    const onDeleteElement = (kind: "hotspot" | "label" | "worldAnchor", id: string) => {
        if (!activeSceneId) return;
        if (kind === "hotspot") {
            updateScene(activeSceneId, (s) => ({ ...s, hotspots: (s.hotspots || []).filter((h) => h.id !== id) }));
        }
        if (kind === "label") {
            updateScene(activeSceneId, (s) => ({
                ...s,
                floatingLabels: (s.floatingLabels || []).filter((l) => l.id !== id),
            }));
        }
        if (kind === "worldAnchor") {
            updateScene(activeSceneId, (s) => ({
                ...s,
                worldAnchors: (s.worldAnchors || []).filter((a) => a.id !== id),
            }));
        }
        if (selectedElementId === id) setSelectedElementId(null);
    };

    /**
     * =========================================================
     * Overlay2D controls
     * =========================================================
     */
    const handleAddOverlay2D = (type: Overlay2D["type"]) => {
        if (!activeSceneId) return;
        const base: Overlay2D = {
            id: uid("ov2d"),
            type,
            x: 120,
            y: 120,
            width: type === "text" ? 220 : 120,
            height: type === "text" ? 80 : 120,
            rotation: 0,
            text: type === "text" ? "Nuevo texto" : undefined,
            style: {
                opacity: 1,
                stroke: "rgba(255,255,255,0.25)",
                strokeWidth: 2,
                bgColor: type === "text" ? "rgba(15,23,42,0.65)" : "rgba(99,102,241,0.22)",
                textColor: "#fff",
                fontSize: 14,
                fontWeight: "900",
                radius: 14,
                shadow: true,
            },
        };

        updateScene(activeSceneId, (s) => ({ ...s, overlay2D: [...(s.overlay2D || []), base] }));
        setSelected2DId(base.id);
        setEditorMode("overlay2D");
    };

    const handleUpdateOverlay2D = (id: string, updates: Partial<Overlay2D>) => {
        if (!activeSceneId) return;
        updateScene(activeSceneId, (s) => ({
            ...s,
            overlay2D: (s.overlay2D || []).map((el) => (el.id === id ? { ...el, ...updates } : el)),
        }));
    };

    const handleDeleteOverlay2D = (id: string) => {
        if (!activeSceneId) return;
        updateScene(activeSceneId, (s) => ({ ...s, overlay2D: (s.overlay2D || []).filter((el) => el.id !== id) }));
        if (selected2DId === id) setSelected2DId(null);
    };

    /**
     * =========================================================
     * Polygons finish/undo/cancel
     * =========================================================
     */
    const finishPolygon = () => {
        if (!activeSceneId) return;
        if (currentPolygonPoints.length < 3) {
            alert("Un polígono necesita al menos 3 puntos.");
            return;
        }
        const poly: TourPolygon = {
            id: uid("poly"),
            points: [...currentPolygonPoints],
            fillColor: "rgba(16, 185, 129, 0.35)",
            strokeColor: "rgba(255,255,255,0.85)",
            hoverText: polygonHoverText || "Lote",
            linkedUnitId: polygonLinkedUnitId || undefined,
        };

        updateScene(activeSceneId, (s) => ({ ...s, polygons: [...(s.polygons || []), poly] }));
        setCurrentPolygonPoints([]);
        setPolygonHoverText("Lote Disponible");
        setPolygonLinkedUnitId("");
        setEditorMode("view");
    };

    const undoPolygonPoint = () => setCurrentPolygonPoints((prev) => prev.slice(0, -1));
    const cancelPolygon = () => {
        setCurrentPolygonPoints([]);
        setEditorMode("view");
    };

    /**
     * =========================================================
     * Upload with progress (projectId required)
     * =========================================================
     */
    const MAX_UPLOAD_MB = parseInt(process.env.NEXT_PUBLIC_TOUR360_MAX_UPLOAD_MB || "80", 10);
    const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

    const uploadFileWithProgress = async (file: File): Promise<{ url: string; filename: string; imageVariants?: any } | null> => {
        if (file.size > MAX_UPLOAD_BYTES) {
            alert(`"${file.name}" excede el límite de ${MAX_UPLOAD_MB}MB`);
            return null;
        }

        const id = uid("upload");
        setUploads((prev) => [...prev, { id, filename: file.name, progress: 0, status: "uploading" }]);

        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append("file", file);
            formData.append("projectId", proyectoId); // ✅ requerido por backend

            xhr.upload.addEventListener("progress", (e) => {
                if (!e.lengthComputable) return;
                const pct = Math.round((e.loaded / e.total) * 100);
                setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
                if (pct >= 100) setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "processing" } : u)));
            });

            xhr.addEventListener("load", () => {
                try {
                    const data = JSON.parse(xhr.responseText || "{}");
                    if (xhr.status >= 200 && xhr.status < 300 && data.success) {
                        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "done", progress: 100, url: data.url } : u)));
                        resolve({ url: data.url, filename: file.name, imageVariants: data.imageVariants });
                    } else {
                        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", progress: 0 } : u)));
                        alert(`Error subiendo "${file.name}": ${data.error || `HTTP ${xhr.status}`}`);
                        resolve(null);
                    }
                } catch {
                    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", progress: 0 } : u)));
                    alert(`Error inesperado subiendo "${file.name}"`);
                    resolve(null);
                }
            });

            xhr.addEventListener("error", () => {
                setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", progress: 0 } : u)));
                alert(`Error de red subiendo "${file.name}"`);
                resolve(null);
            });

            xhr.open("POST", "/api/upload/360");
            xhr.send(formData);
        });
    };

    const validateEquirectangular = (file: File): Promise<{ valid: boolean; width: number; height: number; ratio: number }> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                const valid = Math.abs(ratio - 2) < 0.2;
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
        const arr = Array.from(files);
        const valid = arr.filter((f) => f.type.startsWith("image/"));

        if (!valid.length) return;

        const okFiles: File[] = [];
        for (const f of valid) {
            const res = await validateEquirectangular(f);
            if (!res.valid) {
                const proceed = confirm(
                    `⚠️ "${f.name}" no es 2:1 equirectangular.\n\n` +
                    `Resolución: ${res.width}×${res.height} (ratio ${res.ratio.toFixed(2)}:1)\n\n` +
                    `¿Continuar igual?`
                );
                if (!proceed) continue;
            }
            okFiles.push(f);
        }
        if (!okFiles.length) return;

        const results = await Promise.all(okFiles.map(uploadFileWithProgress));

        const newScenes: Scene[] = results
            .filter((r): r is { url: string; filename: string; imageVariants?: any } => Boolean(r))
            .map((r, i) => ({
                id: uid(`scene${i}`),
                title: r.filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
                imageUrl: r.url,
                hotspots: [],
                polygons: [],
                floatingLabels: [],
                overlay2D: [],
                worldAnchors: [],
                masterplanOverlay: undefined,
                isDefault: scenes.length === 0 && i === 0,
                order: scenes.length + i,
                category: "raw",
                imageVariants: r.imageVariants || {},
            }));

        if (newScenes.length) {
            setScenes((prev) => [...prev, ...newScenes]);
            if (!activeSceneId) setActiveSceneId(newScenes[0].id);
        }

        setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.status !== "done"));
        }, 1500);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFiles(false);
        handleFilesSelected(e.dataTransfer.files);
    };

    /**
     * =========================================================
     * Save / Delete
     * =========================================================
     */
    const handleSave = async () => {
        if (!scenes.length) return;

        // ✅ Validate UNIT hotspots have unidadId
        for (const s of scenes) {
            for (const h of s.hotspots || []) {
                const norm = normalizeHotspotType(h.type);
                if (norm === "UNIT" && (!h.unidadId || h.unidadId === "demo-unidad")) {
                    alert(`Error en escena "${s.title}": hotspot "${h.text || h.id}" requiere unidad válida.`);
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            const { upsertTour } = await import("@/lib/actions/tours");

            const payload = {
                id: tourId,
                proyectoId,
                nombre: `Tour 360 - ${new Date().toLocaleDateString()}`,
                scenes: scenes.map((s, idx) => ({
                    id: s.id.startsWith("scene-") || s.id.startsWith("scene") ? undefined : s.id,
                    title: s.title,
                    imageUrl: s.imageUrl,
                    isDefault: s.isDefault || (idx === 0 && !scenes.some((x) => x.isDefault)),
                    order: idx,
                    category: (s.category || "raw").toUpperCase(),
                    hotspots: (s.hotspots || []).map((h) => ({
                        unidadId: h.unidadId,
                        type: normalizeHotspotType(h.type),
                        pitch: h.pitch,
                        yaw: h.yaw,
                        text: h.text,
                        targetSceneId: h.targetSceneId ?? null,
                    })),
                    polygons: s.polygons || [],
                    floatingLabels: s.floatingLabels || [],
                    masterplanOverlay: s.masterplanOverlay || {},
                    imageVariants: s.imageVariants || {},
                    overlay2D: s.overlay2D || [],
                    worldAnchors: s.worldAnchors || [],
                })),
            };

            const res = await upsertTour(payload);
            if (!res.success) throw new Error(res.error || "Error al guardar");

            alert("Tour guardado con éxito.");
            onSave(scenes);
        } catch (err: any) {
            console.error("Save error:", err);
            alert(`Error al guardar: ${err?.message || "Error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTour = async () => {
        if (!onDelete) return;
        if (!confirm("¿Eliminar este tour completo? No se puede deshacer.")) return;

        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * =========================================================
     * UI helpers
     * =========================================================
     */
    const deleteScene = (sceneId: string) => {
        setScenes((prev) => prev.filter((s) => s.id !== sceneId));
        if (activeSceneId === sceneId) {
            const rem = scenes.filter((s) => s.id !== sceneId);
            setActiveSceneId(rem[0]?.id || null);
        }
    };

    const resetView = () => {
        try {
            (viewerInstance.current as Viewer)?.rotate({ yaw: 0, pitch: 0 });
            (viewerInstance.current as Viewer)?.zoom(50);
        } catch { }
    };

    /**
     * =========================================================
     * Render
     * =========================================================
     */
    return (
        <div className="flex flex-col h-[calc(100vh-90px)] gap-4">

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 min-h-0">
                {/* LEFT VIEWER */}
                <div className="relative bg-slate-950 rounded-3xl overflow-hidden border border-white/10 min-h-[520px] shadow-2xl">
                    {scenes.length > 0 ? (
                        <>
                            <div
                                ref={viewerRef}
                                className={cn("w-full h-full", editorMode !== "view" && "cursor-crosshair")}
                                onMouseMove={handleViewerMouseMove}
                                onMouseLeave={() => setMouseCoords(null)}
                                onClick={handleViewerClick}
                            />

                            {/* overlays */}
                            <PanoramicOverlay
                                viewer={viewerInstance.current}
                                viewerRef={viewerRef}
                                activeScene={activeScene}
                                editorMode={editorMode}
                                mouseCoords={mouseCoords}
                                currentPolygonPoints={currentPolygonPoints}
                                pendingOverlayPoints={pendingOverlayPoints}
                                pendingLandmarkAnchor={pendingLandmarkAnchor}
                                viewerReady={viewerReady}
                                selectedElementId={selectedElementId}
                                setSelectedElementId={setSelectedElementId}
                                onUpdateHotspotPos={onUpdateHotspotPos}
                                onUpdateLabelPos={onUpdateLabelPos}
                                onUpdateWorldAnchorPos={onUpdateWorldAnchorPos}
                                onDeleteElement={onDeleteElement}
                            />

                            {/* 2D overlay layer */}
                            {activeScene && (
                                <Overlay2DLayer
                                    elements={activeScene.overlay2D || []}
                                    selectedId={selected2DId}
                                    onSelect={setSelected2DId}
                                    onUpdate={handleUpdateOverlay2D}
                                    onDelete={handleDeleteOverlay2D}
                                    viewer={viewerInstance.current}
                                />
                            )}

                            {/* TOP MODE BAR */}
                            <AnimatePresence>
                                {editorMode !== "view" && (
                                    <motion.div
                                        initial={{ y: -10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -10, opacity: 0 }}
                                        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/70 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl shadow-2xl min-w-[320px]"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-xs font-black uppercase tracking-widest text-indigo-300">
                                                {editorMode === "hotspot" && "Modo: Hotspot"}
                                                {editorMode === "polygon" && `Modo: Polígono (${currentPolygonPoints.length})`}
                                                {editorMode === "label" && "Modo: Etiqueta"}
                                                {editorMode === "overlay" && `Modo: Plano (${pendingOverlayPoints.length}/4)`}
                                                {editorMode === "overlay2D" && "Modo: Overlay 2D"}
                                                {editorMode === "worldAnchor" && "Modo: FIJAR (World Anchor)"}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (editorMode === "polygon") cancelPolygon();
                                                    setPendingLandmarkAnchor(null);
                                                    setPendingOverlayPoints([]);
                                                    setEditorMode("view");
                                                }}
                                                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
                                                title="Salir del modo"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="mt-2 text-[11px] text-white/70">
                                            {editorMode === "hotspot" && "Click en el panorama para colocar. (Requiere unidad seleccionada)."}
                                            {editorMode === "polygon" && "Click para sumar puntos. Terminar cuando tengas 3+."}
                                            {editorMode === "label" && (!pendingLandmarkAnchor ? "Click en el punto base." : "Click donde flota el texto.")}
                                            {editorMode === "overlay" && "Marcá 4 esquinas del terreno."}
                                            {editorMode === "overlay2D" && "Agregá elementos con la barra inferior (tipo Canva)."}
                                            {editorMode === "worldAnchor" && "Click en el panorama para FIJAR un punto 3D."}
                                        </div>

                                        {editorMode === "polygon" && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                <input
                                                    value={polygonHoverText}
                                                    onChange={(e) => setPolygonHoverText(e.target.value)}
                                                    placeholder="Texto (ej: Lote 45)"
                                                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                                                />
                                                <select
                                                    value={polygonLinkedUnitId}
                                                    onChange={(e) => setPolygonLinkedUnitId(e.target.value)}
                                                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                                                >
                                                    <option value="">(Opcional) Vincular a unidad...</option>
                                                    {projectUnits.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            Unidad {u.numero}
                                                        </option>
                                                    ))}
                                                </select>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={undoPolygonPoint}
                                                        disabled={currentPolygonPoints.length === 0}
                                                        className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black disabled:opacity-40"
                                                    >
                                                        Deshacer
                                                    </button>
                                                    <button
                                                        onClick={finishPolygon}
                                                        disabled={currentPolygonPoints.length < 3}
                                                        className="flex-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black disabled:opacity-40"
                                                    >
                                                        Terminar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* LEFT TOOLBAR */}
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
                                <div className="bg-black/55 backdrop-blur-2xl rounded-3xl border border-white/10 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
                                    <button
                                        onClick={() => setEditorMode(editorMode === "label" ? "view" : "label")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all flex items-center justify-center",
                                            editorMode === "label" ? "bg-indigo-600 text-white" : "text-white/70 hover:bg-white/10"
                                        )}
                                        title="Etiqueta"
                                    >
                                        <MapPin className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => setEditorMode(editorMode === "polygon" ? "view" : "polygon")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all flex items-center justify-center mt-2",
                                            editorMode === "polygon" ? "bg-indigo-600 text-white" : "text-white/70 hover:bg-white/10"
                                        )}
                                        title="Polígono"
                                    >
                                        <Grid3x3 className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => setEditorMode(editorMode === "hotspot" ? "view" : "hotspot")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all flex items-center justify-center mt-2",
                                            editorMode === "hotspot" ? "bg-indigo-600 text-white" : "text-white/70 hover:bg-white/10"
                                        )}
                                        title="Hotspot"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => setEditorMode(editorMode === "overlay" ? "view" : "overlay")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all flex items-center justify-center mt-2",
                                            editorMode === "overlay" ? "bg-indigo-600 text-white" : "text-white/70 hover:bg-white/10"
                                        )}
                                        title="Plano (overlay)"
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => setEditorMode(editorMode === "worldAnchor" ? "view" : "worldAnchor")}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all flex items-center justify-center mt-2",
                                            editorMode === "worldAnchor" ? "bg-emerald-600 text-white" : "text-white/70 hover:bg-white/10"
                                        )}
                                        title="FIJAR (World Anchor)"
                                    >
                                        <Anchor className="w-5 h-5" />
                                    </button>

                                    <div className="h-px bg-white/10 my-2" />

                                    <button
                                        onClick={resetView}
                                        className="p-3 rounded-2xl text-white/70 hover:bg-white/10 transition-all flex items-center justify-center"
                                        title="Reiniciar vista"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* BOTTOM BAR */}
                            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/60 backdrop-blur-2xl px-4 py-3 rounded-2xl border border-white/10 shadow-2xl">
                                {/* Overlay2D quick add */}
                                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                                    <button
                                        onClick={() => handleAddOverlay2D("text")}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white"
                                        title="Texto 2D"
                                    >
                                        <Type className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleAddOverlay2D("rect")}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white"
                                        title="Rectángulo 2D"
                                    >
                                        <Square className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleAddOverlay2D("circle")}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white"
                                        title="Círculo 2D"
                                    >
                                        <CircleIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleAddOverlay2D("arrow")}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white"
                                        title="Flecha 2D"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="h-6 w-px bg-white/15" />

                                <div className="text-white text-sm font-black max-w-[260px] truncate text-center">
                                    {activeScene?.title || "Sin escena"}
                                </div>

                                <div className="h-6 w-px bg-white/15" />

                                <button
                                    onClick={() => viewerInstance.current?.toggleFullscreen?.()}
                                    className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-white transition-all"
                                    title="Fullscreen"
                                >
                                    <Maximize2 className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDraggingFiles(true);
                            }}
                            onDragLeave={() => setIsDraggingFiles(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all",
                                isDraggingFiles ? "bg-indigo-600/10 border-2 border-dashed border-indigo-500" : "hover:bg-white/5"
                            )}
                        >
                            <Camera className="w-16 h-16 text-white/30 mb-4" />
                            <div className="text-white font-black text-lg">Subí tus imágenes 360°</div>
                            <div className="text-white/60 text-sm mt-2">Arrastrá o hacé click para seleccionar (ideal 2:1).</div>
                            <div className="text-white/40 text-xs mt-2">Límite: {MAX_UPLOAD_MB}MB</div>
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

                {/* RIGHT SIDEBAR */}
                <div className="flex flex-col bg-black rounded-3xl border border-white/10 overflow-hidden min-h-0 shadow-2xl">
                    {/* header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="text-white font-black tracking-wide">Tour360</div>

                        <div className="flex items-center gap-2">
                            <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                                <DialogTrigger asChild>
                                    <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-black flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Galería
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-5xl h-[82vh] flex flex-col p-0 bg-slate-950 border-white/10 text-white">
                                    <DialogHeader className="p-4 border-b border-white/10">
                                        <DialogTitle>Galería de Imágenes 360°</DialogTitle>
                                        <DialogDescription className="text-white/60">Seleccioná una escena o subí nuevas imágenes.</DialogDescription>
                                    </DialogHeader>

                                    <div className="flex-1 overflow-y-auto p-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square rounded-2xl border-2 border-dashed border-white/15 hover:border-indigo-400 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all"
                                            >
                                                <Plus className="w-10 h-10 text-white/40 mb-2" />
                                                <div className="text-xs font-black text-white/70">Subir imagen</div>
                                            </div>

                                            {scenes.map((s) => (
                                                <div key={s.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-400 transition-all">
                                                    <img src={s.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                        <div className="text-xs font-black truncate">{s.title}</div>
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => {
                                                                    setActiveSceneId(s.id);
                                                                    setIsGalleryOpen(false);
                                                                }}
                                                                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-indigo-600 text-xs font-black"
                                                            >
                                                                Ver
                                                            </button>
                                                            <button
                                                                onClick={() => deleteScene(s.id)}
                                                                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-rose-600"
                                                                title="Eliminar escena"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {activeSceneId === s.id && (
                                                        <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_18px_rgba(99,102,241,0.8)]" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {onDelete && (
                                <button
                                    onClick={handleDeleteTour}
                                    disabled={isDeleting}
                                    className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-black"
                                >
                                    {isDeleting ? "Eliminando..." : "Eliminar"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* upload progress */}
                    <AnimatePresence>
                        {uploads.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-b border-white/10"
                            >
                                <div className="p-4 space-y-3">
                                    {uploads.map((u) => (
                                        <div key={u.id} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-black text-white/80 truncate">{u.filename}</div>
                                                <div className="text-[10px] font-black text-white/60">
                                                    {u.status === "uploading" ? `${u.progress}%` : u.status === "processing" ? "Procesando" : u.status}
                                                </div>
                                            </div>
                                            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${u.progress}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* HOTSPOT CONTROLS */}
                    <div className="p-4 border-b border-white/10 space-y-3">
                        <div className="text-[11px] font-black text-white/60 uppercase tracking-[0.18em]">Hotspots</div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/50 uppercase">Unidad</label>
                            <select
                                value={selectedUnitId}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                            >
                                <option value="">Seleccionar unidad...</option>
                                {projectUnits.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        Unidad {u.numero}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => {
                                    setHotspotMode("info");
                                    setEditorMode("hotspot");
                                }}
                                className={cn(
                                    "px-3 py-2 rounded-2xl text-xs font-black border transition-all",
                                    editorMode === "hotspot" && hotspotMode === "info"
                                        ? "bg-indigo-600 text-white border-indigo-500"
                                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                                )}
                            >
                                <MapPin className="w-4 h-4 mx-auto mb-1" />
                                Info
                            </button>

                            <button
                                onClick={() => {
                                    setHotspotMode("scene");
                                    setEditorMode("hotspot");
                                }}
                                className={cn(
                                    "px-3 py-2 rounded-2xl text-xs font-black border transition-all",
                                    editorMode === "hotspot" && hotspotMode === "scene"
                                        ? "bg-indigo-600 text-white border-indigo-500"
                                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                                )}
                            >
                                <Navigation className="w-4 h-4 mx-auto mb-1" />
                                Escena
                            </button>

                            <button
                                onClick={() => {
                                    setHotspotMode("link");
                                    setEditorMode("hotspot");
                                }}
                                className={cn(
                                    "px-3 py-2 rounded-2xl text-xs font-black border transition-all",
                                    editorMode === "hotspot" && hotspotMode === "link"
                                        ? "bg-indigo-600 text-white border-indigo-500"
                                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                                )}
                            >
                                <Link2 className="w-4 h-4 mx-auto mb-1" />
                                Link
                            </button>
                        </div>

                        {editorMode === "hotspot" && hotspotMode === "scene" && (
                            <select
                                value={linkTargetScene}
                                onChange={(e) => setLinkTargetScene(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-400"
                            >
                                <option value="">Escena destino...</option>
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

                    {/* Scene list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="text-[11px] font-black text-white/60 uppercase tracking-[0.18em]">Escenas</div>

                        {scenes.length === 0 ? (
                            <div className="text-white/40 text-sm">Sin escenas.</div>
                        ) : (
                            scenes.map((s, idx) => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSceneId(s.id)}
                                    className={cn(
                                        "w-full text-left rounded-2xl overflow-hidden border transition-all",
                                        activeSceneId === s.id ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                            <img src={s.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-white truncate">
                                                {idx + 1}. {s.title}
                                            </div>
                                            <div className="text-[10px] text-white/50 mt-1">
                                                Hotspots: {s.hotspots?.length || 0} · Polígonos: {s.polygons?.length || 0} · Labels: {s.floatingLabels?.length || 0}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Save */}
                    <div className="p-4 border-t border-white/10">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || scenes.length === 0}
                            className="w-full py-4 rounded-2xl bg-white text-black text-sm font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" /> Guardar Tour
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Global styles */}
            <style jsx global>{`
        .pnlm-controls-container {
          display: none !important;
        }
        .pnlm-panorama-info {
          display: none !important;
        }
        .pnlm-tooltip span {
          background: rgba(15, 23, 42, 0.95) !important;
          border-radius: 10px !important;
          padding: 6px 10px !important;
          font-family: Inter, sans-serif !important;
          font-size: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
        }
      `}</style>
        </div>
    );
}