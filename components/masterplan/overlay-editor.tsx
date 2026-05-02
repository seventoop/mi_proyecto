"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Minus, MoveDown, MoveLeft, MoveRight, MoveUp, Plus, RotateCcw, RotateCw, Save, Trash2, X,
} from "lucide-react";

type LatLngTuple = [number, number];
type ScreenPoint = { x: number; y: number };
type QuadCorners = [LatLngTuple, LatLngTuple, LatLngTuple, LatLngTuple]; // SW, SE, NE, NW
type ScreenCorners = [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];

export interface OverlayConfig {
    imageUrl: string | null;
    bounds: [LatLngTuple, LatLngTuple] | null;
    rotation: number;
    opacity: number;
    corners?: QuadCorners | null;
}

interface OverlayEditorProps {
    proyectoId: string;
    map: any;
    existingConfig: OverlayConfig | null;
    onBoundsChange?: (bounds: [[number, number], [number, number]], rotation: number, corners: QuadCorners) => void;
    onSave: (config: OverlayConfig) => void;
    onCancel: () => void;
    onDelete: () => void;
}

type DragState =
    | { mode: "move"; startMouse: ScreenPoint; startCorners: ScreenCorners }
    | { mode: "rotate"; startMouse: ScreenPoint; startCorners: ScreenCorners }
    | { mode: "corner"; cornerIndex: 0 | 1 | 2 | 3; startMouse: ScreenPoint; startCorners: ScreenCorners }
    | { mode: "edge"; edgeIndex: 0 | 1 | 2 | 3; startMouse: ScreenPoint; startCorners: ScreenCorners };

function computeRotatedCorners(bounds: [LatLngTuple, LatLngTuple], rot: number): QuadCorners {
    const [[swLat, swLng], [neLat, neLng]] = bounds;
    const cLat = (swLat + neLat) / 2;
    const cLng = (swLng + neLng) / 2;
    const rad = (rot * Math.PI) / 180;
    return ([
        [swLat, swLng],
        [swLat, neLng],
        [neLat, neLng],
        [neLat, swLng],
    ] as QuadCorners).map(([lat, lng]) => {
        const dLat = lat - cLat;
        const dLng = lng - cLng;
        return [
            cLat + dLat * Math.cos(rad) - dLng * Math.sin(rad),
            cLng + dLat * Math.sin(rad) + dLng * Math.cos(rad),
        ] as LatLngTuple;
    }) as QuadCorners;
}

function deriveBoundsFromCorners(corners: QuadCorners): [LatLngTuple, LatLngTuple] {
    const lats = corners.map(([lat]) => lat);
    const lngs = corners.map(([, lng]) => lng);
    return [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
    ];
}

function deriveRotationFromCorners(corners: QuadCorners): number {
    const [sw, se] = corners;
    const dLat = se[0] - sw[0];
    const dLng = se[1] - sw[1];
    return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function centroid(points: ScreenCorners): ScreenPoint {
    return {
        x: points.reduce((sum, point) => sum + point.x, 0) / 4,
        y: points.reduce((sum, point) => sum + point.y, 0) / 4,
    };
}

function rotatePoint(point: ScreenPoint, center: ScreenPoint, angleRad: number): ScreenPoint {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
        x: center.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
        y: center.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad),
    };
}

function screenToString(points: ScreenCorners): string {
    return [points[3], points[2], points[1], points[0]].map((point) => `${point.x},${point.y}`).join(" ");
}

function edgeMidpoints(points: ScreenCorners): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
    return [
        { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }, // bottom
        { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 }, // right
        { x: (points[2].x + points[3].x) / 2, y: (points[2].y + points[3].y) / 2 }, // top
        { x: (points[3].x + points[0].x) / 2, y: (points[3].y + points[0].y) / 2 }, // left
    ];
}

function add(point: ScreenPoint, vec: ScreenPoint): ScreenPoint {
    return { x: point.x + vec.x, y: point.y + vec.y };
}

function scaleVec(vec: ScreenPoint, factor: number): ScreenPoint {
    return { x: vec.x * factor, y: vec.y * factor };
}

function sub(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
    return { x: a.x - b.x, y: a.y - b.y };
}

function dot(a: ScreenPoint, b: ScreenPoint): number {
    return a.x * b.x + a.y * b.y;
}

function normalize(vec: ScreenPoint): ScreenPoint {
    const len = Math.hypot(vec.x, vec.y) || 1;
    return { x: vec.x / len, y: vec.y / len };
}

function buildRectFromAnchor(anchorIndex: 0 | 1 | 2 | 3, anchor: ScreenPoint, axisX: ScreenPoint, axisY: ScreenPoint, width: number, height: number): ScreenCorners {
    if (anchorIndex === 0) {
        const sw = anchor;
        const se = add(anchor, scaleVec(axisX, width));
        const nw = add(anchor, scaleVec(axisY, height));
        const ne = add(se, scaleVec(axisY, height));
        return [sw, se, ne, nw];
    }
    if (anchorIndex === 1) {
        const se = anchor;
        const sw = add(anchor, scaleVec(axisX, -width));
        const ne = add(anchor, scaleVec(axisY, height));
        const nw = add(sw, scaleVec(axisY, height));
        return [sw, se, ne, nw];
    }
    if (anchorIndex === 2) {
        const ne = anchor;
        const nw = add(anchor, scaleVec(axisX, -width));
        const se = add(anchor, scaleVec(axisY, -height));
        const sw = add(nw, scaleVec(axisY, -height));
        return [sw, se, ne, nw];
    }
    const nw = anchor;
    const ne = add(anchor, scaleVec(axisX, width));
    const sw = add(anchor, scaleVec(axisY, -height));
    const se = add(sw, scaleVec(axisX, width));
    return [sw, se, ne, nw];
}

function buildRectFromCenter(center: ScreenPoint, axisX: ScreenPoint, axisY: ScreenPoint, width: number, height: number): ScreenCorners {
    const halfX = scaleVec(axisX, width / 2);
    const halfY = scaleVec(axisY, height / 2);
    const sw = sub(sub(center, halfX), halfY);
    const se = add(sub(center, halfY), halfX);
    const ne = add(add(center, halfX), halfY);
    const nw = add(sub(center, halfX), halfY);
    return [sw, se, ne, nw];
}

function rectMetrics(points: ScreenCorners) {
    const sw = points[0];
    const se = points[1];
    const nw = points[3];
    const axisX = normalize(sub(se, sw));
    const axisY = normalize(sub(nw, sw));
    const width = Math.hypot(se.x - sw.x, se.y - sw.y) || 1;
    const height = Math.hypot(nw.x - sw.x, nw.y - sw.y) || 1;
    return { axisX, axisY, width, height, aspect: width / height };
}

function resizeRectProportionally(
    startCorners: ScreenCorners,
    currentMouse: ScreenPoint,
    handle: { type: "corner"; index: 0 | 1 | 2 | 3 } | { type: "edge"; index: 0 | 1 | 2 | 3 },
): ScreenCorners {
    const { axisX, axisY, width, height, aspect } = rectMetrics(startCorners);
    const minScale = 0.1;

    if (handle.type === "corner") {
        const oppositeIndex = ([2, 3, 0, 1] as const)[handle.index];
        const signs = [
            { x: -1, y: -1 },
            { x: 1, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
        ] as const;
        const anchor = startCorners[oppositeIndex];
        const rel = sub(currentMouse, anchor);
        const projX = dot(rel, axisX) * signs[handle.index].x;
        const projY = dot(rel, axisY) * signs[handle.index].y;
        const scale = Math.max(minScale, Math.max(projX / width, projY / height));
        return buildRectFromAnchor(oppositeIndex, anchor, axisX, axisY, width * scale, height * scale);
    }

    const mids = edgeMidpoints(startCorners);
    const oppositeMid = mids[(handle.index + 2) % 4];

    if (handle.index === 1) {
        const projectedWidth = Math.max(minScale * width, dot(sub(currentMouse, oppositeMid), axisX));
        const scale = projectedWidth / width;
        const nextWidth = width * scale;
        const nextHeight = height * scale;
        const center = add(oppositeMid, scaleVec(axisX, nextWidth / 2));
        return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
    }

    if (handle.index === 3) {
        const projectedWidth = Math.max(minScale * width, dot(sub(oppositeMid, currentMouse), axisX));
        const scale = projectedWidth / width;
        const nextWidth = width * scale;
        const nextHeight = height * scale;
        const center = sub(oppositeMid, scaleVec(axisX, nextWidth / 2));
        return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
    }

    if (handle.index === 2) {
        const projectedHeight = Math.max(minScale * height, dot(sub(currentMouse, oppositeMid), axisY));
        const scale = projectedHeight / height;
        const nextHeight = height * scale;
        const nextWidth = width * scale;
        const center = add(oppositeMid, scaleVec(axisY, nextHeight / 2));
        return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
    }

    const projectedHeight = Math.max(minScale * height, dot(sub(oppositeMid, currentMouse), axisY));
    const scale = projectedHeight / height;
    const nextHeight = height * scale;
    const nextWidth = width * scale;
    const center = sub(oppositeMid, scaleVec(axisY, nextHeight / 2));
    return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
}

function resizeRectFromEdge(
    startCorners: ScreenCorners,
    currentMouse: ScreenPoint,
    edgeIndex: 0 | 1 | 2 | 3,
): ScreenCorners {
    const { axisX, axisY, width, height } = rectMetrics(startCorners);
    const mids = edgeMidpoints(startCorners);
    const oppositeMid = mids[(edgeIndex + 2) % 4];
    const minScale = 0.1;

    if (edgeIndex === 1) {
        const nextWidth = Math.max(width * minScale, dot(sub(currentMouse, oppositeMid), axisX));
        const nextHeight = height;
        const center = add(oppositeMid, scaleVec(axisX, nextWidth / 2));
        return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
    }

    if (edgeIndex === 3) {
        const nextWidth = Math.max(width * minScale, dot(sub(oppositeMid, currentMouse), axisX));
        const nextHeight = height;
        const center = sub(oppositeMid, scaleVec(axisX, nextWidth / 2));
        return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
    }

    if (edgeIndex === 2) {
        const nextHeight = Math.max(height * minScale, dot(sub(currentMouse, oppositeMid), axisY));
        const nextWidth = width;
        const center = add(oppositeMid, scaleVec(axisY, nextHeight / 2));
        return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
    }

    const nextHeight = Math.max(height * minScale, dot(sub(oppositeMid, currentMouse), axisY));
    const nextWidth = width;
    const center = sub(oppositeMid, scaleVec(axisY, nextHeight / 2));
    return buildRectFromCenter(center, axisX, axisY, nextWidth, nextHeight);
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
    const n = vector.length;
    const a = matrix.map((row, i) => [...row, vector[i]]);

    for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
        }
        if (Math.abs(a[pivot][col]) < 1e-12) return null;
        [a[col], a[pivot]] = [a[pivot], a[col]];

        const div = a[col][col];
        for (let j = col; j <= n; j++) a[col][j] /= div;

        for (let row = 0; row < n; row++) {
            if (row === col) continue;
            const factor = a[row][col];
            for (let j = col; j <= n; j++) {
                a[row][j] -= factor * a[col][j];
            }
        }
    }

    return a.map((row) => row[n]);
}

function computeHomography(from: ScreenPoint[], to: ScreenPoint[]) {
    const matrix: number[][] = [];
    const vector: number[] = [];

    for (let i = 0; i < 4; i++) {
        const sx = from[i].x;
        const sy = from[i].y;
        const dx = to[i].x;
        const dy = to[i].y;

        matrix.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
        vector.push(dx);
        matrix.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
        vector.push(dy);
    }

    const solution = solveLinearSystem(matrix, vector);
    if (!solution) return null;

    const [a, b, c, d, e, f, g, h] = solution;
    return [
        a, d, 0, g,
        b, e, 0, h,
        0, 0, 1, 0,
        c, f, 0, 1,
    ];
}

export default function OverlayEditor({
    proyectoId, map, existingConfig, onBoundsChange, onSave, onCancel, onDelete,
}: OverlayEditorProps) {
    const [opacity, setOpacity] = useState<number>(existingConfig?.opacity ?? 0.82);
    const [isSaving, setIsSaving] = useState(false);
    const [assetSize, setAssetSize] = useState({ width: 1200, height: 800 });
    const [containerRect, setContainerRect] = useState({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        screenLeft: 0,
        screenTop: 0,
    });
    const [corners, setCorners] = useState<QuadCorners>(() => {
        if (existingConfig?.corners) return existingConfig.corners;
        if (existingConfig?.bounds) return computeRotatedCorners(existingConfig.bounds, existingConfig.rotation ?? 0);
        const center = map?.getCenter?.();
        return computeRotatedCorners(
            [[center?.lat - 0.002 || -34.603, center?.lng - 0.003 || -58.382], [center?.lat + 0.002 || -34.599, center?.lng + 0.003 || -58.376]],
            0,
        );
    });

    const dragStateRef = useRef<DragState | null>(null);
    const cornersRef = useRef<QuadCorners>(corners);
    const opacityRef = useRef<number>(opacity);
    const imageUrlRef = useRef<string | null>(existingConfig?.imageUrl ?? null);

    useEffect(() => {
        cornersRef.current = corners;
    }, [corners]);

    useEffect(() => {
        opacityRef.current = opacity;
    }, [opacity]);

    useEffect(() => {
        imageUrlRef.current = existingConfig?.imageUrl ?? null;
    }, [existingConfig?.imageUrl]);

    useEffect(() => {
        if (!existingConfig) return;
        if (existingConfig.corners) {
            setCorners(existingConfig.corners);
            return;
        }
        if (existingConfig.bounds) {
            setCorners(computeRotatedCorners(existingConfig.bounds, existingConfig.rotation ?? 0));
        }
        if (typeof existingConfig.opacity === "number") {
            setOpacity(existingConfig.opacity);
        }
    }, [existingConfig]);

    useEffect(() => {
        const src = existingConfig?.imageUrl;
        if (!src) return;
        const img = new Image();
        img.onload = () => {
            setAssetSize({
                width: img.naturalWidth || 1200,
                height: img.naturalHeight || 800,
            });
        };
        img.src = src;
    }, [existingConfig?.imageUrl]);

    const syncContainerRect = useCallback(() => {
        const container = map?.getContainer?.() as HTMLElement | undefined;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setContainerRect({
            left: container.offsetLeft,
            top: container.offsetTop,
            width: container.clientWidth,
            height: container.clientHeight,
            screenLeft: rect.left,
            screenTop: rect.top,
        });
    }, [map]);

    useEffect(() => {
        syncContainerRect();
        if (!map) return;
        const update = () => syncContainerRect();
        map.on("move", update);
        map.on("zoom", update);
        map.on("resize", update);
        const container = map.getContainer?.() as HTMLElement | undefined;
        const ro = container ? new ResizeObserver(update) : null;
        if (container && ro) ro.observe(container);

        return () => {
            map.off("move", update);
            map.off("zoom", update);
            map.off("resize", update);
            ro?.disconnect();
        };
    }, [map, syncContainerRect]);

    const screenCorners = useMemo<ScreenCorners>(() => {
        return corners.map(([lat, lng]) => {
            const point = map.latLngToContainerPoint([lat, lng]);
            return { x: point.x, y: point.y };
        }) as ScreenCorners;
    }, [corners, map, containerRect.width, containerRect.height]);

    const bounds = useMemo(() => deriveBoundsFromCorners(corners), [corners]);
    const rotation = useMemo(() => deriveRotationFromCorners(corners), [corners]);

    useEffect(() => {
        onBoundsChange?.(bounds, rotation, corners);
    }, [bounds, corners, onBoundsChange, rotation]);

    const centerPoint = useMemo(() => centroid(screenCorners), [screenCorners]);
    const sideMidPoints = useMemo(() => edgeMidpoints(screenCorners), [screenCorners]);
    const topMidPoint = useMemo<ScreenPoint>(() => ({
        x: (screenCorners[3].x + screenCorners[2].x) / 2,
        y: (screenCorners[3].y + screenCorners[2].y) / 2,
    }), [screenCorners]);
    const rotationHandle = useMemo<ScreenPoint>(() => {
        const dx = topMidPoint.x - centerPoint.x;
        const dy = topMidPoint.y - centerPoint.y;
        const len = Math.hypot(dx, dy) || 1;
        return {
            x: topMidPoint.x + (dx / len) * 44,
            y: topMidPoint.y + (dy / len) * 44,
        };
    }, [centerPoint, topMidPoint]);

    const cssMatrix = useMemo(() => {
        const source = [
            { x: 0, y: 0 },
            { x: assetSize.width, y: 0 },
            { x: assetSize.width, y: assetSize.height },
            { x: 0, y: assetSize.height },
        ];
        const target = [screenCorners[3], screenCorners[2], screenCorners[1], screenCorners[0]];
        const matrix = computeHomography(source, target);
        return matrix ? `matrix3d(${matrix.join(",")})` : null;
    }, [assetSize.height, assetSize.width, screenCorners]);

    const applyScreenCorners = useCallback((nextScreenCorners: ScreenCorners) => {
        const nextLatLng = nextScreenCorners.map((point) => {
            const latLng = map.containerPointToLatLng([point.x, point.y]);
            return [latLng.lat, latLng.lng] as LatLngTuple;
        }) as QuadCorners;
        setCorners(nextLatLng);
    }, [map]);

    const beginDrag = useCallback((state: DragState) => {
        dragStateRef.current = state;
    }, []);

    useEffect(() => {
        const handleMove = (event: PointerEvent) => {
            const state = dragStateRef.current;
            if (!state) return;

            const currentMouse = {
                x: event.clientX - containerRect.screenLeft,
                y: event.clientY - containerRect.screenTop,
            };
            if (state.mode === "move") {
                const dx = currentMouse.x - state.startMouse.x;
                const dy = currentMouse.y - state.startMouse.y;
                const next = state.startCorners.map((point) => ({ x: point.x + dx, y: point.y + dy })) as ScreenCorners;
                applyScreenCorners(next);
                return;
            }

            if (state.mode === "rotate") {
                const center = centroid(state.startCorners);
                const startAngle = Math.atan2(state.startMouse.y - center.y, state.startMouse.x - center.x);
                const currentAngle = Math.atan2(currentMouse.y - center.y, currentMouse.x - center.x);
                const delta = currentAngle - startAngle;
                const next = state.startCorners.map((point) => rotatePoint(point, center, delta)) as ScreenCorners;
                applyScreenCorners(next);
                return;
            }

            if (state.mode === "corner") {
                applyScreenCorners(
                    resizeRectProportionally(state.startCorners, currentMouse, { type: "corner", index: state.cornerIndex })
                );
                return;
            }

            if (state.mode === "edge") {
                applyScreenCorners(resizeRectFromEdge(state.startCorners, currentMouse, state.edgeIndex));
            }
        };

        const handleUp = () => {
            dragStateRef.current = null;
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
        };
    }, [applyScreenCorners, containerRect.screenLeft, containerRect.screenTop]);

    const updateByTransform = useCallback((transform: (points: ScreenCorners) => ScreenCorners) => {
        applyScreenCorners(transform(screenCorners));
    }, [applyScreenCorners, screenCorners]);

    const nudgeOverlay = useCallback((dx: number, dy: number) => {
        updateByTransform((points) => points.map((point) => ({ x: point.x + dx, y: point.y + dy })) as ScreenCorners);
    }, [updateByTransform]);

    const scaleOverlay = useCallback((factor: number) => {
        updateByTransform((points) => {
            const center = centroid(points);
            return points.map((point) => ({
                x: center.x + (point.x - center.x) * factor,
                y: center.y + (point.y - center.y) * factor,
            })) as ScreenCorners;
        });
    }, [updateByTransform]);

    const rotateOverlay = useCallback((deltaDeg: number) => {
        updateByTransform((points) => {
            const center = centroid(points);
            const angleRad = (deltaDeg * Math.PI) / 180;
            return points.map((point) => rotatePoint(point, center, angleRad)) as ScreenCorners;
        });
    }, [updateByTransform]);

    const isSavingRef = useRef(false);

    const handleSave = async (e?: React.PointerEvent | React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isSavingRef.current) return;

        isSavingRef.current = true;
        setIsSaving(true);
        
        // Capture current state IMMEDIATELY
        const finalConfig = {
            imageUrl: existingConfig?.imageUrl && !existingConfig.imageUrl.startsWith("blob:")
                ? existingConfig.imageUrl
                : null,
            bounds: deriveBoundsFromCorners(cornersRef.current),
            corners: [...cornersRef.current] as QuadCorners,
            rotation: deriveRotationFromCorners(cornersRef.current),
            opacity: opacityRef.current,
        };

        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/overlay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: finalConfig.imageUrl,
                    bounds: finalConfig.bounds,
                    corners: finalConfig.corners,
                    rotation: finalConfig.rotation,
                    mapCenter: {
                        lat: map.getCenter().lat,
                        lng: map.getCenter().lng,
                        zoom: map.getZoom(),
                    },
                }),
            });
            
            if (res.ok) {
                // Successful save — call onSave to notify parent and close editor
                onSave(finalConfig);
            } else {
                console.error("Save failed with status:", res.status);
                isSavingRef.current = false;
                setIsSaving(false);
            }
        } catch (error) {
            console.error("Save failed", error);
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    const canRenderOverlay = !!existingConfig?.imageUrl && containerRect.width > 0 && containerRect.height > 0 && !!cssMatrix;

    return (
        <div className="absolute inset-0 z-[2000] pointer-events-none">
            <div
                className="absolute"
                style={{
                    left: containerRect.left,
                    top: containerRect.top,
                    width: containerRect.width,
                    height: containerRect.height,
                    pointerEvents: "none",
                }}
            >
                {canRenderOverlay && (
                    <>
                        <div
                            onPointerDown={(event) => {
                                event.preventDefault();
                                beginDrag({
                                    mode: "move",
                                    startMouse: {
                                        x: event.clientX - containerRect.screenLeft,
                                        y: event.clientY - containerRect.screenTop,
                                    },
                                    startCorners: screenCorners,
                                });
                            }}
                            className="absolute left-0 top-0"
                            style={{
                                width: assetSize.width,
                                height: assetSize.height,
                                transformOrigin: "0 0",
                                transform: cssMatrix ?? undefined,
                                opacity,
                                cursor: "move",
                            }}
                        >
                            <img
                                src={existingConfig?.imageUrl ?? undefined}
                                alt="Plano"
                                draggable={false}
                                className="block h-full w-full max-w-none select-none pointer-events-none"
                            />
                        </div>

                        <svg className="absolute inset-0 overflow-visible pointer-events-none">
                            <polyline
                                points={screenToString(screenCorners)}
                                fill="rgba(249,115,22,0.08)"
                                stroke="#f97316"
                                strokeWidth="2"
                                strokeDasharray="8 5"
                            />
                            <line
                                x1={topMidPoint.x}
                                y1={topMidPoint.y}
                                x2={rotationHandle.x}
                                y2={rotationHandle.y}
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeDasharray="5 4"
                            />
                        </svg>

                        {screenCorners.map((point, index) => (
                            <button
                                key={`corner-${index}`}
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    beginDrag({
                                        mode: "corner",
                                        cornerIndex: index as 0 | 1 | 2 | 3,
                                        startMouse: {
                                            x: event.clientX - containerRect.screenLeft,
                                            y: event.clientY - containerRect.screenTop,
                                        },
                                        startCorners: screenCorners,
                                    });
                                }}
                                className="absolute h-5 w-5 rounded-full border-[3px] border-orange-500 bg-white shadow-lg"
                                style={{
                                    left: point.x - 10,
                                    top: point.y - 10,
                                    cursor: "grab",
                                    pointerEvents: "auto",
                                }}
                            />
                        ))}

                        {sideMidPoints.map((point, index) => (
                            <button
                                key={`edge-${index}`}
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    beginDrag({
                                        mode: "edge",
                                        edgeIndex: index as 0 | 1 | 2 | 3,
                                        startMouse: {
                                            x: event.clientX - containerRect.screenLeft,
                                            y: event.clientY - containerRect.screenTop,
                                        },
                                        startCorners: screenCorners,
                                    });
                                }}
                                className="absolute rounded-full border-2 border-white bg-slate-100 shadow-lg"
                                style={{
                                    left: point.x - 11,
                                    top: point.y - 4,
                                    width: 22,
                                    height: 8,
                                    cursor: "grab",
                                    pointerEvents: "auto",
                                    transform: `rotate(${rotation}deg)`,
                                    transformOrigin: "50% 50%",
                                }}
                            />
                        ))}

                        <button
                            type="button"
                            onPointerDown={(event) => {
                                event.preventDefault();
                                beginDrag({
                                    mode: "move",
                                    startMouse: {
                                        x: event.clientX - containerRect.screenLeft,
                                        y: event.clientY - containerRect.screenTop,
                                    },
                                    startCorners: screenCorners,
                                });
                            }}
                            className="absolute flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-indigo-600 bg-indigo-500 text-white shadow-lg"
                            style={{
                                left: centerPoint.x - 12,
                                top: centerPoint.y - 12,
                                cursor: "move",
                                pointerEvents: "auto",
                            }}
                        >
                            <span className="text-xs font-bold">+</span>
                        </button>

                        <button
                            type="button"
                            onPointerDown={(event) => {
                                event.preventDefault();
                                beginDrag({
                                    mode: "rotate",
                                    startMouse: { x: event.clientX - containerRect.left, y: event.clientY - containerRect.top },
                                    startCorners: screenCorners,
                                });
                            }}
                            className="absolute flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-sky-600 bg-sky-500 text-white shadow-lg"
                            style={{
                                left: rotationHandle.x - 10,
                                top: rotationHandle.y - 10,
                                cursor: "grab",
                                pointerEvents: "auto",
                            }}
                        >
                            <span className="text-[10px] font-bold">↻</span>
                        </button>
                    </>
                )}
            </div>

            <div className="absolute right-16 top-4 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl pointer-events-auto dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Posicionar Plano</h3>
                    <button onClick={onCancel} className="rounded p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                </div>

                <div className="mb-3 space-y-1 rounded-xl bg-blue-50 p-2.5 text-[10px] leading-snug text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                    <p><span style={{ color: "#6366f1", fontWeight: 700 }}>Azul</span> - mover todo el plano.</p>
                    <p><span style={{ color: "#f97316", fontWeight: 700 }}>Esquinas y lados</span> - escalar manteniendo la proporcion original.</p>
                    <p><span style={{ color: "#0ea5e9", fontWeight: 700 }}>Celeste</span> - rotar como en una herramienta gráfica.</p>
                </div>

                <div className="mb-3 space-y-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500">Opacidad</span>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min={15}
                        max={100}
                        step={1}
                        value={Math.round(opacity * 100)}
                        onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                        className="w-full accent-brand-500"
                    />
                </div>

                <div className="mb-3 space-y-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                    <div className="text-[10px] font-semibold text-slate-500">Ajuste de posición</div>
                    <div className="grid grid-cols-3 gap-1 mb-4">
                        <div />
                        <button onClick={() => nudgeOverlay(0, -1)} className="flex items-center justify-center rounded-lg bg-slate-100 py-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            <MoveUp className="h-4 w-4" />
                        </button>
                        <div />
                        <button onClick={() => nudgeOverlay(-1, 0)} className="flex items-center justify-center rounded-lg bg-slate-100 py-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            <MoveLeft className="h-4 w-4" />
                        </button>
                        <div className="flex flex-col items-center justify-center text-[8px] font-bold text-indigo-500 leading-none">
                            <span>Fino</span>
                            <span className="mt-0.5">1px</span>
                        </div>
                        <button onClick={() => nudgeOverlay(1, 0)} className="flex items-center justify-center rounded-lg bg-slate-100 py-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            <MoveRight className="h-4 w-4" />
                        </button>
                        <div />
                        <button onClick={() => nudgeOverlay(0, 1)} className="flex items-center justify-center rounded-lg bg-slate-100 py-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            <MoveDown className="h-4 w-4" />
                        </button>
                        <div />
                    </div>

                    <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                        {/* Rotación Slider + Botones */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rotación</span>
                                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-700">
                                    {rotation.toFixed(1)}°
                                </span>
                            </div>
                            <input
                                type="range"
                                min={-180}
                                max={180}
                                step={0.1}
                                value={rotation}
                                onChange={(e) => {
                                    const next = parseFloat(e.target.value);
                                    rotateOverlay(next - rotation);
                                }}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 dark:bg-slate-700"
                            />
                            <div className="grid grid-cols-4 gap-1">
                                <button onClick={() => rotateOverlay(-1)} className="py-1 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">-1°</button>
                                <button onClick={() => rotateOverlay(-0.1)} className="py-1 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">-0.1°</button>
                                <button onClick={() => rotateOverlay(0.1)} className="py-1 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">+0.1°</button>
                                <button onClick={() => rotateOverlay(1)} className="py-1 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">+1°</button>
                            </div>
                        </div>

                        {/* Escala Botones Precisos */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Escala (Zoom)</span>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex gap-1">
                                    <button onClick={() => scaleOverlay(0.99)} title="Escala -1%" className="flex-1 py-1.5 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">-1%</button>
                                    <button onClick={() => scaleOverlay(0.999)} title="Escala -0.1%" className="flex-1 py-1.5 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">-0.1%</button>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => scaleOverlay(1.001)} title="Escala +0.1%" className="flex-1 py-1.5 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">+0.1%</button>
                                    <button onClick={() => scaleOverlay(1.01)} title="Escala +1%" className="flex-1 py-1.5 text-[9px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">+1%</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onPointerDown={handleSave}
                        disabled={isSaving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 py-2 text-xs font-bold text-white transition-all hover:bg-brand-600 disabled:opacity-50"
                    >
                        {isSaving ? "Guardando..." : <><Save className="h-3 w-3" /> Fijar Posición</>}
                    </button>
                    <button
                        onClick={onDelete}
                        className="rounded-lg bg-red-50 px-3 py-2 text-red-500 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                        title="Resetear posición"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
