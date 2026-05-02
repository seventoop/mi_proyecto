"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Image as ImageIcon, Map as MapIcon, MapPin, Check, Maximize2, Play } from "lucide-react";

export type Line = {
    id: string;
    type?: "line" | "arrow";
    arrowVariant?: "classic" | "thin" | "heavy-head" | "wayfinding" | "bold" | "clean" | "chevron" | "brush" | "curve-soft-left" | "curve-soft-right" | "curve-strong-left" | "curve-strong-right";
    strokeWidth?: number;
    headSize?: number;
    bend?: number;
    curveDirection?: "left" | "right";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    pitch1?: number;
    yaw1?: number;
    pitch2?: number;
    yaw2?: number;
    anchorPitch?: number;
    anchorYaw?: number;
    anchorHfov?: number;
    screenDx?: number;
    screenDy?: number;
};

export type TextItem = {
    id: string;
    text: string;
    x: number;
    y: number;
    pitch?: number;
    yaw?: number;
    anchorHfov?: number;
    fontSize?: number;
    color?: string;
};

export type SceneFrame = {
    id: string;
    type: "circle" | "square" | "grid";
    x: number;
    y: number;
    width: number;
    height: number;
    pitch?: number;
    yaw?: number;
    anchorHfov?: number;
    targetSceneId?: string; // ID de la escena destino (Portal)
    targetSceneKey?: string;
    previewUrl?: string;    // Miniatura de destino
    renderScale?: number;
    snapX?: number;
    snapY?: number;
};

export type SceneImage = {
    id: string;
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pitch?: number;
    yaw?: number;
    anchorHfov?: number;
    isAnchored?: boolean;
};

export type PoiBadge = {
    id: string;
    type: "poi-badge";
    variant: "circle" | "square";
    kind?: "poi" | "location";
    x: number;
    y: number;
    width: number;
    height: number;
    imageUrl?: string;
    title?: string;
    pitch?: number;
    yaw?: number;
    anchorHfov?: number;
    color?: string;
};

export type FreehandStroke = {
    id: string;
    points: { pitch: number; yaw: number }[];
    strokeWidth?: number;
    color?: string;
};

export type ScenePolygon = {
    id: string;
    points: Point[];
    pitchPoints?: { pitch: number; yaw: number }[];
    anchorHfov?: number;
    fillColor?: string;
    strokeColor?: string;
};

export type ControlPoint = {
    id: string;
    src: { u: number; v: number };
    world: { pitch: number; yaw: number };
};

export type OverlayInstance = {
    imageUrl: string;
    points: ControlPoint[];
    isFixed: boolean;
    opacity: number;
};

export type Point = { x: number; y: number };

type ViewerState = { pitch: number; yaw: number; hfov: number };

type DragTarget =
    | { type: "endpoint"; lineId: string; endpoint: "start" | "end" }
    | { type: "dstNode"; nodeIndex: number }
    | { type: "text"; textId: string }
    | { type: "poi-badge"; poiBadgeId: string }
    | { type: "frame"; frameId: string }
    | { type: "frame-resize"; frameId: string; startWidth: number; startHeight: number; startX: number; startY: number }
    | { type: "resize"; textId: string; startSize: number; startX: number; startY: number; corner: "nw" | "ne" | "sw" | "se" }
    | { type: "poly-vertex"; polyId: string; vertexIndex: number }
    | { type: "group"; origin: Point }
    | null;

type PendingFrameDrag = {
    frameId: string;
    startX: number;
    startY: number;
} | null;

type ArrowVariant = NonNullable<Line["arrowVariant"]>;

type ArrowStyle = {
    variant: ArrowVariant;
    strokeWidth: number;
    headSize: number;
    strokeLinecap: "round" | "square";
    outlined: boolean;
    markerPoints: string;
    bend: number;
    curveDirection?: "left" | "right";
    strokeDasharray?: string;
};

const SNAP_DISTANCE = 28;
const LINE_HIT_TOLERANCE = 10;
const CONNECTION_TOLERANCE = 4;
const CORNER_SNAP_R = 28;
const FRAME_DRAG_THRESHOLD = 5;
const HIDDEN_POINT = { x: -10000, y: -10000 };
const HIDDEN_LINE = { x1: -10000, y1: -10000, x2: -10001, y2: -10001 };
const DEFAULT_ARROW_VARIANT: ArrowVariant = "classic";

function getHfovScale(anchorHfov?: number, currentHfov?: number) {
    if (!anchorHfov || !currentHfov) return 1;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const current = Math.tan(toRad(currentHfov) / 2);
    const reference = Math.tan(toRad(anchorHfov) / 2);

    if (!isFinite(current) || !isFinite(reference) || current <= 0 || reference <= 0) {
        return 1;
    }

    return reference / current;
}

function getArrowStyle(line?: Pick<Line, "arrowVariant" | "strokeWidth" | "headSize" | "bend" | "curveDirection"> | null): ArrowStyle {
    const variant = line?.arrowVariant ?? DEFAULT_ARROW_VARIANT;

    const presets: Record<ArrowVariant, Omit<ArrowStyle, "variant">> = {
        classic: {
            strokeWidth: 3,
            headSize: 6,
            strokeLinecap: "square",
            outlined: false,
            markerPoints: "0 0, 6 3, 0 6",
            bend: 0,
        },
        thin: {
            strokeWidth: 2,
            headSize: 5,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 5 2.5, 0 5",
            bend: 0,
        },
        "heavy-head": {
            strokeWidth: 4,
            headSize: 10,
            strokeLinecap: "square",
            outlined: false,
            markerPoints: "0 0, 10 5, 0 10",
            bend: 0,
        },
        wayfinding: {
            strokeWidth: 5,
            headSize: 9,
            strokeLinecap: "round",
            outlined: true,
            markerPoints: "0 0, 9 4.5, 0 9, 4 4.5",
            bend: 0,
        },
        bold: {
            strokeWidth: 6,
            headSize: 8,
            strokeLinecap: "square",
            outlined: false,
            markerPoints: "0 0, 8 4, 0 8",
            bend: 0,
        },
        clean: {
            strokeWidth: 4,
            headSize: 7,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 7 3.5, 0 7",
            bend: 0,
        },
        chevron: {
            strokeWidth: 4,
            headSize: 10,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 10 5, 0 10, 3.5 5",
            bend: 0,
        },
        brush: {
            strokeWidth: 5,
            headSize: 9,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 9 4.5, 0 9",
            bend: 0,
            strokeDasharray: "10 4",
        },
        "curve-soft-left": {
            strokeWidth: 4,
            headSize: 7,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 7 3.5, 0 7",
            bend: 42,
            curveDirection: "left",
        },
        "curve-soft-right": {
            strokeWidth: 4,
            headSize: 7,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 7 3.5, 0 7",
            bend: 42,
            curveDirection: "right",
        },
        "curve-strong-left": {
            strokeWidth: 5,
            headSize: 9,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 9 4.5, 0 9",
            bend: 78,
            curveDirection: "left",
        },
        "curve-strong-right": {
            strokeWidth: 5,
            headSize: 9,
            strokeLinecap: "round",
            outlined: false,
            markerPoints: "0 0, 9 4.5, 0 9",
            bend: 78,
            curveDirection: "right",
        },
    };

    const preset = presets[variant] ?? presets[DEFAULT_ARROW_VARIANT];

    return {
        variant,
        strokeWidth: line?.strokeWidth ?? preset.strokeWidth,
        headSize: line?.headSize ?? preset.headSize,
        strokeLinecap: preset.strokeLinecap,
        outlined: preset.outlined,
        markerPoints: preset.markerPoints,
        bend: typeof line?.bend === "number" ? line.bend : preset.bend,
        curveDirection: line?.curveDirection ?? preset.curveDirection,
        strokeDasharray: preset.strokeDasharray,
    };
}

function distance(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointsEqual(a: Point, b: Point, tolerance = CONNECTION_TOLERANCE) {
    return distance(a, b) <= tolerance;
}

function distancePointToSegment(p: Point, a: Point, b: Point) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return distance(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function getQuadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
    const mt = 1 - t;
    return {
        x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
        y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
    };
}

function getArrowControlPoint(start: Point, end: Point, style: Pick<ArrowStyle, "bend" | "curveDirection">): Point {
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);

    if (!len || !style.bend || !style.curveDirection) {
        return mid;
    }

    const normalLeft = { x: -dy / len, y: dx / len };
    const sign = style.curveDirection === "left" ? 1 : -1;

    return {
        x: mid.x + normalLeft.x * style.bend * sign,
        y: mid.y + normalLeft.y * style.bend * sign,
    };
}

function getLinePathD(line: Line): string | null {
    if (line.type !== "arrow") return null;
    const style = getArrowStyle(line);
    if (!style.bend || !style.curveDirection) return null;

    const start = { x: line.x1, y: line.y1 };
    const end = { x: line.x2, y: line.y2 };
    const control = getArrowControlPoint(start, end, style);

    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function getLineMidpoint(line: Line): Point {
    const pathD = getLinePathD(line);
    if (!pathD) {
        return { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 };
    }

    const style = getArrowStyle(line);
    return getQuadraticPoint(
        { x: line.x1, y: line.y1 },
        getArrowControlPoint({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 }, style),
        { x: line.x2, y: line.y2 },
        0.5
    );
}

function distancePointToCurve(p: Point, start: Point, control: Point, end: Point, samples = 24) {
    let best = Number.POSITIVE_INFINITY;
    let prev = start;

    for (let i = 1; i <= samples; i++) {
        const current = getQuadraticPoint(start, control, end, i / samples);
        best = Math.min(best, distancePointToSegment(p, prev, current));
        prev = current;
    }

    return best;
}

function getStrokeHitDistance(point: Point, strokePoints: Point[]) {
    if (strokePoints.length < 2) return Number.POSITIVE_INFINITY;

    let best = Number.POSITIVE_INFINITY;
    for (let i = 1; i < strokePoints.length; i += 1) {
        best = Math.min(best, distancePointToSegment(point, strokePoints[i - 1], strokePoints[i]));
    }

    return best;
}

function getLineHitDistance(point: Point, line: Line) {
    const pathD = getLinePathD(line);
    if (!pathD) {
        return distancePointToSegment(point, { x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 });
    }

    const style = getArrowStyle(line);
    const start = { x: line.x1, y: line.y1 };
    const end = { x: line.x2, y: line.y2 };
    const control = getArrowControlPoint(start, end, style);
    return distancePointToCurve(point, start, control, end);
}

type SnapResult = {
    point: Point;
    snapped: boolean;
    snapType: "endpoint" | "midpoint" | "none";
};

function getFrameSnapPoint(frame: Pick<SceneFrame, "x" | "y" | "height" | "snapX" | "snapY">): Point {
    return {
        x: frame.snapX ?? frame.x,
        y: frame.snapY ?? (frame.y + (frame.height / 2)),
    };
}

function findClosestFrameSnapPoint(
    point: Point,
    frames: Pick<SceneFrame, "x" | "y" | "height" | "snapX" | "snapY">[],
    maxDistance: number
): Point | null {
    let bestPoint: Point | null = null;
    let bestDistance = maxDistance;

    for (const frame of frames) {
        if (frame.x < -1000) continue;
        const snapPoint = getFrameSnapPoint(frame);
        const d = distance(point, snapPoint);
        if (d < bestDistance) {
            bestDistance = d;
            bestPoint = snapPoint;
        }
    }

    return bestPoint;
}

function getSnapResult(
    point: Point,
    lines: Line[],
    ignore?: { lineId: string; endpoint: "start" | "end" } | null,
    frames?: SceneFrame[]
): SnapResult {
    // --- PRIORIDAD 1: MARCOS (Magnetismo Fuerte) ---
    if (frames) {
        // Radio de atracción de marcos de 60px para que se "sienta" el imán
        const FRAME_SNAP_DIST = 60; 
        for (const frame of frames) {
            if (frame.x < -1000) continue;
            
            // El imán está en el borde inferior exacto
            const snapPoint = getFrameSnapPoint(frame);
            const d = distance(point, snapPoint);

            if (d < FRAME_SNAP_DIST) {
                return { point: snapPoint, snapped: true, snapType: "endpoint" };
            }
        }
    }

    // --- PRIORIDAD 2: LINEAS (Magnetismo Estándar) ---
    let best: Point | null = null;
    let bestDist = SNAP_DISTANCE;
    let bestType: "endpoint" | "midpoint" = "endpoint";

    for (const line of lines) {
        const endpoints = [
            { key: "start" as const, x: line.x1, y: line.y1 },
            { key: "end" as const, x: line.x2, y: line.y2 },
        ];

        for (const ep of endpoints) {
            if (ignore && ignore.lineId === line.id && ignore.endpoint === ep.key) continue;
            const d = distance(point, ep);
            if (d < bestDist) {
                bestDist = d;
                best = { x: ep.x, y: ep.y };
                bestType = "endpoint";
            }
        }

        const mid = getLineMidpoint(line);
        const dm = distance(point, mid);
        if (dm < bestDist) {
            bestDist = dm;
            best = mid;
            bestType = "midpoint";
        }
    }

    if (best) return { point: best, snapped: true, snapType: bestType };
    return { point, snapped: false, snapType: "none" };
}

function getSnappedPoint(
    point: Point,
    lines: Line[],
    ignore?: { lineId: string; endpoint: "start" | "end" } | null,
    frames?: SceneFrame[]
) {
    return getSnapResult(point, lines, ignore, frames).point;
}

function buildConnectedGroup(lines: Line[], selectedLineId: string | null) {
    if (!selectedLineId) return new Set<string>();

    const byId = new Map(lines.map((l) => [l.id, l]));
    const visited = new Set<string>();
    const queue: string[] = [selectedLineId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const current = byId.get(currentId);
        if (!current) continue;

        const currentPoints = [
            { x: current.x1, y: current.y1 },
            { x: current.x2, y: current.y2 },
        ];

        for (const candidate of lines) {
            if (visited.has(candidate.id) || candidate.id === current.id) continue;

            const candidatePoints = [
                { x: candidate.x1, y: candidate.y1 },
                { x: candidate.x2, y: candidate.y2 },
            ];

            const connected = currentPoints.some((p1) =>
                candidatePoints.some((p2) => pointsEqual(p1, p2))
            );

            if (connected) queue.push(candidate.id);
        }
    }

    return visited;
}

function isPointInTriangle(p: Point, p0: Point, p1: Point, p2: Point) {
    const s = p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * p.x + (p0.x - p2.x) * p.y;
    const t = p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y;
    if ((s < 0) !== (t < 0)) return false;
    const A =
        -p1.y * p2.x +
        p0.y * (p2.x - p1.x) +
        p0.x * (p1.y - p2.y) +
        p1.x * p2.y;
    return A < 0 ? s <= 0 && s + t >= A : s >= 0 && s + t <= A;
}

function getInverseTransform(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number
) {
    const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (det === 0) return null;

    const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det;
    const b = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det;
    const c = u0 - a * x0 - b * y0;
    const d = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det;
    const e = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det;
    const f = v0 - d * x0 - e * y0;

    return [a, b, c, d, e, f];
}

function mapPointByTriangles(p: Point, fromNodes: Point[], toNodes: Point[]): Point {
    let fromCx = 0;
    let fromCy = 0;
    let toCx = 0;
    let toCy = 0;

    for (let i = 0; i < fromNodes.length; i++) {
        fromCx += fromNodes[i].x;
        fromCy += fromNodes[i].y;
        toCx += toNodes[i].x;
        toCy += toNodes[i].y;
    }

    fromCx /= fromNodes.length;
    fromCy /= fromNodes.length;
    toCx /= toNodes.length;
    toCy /= toNodes.length;

    for (let i = 0; i < fromNodes.length; i++) {
        const j = (i + 1) % fromNodes.length;
        const fromTri = [{ x: fromCx, y: fromCy }, fromNodes[i], fromNodes[j]];
        const toTri = [{ x: toCx, y: toCy }, toNodes[i], toNodes[j]];

        if (isPointInTriangle(p, fromTri[0], fromTri[1], fromTri[2]) || i === fromNodes.length - 1) {
            const t = getInverseTransform(
                fromTri[0].x,
                fromTri[0].y,
                fromTri[1].x,
                fromTri[1].y,
                fromTri[2].x,
                fromTri[2].y,
                toTri[0].x,
                toTri[0].y,
                toTri[1].x,
                toTri[1].y,
                toTri[2].x,
                toTri[2].y
            );
            if (t) {
                return {
                    x: t[0] * p.x + t[1] * p.y + t[2],
                    y: t[3] * p.x + t[4] * p.y + t[5],
                };
            }
        }
    }

    return p;
}

function getAutoFitNodesByContours(points: Point[], imgW: number, imgH: number, margin = 12): Point[] {
    if (points.length < 2) return [];

    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    let mxx = 0;
    let mxy = 0;
    let myy = 0;

    points.forEach((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        mxx += dx * dx;
        mxy += dx * dy;
        myy += dy * dy;
    });

    const angle = 0.5 * Math.atan2(2 * mxy, mxx - myy);
    const u = { x: Math.cos(angle), y: Math.sin(angle) };
    const v = { x: -Math.sin(angle), y: Math.cos(angle) };

    let pTL = points[0];
    let pTR = points[0];
    let pBR = points[0];
    let pBL = points[0];
    let maxTL = -Infinity;
    let maxTR = -Infinity;
    let maxBR = -Infinity;
    let maxBL = -Infinity;

    points.forEach((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const pu = dx * u.x + dy * u.y;
        const pv = dx * v.x + dy * v.y;

        const scoreTL = -pu - pv;
        const scoreTR = pu - pv;
        const scoreBR = pu + pv;
        const scoreBL = -pu + pv;

        if (scoreTL > maxTL) {
            maxTL = scoreTL;
            pTL = p;
        }
        if (scoreTR > maxTR) {
            maxTR = scoreTR;
            pTR = p;
        }
        if (scoreBR > maxBR) {
            maxBR = scoreBR;
            pBR = p;
        }
        if (scoreBL > maxBL) {
            maxBL = scoreBL;
            pBL = p;
        }
    });

    const uniquePoints = new Set([
        `${pTL.x},${pTL.y}`,
        `${pTR.x},${pTR.y}`,
        `${pBR.x},${pBR.y}`,
        `${pBL.x},${pBL.y}`,
    ]);

    if (uniquePoints.size >= 3) {
        const expand = (p: Point, _cx: number, _cy: number) => {
            const dx = p.x - _cx;
            const dy = p.y - _cy;
            const dist = Math.hypot(dx, dy);
            if (dist === 0) return p;
            return {
                x: p.x + (dx / dist) * margin,
                y: p.y + (dy / dist) * margin,
            };
        };

        const eTL = expand(pTL, cx, cy);
        const eTR = expand(pTR, cx, cy);
        const eBR = expand(pBR, cx, cy);
        const eBL = expand(pBL, cx, cy);

        return [eTL, eTR, eBR, eBL];
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    points.forEach((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const pu = dx * u.x + dy * u.y;
        const pv = dx * v.x + dy * v.y;
        minX = Math.min(minX, pu);
        maxX = Math.max(maxX, pu);
        minY = Math.min(minY, pv);
        maxY = Math.max(maxY, pv);
    });

    const imageAspect = imgW / Math.max(1, imgH);
    let obbW = maxX - minX + margin * 2;
    let obbH = maxY - minY + margin * 2;

    if (obbW > 0 && obbH > 0) {
        const currentAspect = obbW / obbH;
        if (currentAspect > imageAspect) {
            obbH = obbW / imageAspect;
        } else {
            obbW = obbH * imageAspect;
        }
    }

    const hw = obbW / 2;
    const hh = obbH / 2;

    const rotNodes = [
        { u: -hw, v: -hh },
        { u: hw, v: -hh },
        { u: hw, v: hh },
        { u: -hw, v: hh },
    ];

    return rotNodes.map((p) => ({
        x: cx + (p.u * u.x + p.v * v.x),
        y: cy + (p.u * u.y + p.v * v.y),
    }));
}

export default function Tour360SceneCanvas({
    activeTool = "select",
    isEditing,
    planImageUrl,
    anchorTrigger,
    onStateChange,
    viewer,
    initialAnchoredLines,
    initialAnchoredDstNodes,
    initialActiveOverlay,
    fixTrigger,
    selectAllTrigger,
    deselectAllTrigger,
    initialIsFixed = false,
    initialTexts = [],
    initialAnchoredTexts = [],
    editorTab = "GUÍAS",
    addTextTrigger,
    activeArrowPreset = DEFAULT_ARROW_VARIANT,
    addFrameTrigger,
    addPoiBadgeTrigger,
    initialImages = [],
    initialAnchoredImages = [],
    initialPoiBadges = [],
    initialAnchoredPoiBadges = [],
    initialFreehandStrokes = [],
    initialFrames = [],
    initialAnchoredFrames = [],
    initialPolygons = [],
    initialAnchoredPolygons = [],
    onNavigate,
    onDropAsset,
}: {
    activeTool?: string;
    isEditing?: boolean;
    viewer?: any;
    anchorTrigger?: number;
    fixTrigger?: number;
    selectAllTrigger?: number;
    deselectAllTrigger?: number;
    planImageUrl?: string | null;
    onStateChange?: (state: any) => void;
    initialAnchoredLines?: Line[];
    initialAnchoredDstNodes?: { pitch: number; yaw: number }[];
    initialActiveOverlay?: OverlayInstance;
    initialIsFixed?: boolean;
    initialTexts?: TextItem[];
    initialAnchoredTexts?: TextItem[];
    editorTab?: "GUÍAS" | "OVERLAY" | "VISTA";
    addTextTrigger?: { type: string; text: string; timestamp: number } | null;
    activeArrowPreset?: ArrowVariant;
    addFrameTrigger?: { type: "circle" | "square"; timestamp: number } | null;
    addPoiBadgeTrigger?: { variant: "circle" | "square"; imageUrl?: string; title?: string; timestamp: number } | null;
    initialImages?: SceneImage[];
    initialAnchoredImages?: SceneImage[];
    initialPoiBadges?: PoiBadge[];
    initialAnchoredPoiBadges?: PoiBadge[];
    initialFreehandStrokes?: FreehandStroke[];
    initialPolygons?: ScenePolygon[];
    initialAnchoredPolygons?: ScenePolygon[];
    onNavigate?: (target: { sceneId?: string; sceneKey?: string }) => void;
    initialFrames?: SceneFrame[];
    initialAnchoredFrames?: SceneFrame[];
    onDropAsset?: (asset: any) => void;
}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageElementRef = useRef<HTMLImageElement | null>(null);

    const [lines, setLines] = useState<Line[]>([]);
    const [drawing, setDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [preview, setPreview] = useState<Point | null>(null);
    const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
    // Selección múltiple: Set de IDs seleccionados
    const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
    // IDs de líneas bloqueadas para edición (no se pueden borrar ni mover endpoints)
    const [fixedLineIds, setFixedLineIds] = useState<Set<string>>(new Set());
    const [dragTarget, setDragTarget] = useState<DragTarget>(null);
    const dragTargetRef = useRef<DragTarget | null>(null);
    const [pendingFrameDrag, setPendingFrameDrag] = useState<PendingFrameDrag>(null);
    const frameDidDragRef = useRef(false);

    const [anchoredLines, setAnchoredLines] = useState<Line[]>(initialAnchoredLines || []);

    // NATIVE TEXT ITEMS
    const [texts, setTexts] = useState<TextItem[]>(initialTexts || []);
    const [anchoredTexts, setAnchoredTexts] = useState<TextItem[]>(initialAnchoredTexts || []);
    const [frames, setFrames] = useState<SceneFrame[]>(initialFrames || []);
    const [anchoredFrames, setAnchoredFrames] = useState<SceneFrame[]>(initialAnchoredFrames || []);
    
    // NATIVE IMAGES
    const [images, setImages] = useState<SceneImage[]>(initialImages || []);
    const [anchoredImages, setAnchoredImages] = useState<SceneImage[]>(initialAnchoredImages || []);
    const [poiBadges, setPoiBadges] = useState<PoiBadge[]>(initialPoiBadges || []);
    const [anchoredPoiBadges, setAnchoredPoiBadges] = useState<PoiBadge[]>(initialAnchoredPoiBadges || []);
    const [freehandStrokes, setFreehandStrokes] = useState<FreehandStroke[]>(initialFreehandStrokes || []);
    const [polygons, setPolygons] = useState<ScenePolygon[]>(initialPolygons || []);
    const [anchoredPolygons, setAnchoredPolygons] = useState<ScenePolygon[]>(initialAnchoredPolygons || []);
    const [draftFreehandStroke, setDraftFreehandStroke] = useState<FreehandStroke | null>(null);
    const [draftFreehandDisplayPoints, setDraftFreehandDisplayPoints] = useState<Point[]>([]);
    const [draftPolygonPoints, setDraftPolygonPoints] = useState<Point[]>([]);
    const [mapMode, setMapMode] = useState<"TERRAIN" | "IMAGE">("TERRAIN");
    
    const [draftTextItem, setDraftTextItem] = useState<TextItem | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingTextValue, setEditingTextValue] = useState("");



    const initialNodes = initialActiveOverlay
        ? initialActiveOverlay.points.map(p => p.world)
        : initialAnchoredDstNodes || [];

    const [anchoredDstNodes, setAnchoredDstNodes] = useState<{ pitch: number; yaw: number }[]>(initialNodes);

    const [isAnchored, setIsAnchored] = useState(
        (initialAnchoredLines || []).length > 0 ||
        (initialNodes).length > 0 ||
        !!initialActiveOverlay
    );
    const [isFixed, setIsFixed] = useState(initialIsFixed);
    const [viewerState, setViewerState] = useState<ViewerState | null>(null);
    const prevAnchorTriggerRef = useRef(anchorTrigger);
    const prevFixTriggerRef = useRef(fixTrigger);
    const prevSelectAllTriggerRef = useRef(selectAllTrigger);
    const prevDeselectAllTriggerRef = useRef(deselectAllTrigger);
    const lastProcessedTextTriggerRef = useRef<number | null>(null);
    const lastProcessedFrameTriggerRef = useRef<number | null>(null);
    const lastProcessedPoiBadgeTriggerRef = useRef<number | null>(null);
    const hasInitializedRef = useRef(false);
    // Previene que el efecto de sync re-aplique líneas después de la inicialización
    const hasInitializedLinesRef = useRef(false);
    const hasInitializedOverlayRef = useRef(false);

    // Ref viva: permite que callbacks async (img.onload) lean estado actualizado
    // sin que esos valores sean deps del efecto, evitando re-runs innecesarios.
    const liveStateRef = useRef({
        isAnchored: false,
        lines: [] as Line[],
        anchoredLines: [] as Line[],
        projectPitchYaw: null as ((pitch: number, yaw: number) => Point | null) | null,
        getPitchYawFromScreenPoint: null as ((point: Point) => [number, number] | null) | null,
    });

    const [planOpacity, setPlanOpacity] = useState(0.8);
    const [planFixed, setPlanFixed] = useState(false);
    const [imgSize, setImgSize] = useState({ w: 800, h: 600 });



    const initialSrc = initialActiveOverlay
        ? initialActiveOverlay.points.map(p => ({ x: p.src.u * imgSize.w, y: p.src.v * imgSize.h }))
        : [
            { x: 0, y: 0 },
            { x: imgSize.w, y: 0 },
            { x: imgSize.w, y: imgSize.h },
            { x: 0, y: imgSize.h },
        ];

    const [srcNodes, setSrcNodes] = useState<Point[]>(initialSrc);

    const [dstNodes, setDstNodes] = useState<Point[]>([
        { x: 200, y: 200 },
        { x: 800, y: 200 },
        { x: 800, y: 600 },
        { x: 200, y: 600 },
    ]);

    const [draggingSrcNode, setDraggingSrcNode] = useState<number | null>(null);
    const [draggingDstNode, setDraggingDstNode] = useState<number | null>(null);

    useEffect(() => {
        dragTargetRef.current = dragTarget;
    }, [dragTarget]);

    useEffect(() => {
        // Líneas: solo sync en el primer montaje. Después de initialización, las líneas
        // son estado local del canvas y NO deben ser reemplazadas desde el padre
        // (evita el loop: drag overlay → onStateChange → initialAnchoredLines nueva ref → setAnchoredLines).
        if (!hasInitializedLinesRef.current) {
            if (initialAnchoredLines && initialAnchoredLines.length > 0) {
                setAnchoredLines(initialAnchoredLines);
            }
            hasInitializedLinesRef.current = true;
        }

        if (!hasInitializedOverlayRef.current) {
            // Overlay DST nodes: usar solo para inicialización / bootstrap, no sync continuo
            if (initialActiveOverlay) {
                const nextNodes = initialActiveOverlay.points.map(p => p.world);
                const nextSrc = initialActiveOverlay.points.map(p => ({ x: p.src.u * imgSize.w, y: p.src.v * imgSize.h }));

                if (JSON.stringify(nextNodes) !== JSON.stringify(anchoredDstNodes) ||
                    JSON.stringify(nextSrc) !== JSON.stringify(srcNodes)) {
                    setAnchoredDstNodes(nextNodes);
                    setSrcNodes(nextSrc);
                }
                setIsAnchored(true);
            } else if (initialAnchoredDstNodes &&
                JSON.stringify(initialAnchoredDstNodes) !== JSON.stringify(anchoredDstNodes)) {
                setAnchoredDstNodes(initialAnchoredDstNodes);
            }
            hasInitializedOverlayRef.current = true;
        }

        if (initialAnchoredLines?.length || initialAnchoredDstNodes?.length || initialActiveOverlay) {
            setIsAnchored(true);
        }

        hasInitializedRef.current = true;
    }, [initialAnchoredLines, initialAnchoredDstNodes, initialActiveOverlay, imgSize.w, imgSize.h]);

    useEffect(() => {
        setIsFixed(initialIsFixed);
    }, [initialIsFixed]);

    useEffect(() => {
        if (!viewer) {
            setViewerState(null);
            return;
        }

        let rafId: number;

        const update = () => {
            try {
                setViewerState({
                    pitch: viewer.getPitch(),
                    yaw: viewer.getYaw(),
                    hfov: viewer.getHfov(),
                });
            } catch {
                setViewerState(null);
            }
            rafId = requestAnimationFrame(update);
        };

        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [viewer]);

    const getPitchYawFromScreenPoint = useCallback(
        (point: Point): [number, number] | null => {
            if (!viewer || !svgRef.current) return null;

            const rect = svgRef.current.getBoundingClientRect();
            const clientX = rect.left + point.x;
            const clientY = rect.top + point.y;

            try {
                const coords = viewer.mouseEventToCoords({ clientX, clientY } as MouseEvent);
                if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;
                return coords as [number, number];
            } catch {
                return null;
            }
        },
        [viewer]
    );

    const finalizePolygon = useCallback((points: Point[]) => {
        if (points.length < 3) {
            setDraftPolygonPoints([]);
            return;
        }

        const newId = `poly-${Date.now()}`;
        const basePoly: ScenePolygon = {
            id: newId,
            points: points,
            fillColor: "rgba(16, 185, 129, 0.4)",
            strokeColor: "white",
        };

        if (isAnchored) {
            const pitchPoints = points.map(p => getPitchYawFromScreenPoint(p));
            if (pitchPoints.every(p => p !== null)) {
                setAnchoredPolygons((prev) => [...prev, {
                    ...basePoly,
                    pitchPoints: pitchPoints.map(p => ({ pitch: p![0], yaw: p![1] })),
                    anchorHfov: viewerState?.hfov
                }]);
            } else {
                setPolygons((prev) => [...prev, basePoly]);
            }
        } else {
            setPolygons((prev) => [...prev, basePoly]);
        }

        setSelectedLineIds(new Set([newId]));
        setDraftPolygonPoints([]);
    }, [isAnchored, getPitchYawFromScreenPoint, viewerState]);

    const projectPitchYaw = useCallback(
        (pitch: number, yaw: number): Point | null => {
            if (!viewer || !svgRef.current) return null;

            const rect = svgRef.current.getBoundingClientRect();

            if (typeof viewer.viewToContainerPoint === "function") {
                try {
                    const pt = viewer.viewToContainerPoint(pitch, yaw);
                    if (pt && typeof pt.x === "number" && typeof pt.y === "number") {
                        return { x: pt.x, y: pt.y };
                    }
                } catch { }
            }

            if (typeof viewer.viewToContainerPoints === "function") {
                try {
                    const pts = viewer.viewToContainerPoints(pitch, yaw);
                    if (Array.isArray(pts) && pts.length === 2 && !isNaN(pts[0]) && !isNaN(pts[1])) {
                        return { x: pts[0], y: pts[1] };
                    }
                } catch { }
            }

            if (!viewerState) return null;

            const width = rect.width;
            const height = rect.height;
            const degToRad = Math.PI / 180;

            const p = pitch * degToRad;
            const y = yaw * degToRad;
            const vp = viewerState.pitch * degToRad;
            const vy = viewerState.yaw * degToRad;

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

            const focalLength = (width / 2) / Math.tan((viewerState.hfov * degToRad) / 2);

            return {
                x: (rx / rz) * focalLength + width / 2,
                y: (-ry / rz) * focalLength + height / 2,
            };
        },
        [viewer, viewerState]
    );

    const projectedDisplayFrames = useMemo(() => {
        const projectedAnchored = anchoredFrames.map((f) => {
            let screenFrame = f;

            if (!(dragTarget && (dragTarget.type === "frame" || dragTarget.type === "frame-resize") && dragTarget.frameId === f.id)) {
                if (f.pitch === undefined || f.yaw === undefined) {
                    screenFrame = { ...f, x: -10000, y: -10000 };
                } else {
                    const p = projectPitchYaw(f.pitch, f.yaw);
                    screenFrame = p ? { ...f, x: p.x, y: p.y } : { ...f, x: -10000, y: -10000 };
                }
            }

            const renderScale = getHfovScale(screenFrame.anchorHfov, viewerState?.hfov);
            return {
                ...screenFrame,
                renderScale,
                snapX: screenFrame.x,
                snapY: screenFrame.y + ((screenFrame.height * renderScale) / 2),
            };
        });

        const anchoredIds = new Set(anchoredFrames.map((f) => f.id));
        const filtered2D = frames
            .filter((f) => !anchoredIds.has(f.id))
            .map((f) => ({
                ...f,
                renderScale: 1,
                snapX: f.x,
                snapY: f.y + (f.height / 2),
            }));

        return [...filtered2D, ...projectedAnchored];
    }, [frames, anchoredFrames, projectPitchYaw, viewerState, dragTarget]);

    const displayPolygons = useMemo(() => {
        const projectedAnchored = anchoredPolygons.map((poly) => {
            if (!poly.pitchPoints || poly.pitchPoints.length !== poly.points.length) {
                return { ...poly, points: poly.points.map(() => ({ x: -9999, y: -9999 })) };
            }
            const pts = poly.pitchPoints.map(p => {
                const proj = projectPitchYaw(p.pitch, p.yaw);
                return proj || { x: -9999, y: -9999 };
            });
            if (pts.some(p => p.x === -9999)) {
                return { ...poly, points: poly.points.map(() => ({ x: -9999, y: -9999 })) };
            }
            return { ...poly, points: pts };
        });

        const anchoredIds = new Set(anchoredPolygons.map(p => p.id));
        const filtered2D = polygons.filter(p => !anchoredIds.has(p.id));

        return [...filtered2D, ...projectedAnchored];
    }, [polygons, anchoredPolygons, projectPitchYaw, viewerState]);

    const displayLines = useMemo(() => {
        // Proyectar líneas ancladas (con world-space) a coordenadas de pantalla
        const projectedAnchored = anchoredLines.map((line) => {
            if (
                line.pitch1 === undefined ||
                line.yaw1 === undefined ||
                line.pitch2 === undefined ||
                line.yaw2 === undefined
            ) {
                // Sin world-space: ocultamos la línea moviéndola fuera del canvas preventivamente
                return { ...line, x1: -9999, y1: -9999, x2: -9999, y2: -9999 };
            }
            const p1 = projectPitchYaw(line.pitch1, line.yaw1);
            const p2 = projectPitchYaw(line.pitch2, line.yaw2);
            // Si la proyección falla, no hacer fallback 2D normal; ocultamos la línea
            if (!p1 || !p2) {
                return { ...line, x1: -9999, y1: -9999, x2: -9999, y2: -9999 };
            }
            const nextLine = { ...line, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
            if (line.type !== "arrow") return nextLine;

            const snappedStart = findClosestFrameSnapPoint({ x: nextLine.x1, y: nextLine.y1 }, projectedDisplayFrames, 40);
            const snappedEnd = findClosestFrameSnapPoint({ x: nextLine.x2, y: nextLine.y2 }, projectedDisplayFrames, 40);

            return {
                ...nextLine,
                x1: snappedStart?.x ?? nextLine.x1,
                y1: snappedStart?.y ?? nextLine.y1,
                x2: snappedEnd?.x ?? nextLine.x2,
                y2: snappedEnd?.y ?? nextLine.y2,
            };
        });

        // Siempre mostrar AMBAS arrays: 2D no-ancladas + ancladas proyectadas
        return [...lines, ...projectedAnchored];
    }, [lines, anchoredLines, projectPitchYaw, viewerState, projectedDisplayFrames]);

    const displayTexts = useMemo(() => {
        const projectedAnchored = anchoredTexts.map((textItem) => {
            // Si estamos arrastrando este texto específico, usamos x/y directos 
            // para que no haya lag de proyección 3D (Canva-like smoothness)
            if (dragTarget?.type === "text" && dragTarget.textId === textItem.id) {
                return textItem;
            }
            const p = projectPitchYaw(textItem.pitch!, textItem.yaw!);
            if (!p) return { ...textItem, x: -9999, y: -9999 };
            return { ...textItem, x: p.x, y: p.y };
        });

        const allTexts = [...texts, ...projectedAnchored];
        if (draftTextItem) {
            allTexts.push(draftTextItem);
        }
        
        // Sincronizar todos los textos con sus coordenadas actuales de arrastre si aplica
        return allTexts.map(t => {
            if (dragTarget?.type === "text" && dragTarget.textId === t.id) {
                return t; // Ya tiene x e y actualizados por el mouseMove
            }
            return t;
        });
    }, [texts, anchoredTexts, draftTextItem, projectPitchYaw, viewerState, dragTarget]);

    const displayFrames = useMemo(() => {
        // 1. Proyectamos los marcos anclados (3D)
        const projectedAnchored = anchoredFrames.map((f) => {
            // Si lo estamos arrastrando, usamos su posición de ratón actual (ya es X/Y)
            if (dragTarget && (dragTarget.type === "frame" || dragTarget.type === "frame-resize") && dragTarget.frameId === f.id) {
                const renderScale = getHfovScale(f.anchorHfov, viewerState?.hfov);
                return {
                    ...f,
                    renderScale,
                    snapX: f.x,
                    snapY: f.y + ((f.height * renderScale) / 2),
                };
            }
            if (f.pitch === undefined || f.yaw === undefined) return { ...f, x: -10000, y: -10000, renderScale: 1, snapX: -10000, snapY: -10000 };
            
            const p = projectPitchYaw(f.pitch, f.yaw);
            if (!p) return { ...f, x: -10000, y: -10000, renderScale: 1, snapX: -10000, snapY: -10000 };
            const renderScale = getHfovScale(f.anchorHfov, viewerState?.hfov);
            return {
                ...f,
                x: p.x,
                y: p.y,
                renderScale,
                snapX: p.x,
                snapY: p.y + ((f.height * renderScale) / 2),
            };
        });

        // 2. Filtramos la lista 2D para que NO incluya nada que ya esté en la lista 3D
        const anchoredIds = new Set(anchoredFrames.map(f => f.id));
        const filtered2D = frames
            .filter(f => !anchoredIds.has(f.id))
            .map((f) => ({
                ...f,
                renderScale: 1,
                snapX: f.x,
                snapY: f.y + (f.height / 2),
            }));

        // 3. Unión final sin duplicados
        return [...filtered2D, ...projectedAnchored];
    }, [frames, anchoredFrames, projectPitchYaw, viewerState, dragTarget]);

    const displayImages = useMemo(() => {
        const projectedAnchored = anchoredImages.map((img) => {
            const p = projectPitchYaw(img.pitch!, img.yaw!);
            if (!p) return { ...img, x: -9999, y: -9999 };
            return { ...img, x: p.x, y: p.y };
        });

        return [...images, ...projectedAnchored];
    }, [images, anchoredImages, projectPitchYaw, viewerState]);

    const displayPoiBadges = useMemo(() => {
        const projectedAnchored = anchoredPoiBadges.map((badge) => {
            if (dragTarget?.type === "poi-badge" && dragTarget.poiBadgeId === badge.id) {
                return badge;
            }
            const p = projectPitchYaw(badge.pitch!, badge.yaw!);
            if (!p) return { ...badge, x: -9999, y: -9999 };
            return { ...badge, x: p.x, y: p.y };
        });

        return [...poiBadges, ...projectedAnchored];
    }, [poiBadges, anchoredPoiBadges, projectPitchYaw, viewerState, dragTarget]);

    const displayFreehandStrokes = useMemo(() => {
        return freehandStrokes
            .map((stroke) => {
                const projectedPoints = stroke.points
                    .map((node) => projectPitchYaw(node.pitch, node.yaw))
                    .filter(Boolean) as Point[];

                if (projectedPoints.length < 2) return null;

                return {
                    ...stroke,
                    projectedPoints,
                };
            })
            .filter(Boolean) as Array<FreehandStroke & { projectedPoints: Point[] }>;
    }, [freehandStrokes, projectPitchYaw, viewerState]);

    const anchoredTextIds = useMemo(() => new Set(anchoredTexts.map((textItem) => textItem.id)), [anchoredTexts]);
    const anchoredFrameIds = useMemo(() => new Set(anchoredFrames.map((frame) => frame.id)), [anchoredFrames]);
    const anchoredImageIds = useMemo(() => new Set(anchoredImages.map((image) => image.id)), [anchoredImages]);
    const anchoredPoiBadgeIds = useMemo(() => new Set(anchoredPoiBadges.map((badge) => badge.id)), [anchoredPoiBadges]);

    const getAnchoredObjectScale = useCallback((anchorHfov?: number) => {
        if (!viewerState?.hfov || !anchorHfov) return 1;

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const current = Math.tan(toRad(viewerState.hfov) / 2);
        const reference = Math.tan(toRad(anchorHfov) / 2);

        if (!isFinite(current) || !isFinite(reference) || current <= 0 || reference <= 0) {
            return 1;
        }

        return reference / current;
    }, [viewerState]);

    const displayDstNodes = useMemo(() => {
        if (!isAnchored && !isFixed) return dstNodes;

        return anchoredDstNodes.map((node) => {
            const p = projectPitchYaw(node.pitch, node.yaw);
            return p ?? HIDDEN_POINT;
        });
    }, [isAnchored, isFixed, dstNodes, anchoredDstNodes, projectPitchYaw, viewerState]);

    // displaySelectedIds ahora es directamente el Set de selección múltiple
    const displaySelectedIds = selectedLineIds;

    const getPoint = (e: React.MouseEvent | MouseEvent) => {
        const rect = svgRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const projectAnchoredLinesToScreen = useCallback(() => {
        return anchoredLines
            .map((line) => {
                if (
                    line.pitch1 === undefined ||
                    line.yaw1 === undefined ||
                    line.pitch2 === undefined ||
                    line.yaw2 === undefined
                ) {
                    return null;
                }

                const p1 = projectPitchYaw(line.pitch1, line.yaw1);
                const p2 = projectPitchYaw(line.pitch2, line.yaw2);

                if (!p1 || !p2) return null;

                return {
                    ...line,
                    x1: p1.x,
                    y1: p1.y,
                    x2: p2.x,
                    y2: p2.y,
                };
            })
            .filter((l): l is Line => l !== null);
    }, [anchoredLines, projectPitchYaw]);

    const projectAnchoredDstNodesToScreen = useCallback((): Point[] => {
        return anchoredDstNodes.map((node) => {
            const p = projectPitchYaw(node.pitch, node.yaw);
            return p ?? HIDDEN_POINT;
        });
    }, [anchoredDstNodes, projectPitchYaw]);

    useEffect(() => {
        if (anchorTrigger === prevAnchorTriggerRef.current) return;
        prevAnchorTriggerRef.current = anchorTrigger;

        if (selectedLineIds.size > 0) {
            const idsList = Array.from(selectedLineIds);
            let hasAnchoredAnything = false;
            
            idsList.forEach(id => {
                // Caso: LINEAS
                const line2D = lines.find(l => l.id === id);
                if (line2D) {
                    const p1 = { x: line2D.x1, y: line2D.y1 };
                    const p2 = { x: line2D.x2, y: line2D.y2 };
                    const c1 = getPitchYawFromScreenPoint(p1);
                    const c2 = getPitchYawFromScreenPoint(p2);
                    if (c1 && c2) {
                        setAnchoredLines(prev => [...prev, {
                            ...line2D,
                            pitch1: c1[0],
                            yaw1: c1[1],
                            pitch2: c2[0],
                            yaw2: c2[1],
                        }]);
                        setLines(prev => prev.filter(l => l.id !== id));
                        hasAnchoredAnything = true;
                    }
                } else {
                    const line3D = anchoredLines.find(l => l.id === id);
                    if (line3D) {
                        setLines(prev => [...prev, line3D]);
                        setAnchoredLines(prev => prev.filter(l => l.id !== id));
                    }
                }

                // Caso: TEXTOS
                const text2D = texts.find(t => t.id === id);
                if (text2D) {
                    const coords = getPitchYawFromScreenPoint({ x: text2D.x, y: text2D.y });
                    if (coords) {
                        setAnchoredTexts(prev => [...prev, { ...text2D, pitch: coords[0], yaw: coords[1], anchorHfov: viewerState?.hfov }]);
                        setTexts(prev => prev.filter(t => t.id !== id));
                        hasAnchoredAnything = true;
                    }
                } else {
                    const text3D = anchoredTexts.find(t => t.id === id);
                    if (text3D) {
                        setTexts(prev => [...prev, text3D]);
                        setAnchoredTexts(prev => prev.filter(t => t.id !== id));
                    }
                }

                // Caso: MARCOS (TRANSICIÓN SEGURA)
                const frame2D = frames.find(f => f.id === id);
                if (frame2D) {
                    const coords = getPitchYawFromScreenPoint({ x: frame2D.x, y: frame2D.y });
                    if (coords) {
                        const newAnchored = { ...frame2D, pitch: coords[0], yaw: coords[1], anchorHfov: viewerState?.hfov };
                        setAnchoredFrames(prev => {
                            const without = prev.filter(f => f.id !== id);
                            return [...without, newAnchored];
                        });
                        setFrames(prev => prev.filter(f => f.id !== id));
                        hasAnchoredAnything = true;
                    }
                } else {
                    const frame3D = anchoredFrames.find(f => f.id === id);
                    if (frame3D) {
                        // Al desanclar (Liberar World-Space), proyectamos a 2D actual
                        setFrames(prev => {
                            const without = prev.filter(f => f.id !== id);
                            return [...without, frame3D];
                        });
                        setAnchoredFrames(prev => prev.filter(f => f.id !== id));
                    }
                }

                // Caso: IMAGENES
                const img2D = images.find(i => i.id === id);
                if (img2D) {
                    const coords = getPitchYawFromScreenPoint({ x: img2D.x, y: img2D.y });
                    if (coords) {
                        setAnchoredImages(prev => [...prev, { ...img2D, pitch: coords[0], yaw: coords[1], anchorHfov: viewerState?.hfov, isAnchored: true }]);
                        setImages(prev => prev.filter(i => i.id !== id));
                        hasAnchoredAnything = true;
                    }
                } else {
                    const img3D = anchoredImages.find(i => i.id === id);
                    if (img3D) {
                        setImages(prev => [...prev, { ...img3D, isAnchored: false }]);
                        setAnchoredImages(prev => prev.filter(i => i.id !== id));
                    }
                }

                // Caso: POI BADGES
                const poi2D = poiBadges.find(p => p.id === id);
                if (poi2D) {
                    const coords = getPitchYawFromScreenPoint({ x: poi2D.x, y: poi2D.y });
                    if (coords) {
                        setAnchoredPoiBadges(prev => [...prev, { ...poi2D, pitch: coords[0], yaw: coords[1], anchorHfov: viewerState?.hfov }]);
                        setPoiBadges(prev => prev.filter(p => p.id !== id));
                        hasAnchoredAnything = true;
                    }
                } else {
                    const poi3D = anchoredPoiBadges.find(p => p.id === id);
                    if (poi3D) {
                        setPoiBadges(prev => [...prev, poi3D]);
                        setAnchoredPoiBadges(prev => prev.filter(p => p.id !== id));
                    }
                }

                // Caso: POLYGONS
                const poly2D = polygons.find(p => p.id === id);
                if (poly2D) {
                    const pitchPoints = poly2D.points.map(p => getPitchYawFromScreenPoint(p));
                    if (pitchPoints.every(p => p !== null)) {
                        setAnchoredPolygons(prev => [...prev, { ...poly2D, pitchPoints: pitchPoints.map(p => ({ pitch: p![0], yaw: p![1] })), anchorHfov: viewerState?.hfov }]);
                        setPolygons(prev => prev.filter(p => p.id !== id));
                        hasAnchoredAnything = true;
                    }
                } else {
                    const poly3D = anchoredPolygons.find(p => p.id === id);
                    if (poly3D) {
                        setPolygons(prev => [...prev, poly3D]);
                        setAnchoredPolygons(prev => prev.filter(p => p.id !== id));
                    }
                }
            });

            if (hasAnchoredAnything) setIsAnchored(true);
            return;
        }

        // ——— SIN SELECCIÓN: toggle global ———
        if (!isAnchored) {
            const newAnchoredLines = lines.map(l => {
                const s = getPitchYawFromScreenPoint({ x: l.x1, y: l.y1 });
                const e = getPitchYawFromScreenPoint({ x: l.x2, y: l.y2 });
                return s && e ? {
                    ...l,
                    pitch1: s[0],
                    yaw1: s[1],
                    pitch2: e[0],
                    yaw2: e[1],
                } : null;
            }).filter(Boolean) as Line[];

            const newAnchoredTexts = texts.map(t => {
                const c = getPitchYawFromScreenPoint({ x: t.x, y: t.y });
                return c ? { ...t, pitch: c[0], yaw: c[1], anchorHfov: viewerState?.hfov } : null;
            }).filter(Boolean) as TextItem[];

            const newAnchoredFrames = frames.map(f => {
                const c = getPitchYawFromScreenPoint({ x: f.x, y: f.y });
                return c ? { ...f, pitch: c[0], yaw: c[1], anchorHfov: viewerState?.hfov } : null;
            }).filter(Boolean) as SceneFrame[];

            const newAnchoredPoiBadges = poiBadges.map(p => {
                const c = getPitchYawFromScreenPoint({ x: p.x, y: p.y });
                return c ? { ...p, pitch: c[0], yaw: c[1], anchorHfov: viewerState?.hfov } : null;
            }).filter(Boolean) as PoiBadge[];

            const newAnchoredPolygons = polygons.map(p => {
                const pitchPoints = p.points.map(pt => getPitchYawFromScreenPoint(pt));
                if (pitchPoints.every(pt => pt !== null)) {
                    return { ...p, pitchPoints: pitchPoints.map(pt => ({ pitch: pt![0], yaw: pt![1] })), anchorHfov: viewerState?.hfov };
                }
                return null;
            }).filter(Boolean) as ScenePolygon[];

            setAnchoredLines(newAnchoredLines);
            setAnchoredTexts(newAnchoredTexts);
            setAnchoredFrames(newAnchoredFrames);
            setAnchoredPoiBadges(newAnchoredPoiBadges);
            setAnchoredPolygons(newAnchoredPolygons);
            setIsAnchored(true);
            setLines([]);
            setTexts([]);
            setFrames([]);
            setPoiBadges([]);
            setPolygons([]);
        } else {
            setIsAnchored(false);
            setLines(prev => [...prev, ...anchoredLines]);
            setTexts(prev => [...prev, ...anchoredTexts]);
            setFrames(prev => [...prev, ...anchoredFrames]);
            setPoiBadges(prev => [...prev, ...anchoredPoiBadges]);
            setPolygons(prev => [...prev, ...anchoredPolygons]);
            setAnchoredLines([]);
            setAnchoredTexts([]);
            setAnchoredFrames([]);
            setAnchoredPoiBadges([]);
            setAnchoredPolygons([]);
        }
    }, [
        anchorTrigger,
        selectedLineIds,
        isAnchored,
        lines,
        texts,
        frames,
        images,
        poiBadges,
        anchoredLines,
        anchoredTexts,
        anchoredFrames,
        anchoredImages,
        anchoredPoiBadges,
        getPitchYawFromScreenPoint,
        projectPitchYaw,
        viewerState,
    ]);

    const lastPlanUrlRef = useRef<string | null>(null);

    // Mantener liveStateRef actualizado en cada render
    liveStateRef.current = {
        isAnchored,
        lines,
        anchoredLines,
        projectPitchYaw,
        getPitchYawFromScreenPoint,
    };

    useEffect(() => {
        if (!planImageUrl) {
            imageElementRef.current = null;
            lastPlanUrlRef.current = null;
            return;
        }

        if (planImageUrl === lastPlanUrlRef.current) return;
        lastPlanUrlRef.current = planImageUrl;

        const img = new Image();
        img.onload = () => {
            imageElementRef.current = img;

            const w = img.naturalWidth || 800;
            const h = img.naturalHeight || 600;
            setImgSize({ w, h });

            setSrcNodes([
                { x: 0, y: 0 },
                { x: w / 2, y: 0 },
                { x: w, y: 0 },
                { x: w, y: h },
                { x: w / 2, y: h },
                { x: 0, y: h },
            ]);

            const currentLinePoints: Point[] = [];

            // Leer estado actual via ref para evitar closures stale
            const { isAnchored: _isAnchored, anchoredLines: _anchoredLines, lines: _lines,
                projectPitchYaw: _project, getPitchYawFromScreenPoint: _getCoords } = liveStateRef.current;

            if (_isAnchored) {
                _anchoredLines.forEach((l) => {
                    if (l.pitch1 === undefined || l.yaw1 === undefined ||
                        l.pitch2 === undefined || l.yaw2 === undefined) return;
                    if (!_project) return;
                    const p1 = _project(l.pitch1, l.yaw1);
                    const p2 = _project(l.pitch2, l.yaw2);
                    if (p1 && p2) currentLinePoints.push(p1, p2);
                });
            } else {
                _lines.forEach((l) => {
                    currentLinePoints.push({ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 });
                });
            }

            if (currentLinePoints.length > 0) {
                const autoNodes = getAutoFitNodesByContours(currentLinePoints, w, h, 8);

                if (autoNodes.length === 4) {
                    if (_isAnchored) {
                        const anchoredN = autoNodes
                            .map((node) => {
                                if (!_getCoords) return null;
                                const coords = _getCoords(node);
                                if (!coords) return null;
                                return { pitch: coords[0], yaw: coords[1] };
                            })
                            .filter((node): node is { pitch: number; yaw: number } => node !== null);

                        if (anchoredN.length === 4) {
                            setAnchoredDstNodes(anchoredN);
                        }
                    } else {
                        setDstNodes(autoNodes);
                    }
                }
            } else {
                const scW = typeof window !== "undefined" ? window.innerWidth : 1920;
                const scH = typeof window !== "undefined" ? window.innerHeight : 1080;
                const fitW = scW * 0.4;
                const fitH = fitW / (w / h);
                const cx = scW / 2;
                const cy = scH / 2;

                setDstNodes([
                    { x: cx - fitW / 2, y: cy - fitH / 2 },
                    { x: cx + fitW / 2, y: cy - fitH / 2 },
                    { x: cx + fitW / 2, y: cy + fitH / 2 },
                    { x: cx - fitW / 2, y: cy + fitH / 2 },
                ]);
            }
        };

        img.src = planImageUrl;
        // OJO: las líneas y el estado de anclaje NO son deps de este efecto.
        // El efecto solo debe re-correr cuando cambia la URL de la imagen.
        // El autofit se ejecuta una única vez al cargar la imagen,
        // capturando el estado actual vía ref para evitar closures stale
        // y para evitar que mover líneas regenere el autofit del overlay.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planImageUrl]);
    const drawWarpedImage = useCallback(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        const canvas = canvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!planImageUrl || planOpacity <= 0) return;

        const img = imageElementRef.current;
        if (!img) return;

        const currentDstNodes = displayDstNodes;

        // Fase 2: Validación estricta de estados de malla permitidos
        if (![4, 6, 8].includes(currentDstNodes.length)) {
            console.error(`[Tour360SceneCanvas] Malla inválida (${currentDstNodes.length} puntos). Solo se admiten 4, 6 u 8 puntos.`);
            return;
        }

        if (currentDstNodes.length !== srcNodes.length) return;
        if (currentDstNodes.some((n) => n.x === HIDDEN_POINT.x && n.y === HIDDEN_POINT.y)) return;

        ctx.globalAlpha = planOpacity;

        // Fase 2: Triangulación en abanico (Triangle Fan) desde el Nodo 0
        // Esta estrategia asume que los puntos están ordenados perimetralmente.
        const indices: number[][] = [];
        for (let i = 1; i < currentDstNodes.length - 1; i++) {
            indices.push([0, i, i + 1]);
        }

        for (const tri of indices) {
            const srcTri = [srcNodes[tri[0]], srcNodes[tri[1]], srcNodes[tri[2]]];
            const dstTri = [currentDstNodes[tri[0]], currentDstNodes[tri[1]], currentDstNodes[tri[2]]];

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(dstTri[0].x, dstTri[0].y);
            ctx.lineTo(dstTri[1].x, dstTri[1].y);
            ctx.lineTo(dstTri[2].x, dstTri[2].y);
            ctx.closePath();
            ctx.clip();

            const t = getInverseTransform(
                dstTri[0].x, dstTri[0].y, dstTri[1].x, dstTri[1].y, dstTri[2].x, dstTri[2].y,
                srcTri[0].x, srcTri[0].y, srcTri[1].x, srcTri[1].y, srcTri[2].x, srcTri[2].y
            );

            if (t) {
                ctx.transform(t[0], t[3], t[1], t[4], t[2], t[5]);
                ctx.drawImage(img, 0, 0);
            }
            ctx.restore();
        }
    }, [planImageUrl, planOpacity, srcNodes, displayDstNodes]);

    useEffect(() => {
        let frameId: number;

        const renderLoop = () => {
            drawWarpedImage();
            frameId = requestAnimationFrame(renderLoop);
        };

        renderLoop();
        return () => cancelAnimationFrame(frameId);
    }, [drawWarpedImage, viewerState]);

    useEffect(() => {
        if (fixTrigger === prevFixTriggerRef.current) return;
        prevFixTriggerRef.current = fixTrigger;

        if (selectedLineIds.size > 0) {
            // ——— FIJAR SELECTIVO: toggle lock solo para líneas seleccionadas ———
            const allAlreadyFixed = Array.from(selectedLineIds).every((id) => fixedLineIds.has(id));
            setFixedLineIds((prev) => {
                const next = new Set(prev);
                Array.from(selectedLineIds).forEach((id) => {
                    if (allAlreadyFixed) next.delete(id);
                    else next.add(id);
                });
                return next;
            });
        } else {
            // ——— SIN SELECCIÓN: toggle global para el overlay mesh ———
            if (!isFixed) {
                if (isAnchored && (anchoredLines.length > 0 || anchoredDstNodes.length > 0)) {
                    setIsFixed(true);
                } else {
                    console.warn("[Tour360SceneCanvas] No se puede fijar: primero debe anclar la escena.");
                }
            } else {
                setIsFixed(false);
            }
        }
    }, [fixTrigger, selectedLineIds, fixedLineIds, isFixed, isAnchored, anchoredLines, anchoredDstNodes, frames, anchoredFrames]);

    useEffect(() => {
        if (selectAllTrigger === prevSelectAllTriggerRef.current) return;
        prevSelectAllTriggerRef.current = selectAllTrigger;

        const allThings = [...lines, ...anchoredLines, ...texts, ...anchoredTexts, ...freehandStrokes];
        if (allThings.length > 0) {
            setSelectedLineIds(new Set(allThings.map((l) => l.id)));
        }
    }, [selectAllTrigger, lines, anchoredLines, texts, anchoredTexts, freehandStrokes]);

    // Deseleccionar todas
    useEffect(() => {
        if (deselectAllTrigger === prevDeselectAllTriggerRef.current) return;
        prevDeselectAllTriggerRef.current = deselectAllTrigger;
        setSelectedLineIds(new Set());
    }, [deselectAllTrigger]);

    useEffect(() => {
        if (!hasInitializedRef.current) return;

        const activeOverlay: OverlayInstance | undefined = planImageUrl ? {
            imageUrl: planImageUrl,
            points: anchoredDstNodes.map((node, i) => ({
                id: `opt-${i}`,
                src: {
                    u: (srcNodes[i]?.x ?? 0) / (imgSize.w || 1),
                    v: (srcNodes[i]?.y ?? 0) / (imgSize.h || 1)
                },
                world: node
            })),
            isFixed,
            opacity: planOpacity
        } : undefined;

        // OPTIMIZACIÓN: Throttling de onStateChange para evitar saturación del thread principal
        const timer = setTimeout(() => {
            onStateChange?.({
                lines,
                anchoredLines,
                texts,
                anchoredTexts,
                poiBadges,
                anchoredPoiBadges,
                freehandStrokes,
                polygons,
                anchoredPolygons,
                srcNodes,
                dstNodes,
                anchoredDstNodes,
                activeOverlay,
                isAnchored,
                isFixed,
                fixedLineIds: Array.from(fixedLineIds),
                selectedLineIds: Array.from(selectedLineIds),
                frames,
                anchoredFrames,
                images,
                anchoredImages,
            });
        }, 100); // Debounce de 100ms para fluidez total

        return () => clearTimeout(timer);
    }, [lines, anchoredLines, texts, anchoredTexts, poiBadges, anchoredPoiBadges, freehandStrokes, polygons, anchoredPolygons, frames, anchoredFrames, images, anchoredImages, srcNodes, dstNodes, anchoredDstNodes, isAnchored, isFixed, fixedLineIds, selectedLineIds, planImageUrl, planOpacity, imgSize.w, imgSize.h, onStateChange]);

    // EFECTO: Detectar trigger de añadir texto desde el panel lateral
    useEffect(() => {
        if (!addTextTrigger) return;
        if (lastProcessedTextTriggerRef.current === addTextTrigger.timestamp) return;
        const textTrigger = addTextTrigger;
        lastProcessedTextTriggerRef.current = textTrigger.timestamp;

        const container = containerRef.current;
        if (!container) return;

        const centerX = container.clientWidth / 2;
        const centerY = container.clientHeight / 2;

        const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        const newText: TextItem = {
            id: newId,
            text: textTrigger.text,
            x: centerX,
            y: centerY,
            fontSize: textTrigger.type === "title" ? 32 : textTrigger.type === "subtitle" ? 24 : 18
        };

        if (isAnchored) {
            const coords = getPitchYawFromScreenPoint({ x: centerX, y: centerY });
            if (coords) {
                newText.pitch = coords[0];
                newText.yaw = coords[1];
                newText.anchorHfov = viewerState?.hfov;
                setAnchoredTexts(prev => [...prev, newText]);
            } else {
                setTexts(prev => [...prev, newText]);
            }
        } else {
            setTexts(prev => [...prev, newText]);
        }
        setSelectedLineIds(new Set([newId]));
        setEditingTextValue(newText.text);
        setEditingTextId(newId);
    }, [addTextTrigger, getPitchYawFromScreenPoint, isAnchored, viewerState]);

    // EFECTO: Detectar trigger de añadir MARCO
    useEffect(() => {
        if (!addFrameTrigger) return;
        if (lastProcessedFrameTriggerRef.current === addFrameTrigger.timestamp) return;
        const frameTrigger = addFrameTrigger;
        lastProcessedFrameTriggerRef.current = frameTrigger.timestamp;
        
        const container = containerRef.current;
        if (!container) return;

        const centerX = container.clientWidth / 2;
        const centerY = container.clientHeight / 2;
        const newId = `frame-${Date.now()}`;

        const newFrame: SceneFrame = {
            id: newId,
            type: frameTrigger.type,
            x: centerX,
            y: centerY,
            width: 200,
            height: 200
        };

        if (isAnchored) {
            const coords = getPitchYawFromScreenPoint({ x: centerX, y: centerY });
            if (coords) {
                newFrame.pitch = coords[0];
                newFrame.yaw = coords[1];
                newFrame.anchorHfov = viewerState?.hfov;
            }
            setAnchoredFrames(prev => [...prev, newFrame]);
        } else {
            setFrames(prev => [...prev, newFrame]);
        }
        
        setSelectedLineIds(new Set([newId]));
    }, [addFrameTrigger, getPitchYawFromScreenPoint, isAnchored, viewerState]);

    useEffect(() => {
        if (!addPoiBadgeTrigger) return;
        if (lastProcessedPoiBadgeTriggerRef.current === addPoiBadgeTrigger.timestamp) return;
        const poiBadgeTrigger = addPoiBadgeTrigger;
        lastProcessedPoiBadgeTriggerRef.current = poiBadgeTrigger.timestamp;

        const container = containerRef.current;
        if (!container) return;

        const centerX = container.clientWidth / 2;
        const centerY = container.clientHeight / 2;
        const newId = `poi-${Date.now()}`;

        const newPoiBadge: PoiBadge = {
            id: newId,
            type: "poi-badge",
            variant: poiBadgeTrigger.variant,
            x: centerX,
            y: centerY,
            width: 88,
            height: 88,
            imageUrl: poiBadgeTrigger.imageUrl,
            title: poiBadgeTrigger.title,
        };

        if (isAnchored) {
            const coords = getPitchYawFromScreenPoint({ x: centerX, y: centerY });
            if (coords) {
                newPoiBadge.pitch = coords[0];
                newPoiBadge.yaw = coords[1];
                newPoiBadge.anchorHfov = viewerState?.hfov;
                setAnchoredPoiBadges((prev) => [...prev, newPoiBadge]);
            } else {
                setPoiBadges((prev) => [...prev, newPoiBadge]);
            }
        } else {
            setPoiBadges((prev) => [...prev, newPoiBadge]);
        }

        setSelectedLineIds(new Set([newId]));
    }, [addPoiBadgeTrigger, getPitchYawFromScreenPoint, isAnchored, viewerState]);

    // MANEJO GLOBAL DE ARRASTRE (Para evitar que el texto bloquee sus propios eventos)
    useEffect(() => {
        if (!dragTarget && !pendingFrameDrag) return;

        const handleGlobalMove = (e: MouseEvent) => {
            // Simulamos un React.MouseEvent para reutilizar la lógica
            handleCanvasMouseMove(e as unknown as React.MouseEvent);
        };

        const handleGlobalUp = () => {
            handleCanvasMouseUp();
        };

        window.addEventListener("mousemove", handleGlobalMove);
        window.addEventListener("mouseup", handleGlobalUp);

        // Feedback visual global
        document.body.style.cursor = dragTarget ? "grabbing" : "";
        document.body.style.userSelect = "none";

        return () => {
            window.removeEventListener("mousemove", handleGlobalMove);
            window.removeEventListener("mouseup", handleGlobalUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [dragTarget, pendingFrameDrag]);

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (isFixed) return;
        const point = getPoint(e);

        if (activeTool === "line" || activeTool === "arrow") {
            if (!drawing) {
                const snapped = getSnappedPoint(point, displayLines, null, displayFrames);
                setStartPoint(snapped);
                setPreview(snapped);
                setDrawing(true);
            } else {
                const snappedEnd = getSnappedPoint(point, displayLines, null, displayFrames);
                const arrowPresetStyle = getArrowStyle({ arrowVariant: activeArrowPreset });
                const baseLine: Line = {
                    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                    type: activeTool === "arrow" ? "arrow" : "line",
                    ...(activeTool === "arrow" ? {
                        arrowVariant: arrowPresetStyle.variant,
                        strokeWidth: arrowPresetStyle.strokeWidth,
                        headSize: arrowPresetStyle.headSize,
                        bend: arrowPresetStyle.bend,
                        curveDirection: arrowPresetStyle.curveDirection,
                    } : {}),
                    x1: startPoint!.x,
                    y1: startPoint!.y,
                    x2: snappedEnd.x,
                    y2: snappedEnd.y,
                };

                if (isAnchored) {
                    const startCoords = getPitchYawFromScreenPoint(startPoint!);
                    const endCoords = getPitchYawFromScreenPoint(snappedEnd);

                    if (startCoords && endCoords) {
                        const newLine = {
                            ...baseLine,
                            pitch1: startCoords[0],
                            yaw1: startCoords[1],
                            pitch2: endCoords[0],
                            yaw2: endCoords[1],
                        };
                        setAnchoredLines((prev) => [...prev, newLine]);
                        setSelectedLineIds(new Set([newLine.id]));
                    } else {
                        setLines((prev) => [...prev, baseLine]);
                        setSelectedLineIds(new Set([baseLine.id]));
                    }
                } else {
                    setLines((prev) => [...prev, baseLine]);
                    setSelectedLineIds(new Set([baseLine.id]));
                }

                setDrawing(false);
                setStartPoint(null);
                setPreview(null);
            }
        }

        if (activeTool === "text") {
            if (!draftTextItem) {
                const baseText: TextItem = {
                    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                    text: "Agregar un título", // Estilo Canva
                    x: point.x,
                    y: point.y,
                };
                if (isAnchored) {
                    const coords = getPitchYawFromScreenPoint(point);
                    if (coords) {
                        baseText.pitch = coords[0];
                        baseText.yaw = coords[1];
                    }
                }
                setDraftTextItem(baseText);
            }
        }

        if (activeTool === "location") {
            const newId = `location-${Date.now()}`;
            const baseBadge: PoiBadge = {
                id: newId,
                type: "poi-badge",
                kind: "location",
                variant: "circle",
                x: point.x,
                y: point.y,
                width: 46,
                height: 46,
                title: "Ubicaci\u00f3n",
            };

            if (isAnchored) {
                const coords = getPitchYawFromScreenPoint(point);
                if (coords) {
                    setAnchoredPoiBadges((prev) => [...prev, { ...baseBadge, pitch: coords[0], yaw: coords[1], anchorHfov: viewerState?.hfov }]);
                } else {
                    setPoiBadges((prev) => [...prev, baseBadge]);
                }
            } else {
                setPoiBadges((prev) => [...prev, baseBadge]);
            }

            setSelectedLineIds(new Set([newId]));
            setEditingTextValue("Ubicación");
            setEditingTextId(newId);
        }

        if (activeTool === "polygon") {
            if (e.detail === 1) {
                // Si clickeamos cerca del primer punto, cerramos el polígono
                if (draftPolygonPoints.length >= 3) {
                    const firstPoint = draftPolygonPoints[0];
                    const dist = Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y);
                    if (dist < 15) {
                        finalizePolygon(draftPolygonPoints);
                        return;
                    }
                }
                // De lo contrario, agregamos un punto
                setDraftPolygonPoints(prev => [...prev, point]);
            } else if (e.detail > 1 && draftPolygonPoints.length >= 3) {
                // Al hacer doble clic, cerramos el polígono. 
                // El primer clic ya agregó un punto, así que lo quitamos para que el polígono no tenga un vértice duplicado al final.
                finalizePolygon(draftPolygonPoints.slice(0, -1));
            }
            return;
        }

        if (activeTool === "drawing") {
            const coords = getPitchYawFromScreenPoint(point);
            if (!coords) return;

            const strokeId = `stroke-${Date.now()}`;
            setDraftFreehandStroke({
                id: strokeId,
                points: [{ pitch: coords[0], yaw: coords[1] }],
                strokeWidth: 4,
                color: "#ffffff",
            });
            setDraftFreehandDisplayPoints([point]);
            setSelectedLineIds(new Set([strokeId]));
        }

        if (activeTool === "select") {
            // Clic en vacío: deseleccionar todo
            setSelectedLineIds(new Set());
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (draggingDstNode !== null || draggingSrcNode !== null) return;

        const point = getPoint(e);

        if (pendingFrameDrag && !dragTarget) {
            const movedDistance = Math.hypot(point.x - pendingFrameDrag.startX, point.y - pendingFrameDrag.startY);
            if (movedDistance < FRAME_DRAG_THRESHOLD) return;

            frameDidDragRef.current = true;
            const nextDragTarget: DragTarget = { type: "frame", frameId: pendingFrameDrag.frameId };
            dragTargetRef.current = nextDragTarget;
            setDragTarget(nextDragTarget);
            setPendingFrameDrag(null);

            const updateFrame = (f: SceneFrame) => {
                if (f.id !== pendingFrameDrag.frameId) return f;
                let nextPitch = f.pitch;
                let nextYaw = f.yaw;
                if (isAnchored) {
                    const coords = getPitchYawFromScreenPoint(point);
                    if (coords) {
                        nextPitch = coords[0];
                        nextYaw = coords[1];
                    }
                }
                return { ...f, x: point.x, y: point.y, pitch: nextPitch, yaw: nextYaw };
            };

            setFrames(prev => prev.map(updateFrame));
            setAnchoredFrames(prev => prev.map(updateFrame));
            return;
        }

        if (dragTarget?.type === "resize" && dragTarget.textId) {
            let diff = 0;
            if (dragTarget.corner === "se") diff = (point.x - dragTarget.startX) + (point.y - dragTarget.startY);
            else if (dragTarget.corner === "nw") diff = (dragTarget.startX - point.x) + (dragTarget.startY - point.y);
            else if (dragTarget.corner === "ne") diff = (point.x - dragTarget.startX) + (dragTarget.startY - point.y);
            else if (dragTarget.corner === "sw") diff = (dragTarget.startX - point.x) + (point.y - dragTarget.startY);

            const newSize = Math.max(10, dragTarget.startSize + diff * 0.5);
            
            const updateText = (t: TextItem) =>
                t.id === dragTarget.textId
                    ? {
                        ...t,
                        fontSize: newSize,
                        anchorHfov: anchoredTextIds.has(t.id) ? viewerState?.hfov ?? t.anchorHfov : t.anchorHfov,
                    }
                    : t;
            setTexts(prev => prev.map(updateText));
            setAnchoredTexts(prev => prev.map(updateText));
            return;
        }

        if (dragTarget?.type === "text" && dragTarget.textId) {
            const updateText = (t: TextItem) => {
                if (t.id !== dragTarget.textId) return t;

                let nextPitch = t.pitch;
                let nextYaw = t.yaw;

                if (isAnchored) {
                    const coords = getPitchYawFromScreenPoint(point);
                    if (coords) {
                        nextPitch = coords[0];
                        nextYaw = coords[1];
                    }
                }

                // Actualizamos x, y siempre para respuesta inmediata
                return { ...t, x: point.x, y: point.y, pitch: nextPitch, yaw: nextYaw };
            };

            setTexts(prev => prev.map(updateText));
            setAnchoredTexts(prev => prev.map(updateText));
            return;
        }

        if (dragTarget?.type === "poi-badge" && dragTarget.poiBadgeId) {
            const updatePoiBadge = (badge: PoiBadge) => {
                if (badge.id !== dragTarget.poiBadgeId) return badge;

                let nextPitch = badge.pitch;
                let nextYaw = badge.yaw;

                if (isAnchored) {
                    const coords = getPitchYawFromScreenPoint(point);
                    if (coords) {
                        nextPitch = coords[0];
                        nextYaw = coords[1];
                    }
                }

                return { ...badge, x: point.x, y: point.y, pitch: nextPitch, yaw: nextYaw };
            };

            setPoiBadges(prev => prev.map(updatePoiBadge));
            setAnchoredPoiBadges(prev => prev.map(updatePoiBadge));
            return;
        }

        if (dragTarget?.type === "poly-vertex" && dragTarget.polyId) {
            const updatePoly = (poly: ScenePolygon) => {
                if (poly.id !== dragTarget.polyId) return poly;

                let nextPitchPoints = poly.pitchPoints ? [...poly.pitchPoints] : undefined;
                let nextPoints = [...poly.points];
                
                nextPoints[dragTarget.vertexIndex] = point;

                if (isAnchored && nextPitchPoints) {
                    const coords = getPitchYawFromScreenPoint(point);
                    if (coords) {
                        nextPitchPoints[dragTarget.vertexIndex] = { pitch: coords[0], yaw: coords[1] };
                    }
                }

                return { ...poly, points: nextPoints, pitchPoints: nextPitchPoints };
            };

            setPolygons(prev => prev.map(updatePoly));
            setAnchoredPolygons(prev => prev.map(updatePoly));
            return;
        }

        if (dragTarget?.type === "frame" && dragTarget.frameId) {
            const updateFrame = (f: SceneFrame) => {
                if (f.id !== dragTarget.frameId) return f;
                let nextPitch = f.pitch;
                let nextYaw = f.yaw;
                if (isAnchored) {
                    const coords = getPitchYawFromScreenPoint(point);
                    if (coords) {
                        nextPitch = coords[0];
                        nextYaw = coords[1];
                    }
                }
                return { ...f, x: point.x, y: point.y, pitch: nextPitch, yaw: nextYaw };
            };
            setFrames(prev => prev.map(updateFrame));
            setAnchoredFrames(prev => prev.map(updateFrame));
            return;
        }

        if (dragTarget?.type === "frame-resize" && dragTarget.frameId) {
            const dx = point.x - dragTarget.startX;
            const dy = point.y - dragTarget.startY;
            
            // Calculamos el factor de escala basado en el movimiento del mouse
            const updateFrame = (f: SceneFrame) => {
                if (f.id !== dragTarget.frameId) return f;
                
                // Redimensionado simple pero efectivo: dx+dy
                const sizeChange = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * 2;
                const newWidth = Math.max(50, dragTarget.startWidth + sizeChange);
                const newHeight = Math.max(50, dragTarget.startHeight + sizeChange);

                return {
                    ...f,
                    width: newWidth,
                    height: newHeight,
                    anchorHfov: anchoredFrameIds.has(f.id) ? viewerState?.hfov ?? f.anchorHfov : f.anchorHfov,
                };
            };
            setFrames(prev => prev.map(updateFrame));
            setAnchoredFrames(prev => prev.map(updateFrame));
            return;
        }

        if ((activeTool === "line" || activeTool === "arrow") && drawing && startPoint) {
            const sr = getSnapResult(point, displayLines, null, displayFrames);
            setPreview(sr.point);
            setSnapResult(sr);
        }

        if (activeTool === "polygon" && draftPolygonPoints.length > 0) {
            setPreview(point);
        }

        if (activeTool === "drawing" && draftFreehandStroke) {
            const lastPoint = draftFreehandDisplayPoints[draftFreehandDisplayPoints.length - 1];
            if (lastPoint && Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 4) return;

            const coords = getPitchYawFromScreenPoint(point);
            if (!coords) return;

            setDraftFreehandStroke((prev) => (
                prev
                    ? {
                        ...prev,
                        points: [...prev.points, { pitch: coords[0], yaw: coords[1] }],
                    }
                    : prev
            ));
            setDraftFreehandDisplayPoints((prev) => [...prev, point]);
        }

        if (activeTool === "select" && dragTarget?.type === "endpoint") {
            const snapped = getSnapResult(point, displayLines, {
                lineId: dragTarget.lineId,
                endpoint: dragTarget.endpoint,
            }, displayFrames).point;

            const updateLine = (line: Line) => {
                if (line.id !== dragTarget.lineId) return line;

                if (isAnchored) {
                    const coords = getPitchYawFromScreenPoint(snapped);
                    if (!coords) return line;

                    return dragTarget.endpoint === "start"
                        ? { ...line, x1: snapped.x, y1: snapped.y, pitch1: coords[0], yaw1: coords[1] }
                        : { ...line, x2: snapped.x, y2: snapped.y, pitch2: coords[0], yaw2: coords[1] };
                }

                return dragTarget.endpoint === "start"
                    ? { ...line, x1: snapped.x, y1: snapped.y }
                    : { ...line, x2: snapped.x, y2: snapped.y };
            };

            if (isAnchored) {
                setAnchoredLines((prev) => prev.map(updateLine));
            } else {
                setLines((prev) => prev.map(updateLine));
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData("application/json");
        if (!data) return;
        
        try {
            const asset = JSON.parse(data);
            const point = getPoint(e as any);
            
            // 1. Detectar colisión con marcos (Portales)
            // Usamos displayFrames que ya están proyectados en pantalla
            const hitFrame = displayFrames.find(f => {
                const dx = Math.abs(point.x - f.x);
                const dy = Math.abs(point.y - f.y);
                if (f.type === "circle") {
                    return Math.hypot(point.x - f.x, point.y - f.y) <= f.width / 2;
                }
                return dx <= f.width / 2 && dy <= f.height / 2;
            });

            if (hitFrame) {
                const updateFrame = (f: SceneFrame) => 
                    f.id === hitFrame.id ? { ...f, targetSceneId: asset.id, targetSceneKey: asset.sceneKey, previewUrl: asset.url } : f;
                
                if (isAnchored) {
                    const coords = getPitchYawFromScreenPoint(hitFrame);
                    const newAnchoredFrame = { 
                        ...hitFrame, 
                        pitch: coords?.[0] ?? hitFrame.pitch, 
                        yaw: coords?.[1] ?? hitFrame.yaw, 
                        targetSceneId: asset.id,
                        targetSceneKey: asset.sceneKey,
                        previewUrl: asset.url 
                    };

                    setAnchoredFrames(prev => {
                        const exists = prev.some(f => f.id === hitFrame.id);
                        if (exists) return prev.map(f => f.id === hitFrame.id ? newAnchoredFrame : f);
                        return [...prev, newAnchoredFrame];
                    });
                    
                    setFrames(prev => prev.filter(f => f.id !== hitFrame.id));
                    setFixedLineIds(prev => new Set(Array.from(prev).concat(hitFrame.id)));
                } else {
                    setFrames(prev => prev.map(updateFrame));
                    setFixedLineIds(prev => new Set(Array.from(prev).concat(hitFrame.id)));
                }
                return;
            }

            // 2. Si no hay colisión, crear imagen suelta
            const newImg: SceneImage = {
                id: `img-${Date.now()}`,
                url: asset.url,
                x: point.x,
                y: point.y,
                width: 200,
                height: 120,
                isAnchored: false
            };
            
            if (isAnchored) {
                const coords = getPitchYawFromScreenPoint(point);
                if (coords) {
                    setAnchoredImages(prev => [...prev, { ...newImg, pitch: coords[0], yaw: coords[1], isAnchored: true }]);
                }
            } else {
                setImages(prev => [...prev, newImg]);
            }
        } catch (err) {
            console.error("Error al procesar drop:", err);
        }
    };

    const handleCanvasMouseUp = () => {
        if (draftFreehandStroke) {
            if (draftFreehandStroke.points.length > 1) {
                setFreehandStrokes((prev) => [...prev, draftFreehandStroke]);
            }
            setDraftFreehandStroke(null);
            setDraftFreehandDisplayPoints([]);
        }
        setPendingFrameDrag(null);
        if (frameDidDragRef.current) {
            window.setTimeout(() => {
                frameDidDragRef.current = false;
            }, 0);
        }
        dragTargetRef.current = null;
        setDragTarget(null);
        setSnapResult(null);
    };

    useEffect(() => {
        const keyMap = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setDrawing(false);
                setStartPoint(null);
                setPreview(null);
                setDraftFreehandStroke(null);
                setDraftFreehandDisplayPoints([]);
                setDraftPolygonPoints([]);
            }

            if (e.key === "Enter" && draftPolygonPoints.length >= 3) {
                finalizePolygon(draftPolygonPoints);
            }

            if ((e.key === "Delete" || e.key === "Backspace") && editingTextId !== null) {
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedLineIds.size > 0) {
                // Solo borrar las seleccionadas que NO estén fijadas
                const deletableIds = new Set(Array.from(selectedLineIds).filter((id) => !fixedLineIds.has(id)));
                if (deletableIds.size > 0) {
                    setLines((prev) => prev.filter((l) => !deletableIds.has(l.id)));
                    setAnchoredLines((prev) => prev.filter((l) => !deletableIds.has(l.id)));
                    setTexts((prev) => prev.filter((t) => !deletableIds.has(t.id)));
                    setAnchoredTexts((prev) => prev.filter((t) => !deletableIds.has(t.id)));
                    setPoiBadges((prev) => prev.filter((p) => !deletableIds.has(p.id)));
                    setAnchoredPoiBadges((prev) => prev.filter((p) => !deletableIds.has(p.id)));
                    setFreehandStrokes((prev) => prev.filter((stroke) => !deletableIds.has(stroke.id)));
                    setFrames((prev) => prev.filter((f) => !deletableIds.has(f.id)));
                    setAnchoredFrames((prev) => prev.filter((f) => !deletableIds.has(f.id)));
                    setImages((prev) => prev.filter((i) => !deletableIds.has(i.id)));
                    setAnchoredImages((prev) => prev.filter((i) => !deletableIds.has(i.id)));
                    setPolygons((prev) => prev.filter((p) => !deletableIds.has(p.id)));
                    setAnchoredPolygons((prev) => prev.filter((p) => !deletableIds.has(p.id)));
                    // Mantener seleccionadas las fijadas (no borrables)
                    setSelectedLineIds(new Set(Array.from(selectedLineIds).filter((id) => fixedLineIds.has(id))));
                }
            }
        };

        window.addEventListener("keydown", keyMap);
        return () => window.removeEventListener("keydown", keyMap);
    }, [selectedLineIds, fixedLineIds, isAnchored, editingTextId, draftFreehandStroke, draftPolygonPoints, finalizePolygon]);

    return (
        <div 
            ref={containerRef}
            className="absolute inset-0 z-20" 
            style={{ pointerEvents: "none" }}
            onDragOver={(e) => {
                e.preventDefault(); // Necesario para permitir el drop
                e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleDrop}
        >
            {planImageUrl && (
                <div
                    style={{
                        position: "absolute",
                        top: 12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 50,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        background: "rgba(0,0,0,0.85)",
                        borderRadius: 12,
                        padding: "6px 16px",
                        pointerEvents: "auto",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    }}
                >
                    <button
                        onClick={() => setMapMode("TERRAIN")}
                        style={{
                            background: mapMode === "TERRAIN" ? "#4f46e5" : "transparent",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            padding: "6px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        <MapIcon size={14} /> 1. Terreno 3D
                    </button>

                    <button
                        onClick={() => setMapMode("IMAGE")}
                        style={{
                            background: mapMode === "IMAGE" ? "#ec4899" : "transparent",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            padding: "6px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        <ImageIcon size={14} /> 2. Imagen 2D
                    </button>

                    <div
                        style={{
                            width: 1,
                            height: 20,
                            background: "rgba(255,255,255,0.2)",
                            margin: "0 4px",
                        }}
                    />

                    <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>Opacidad</span>
                    <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={planOpacity}
                        onChange={(e) => setPlanOpacity(parseFloat(e.target.value))}
                        style={{
                            width: 70,
                            accentColor: mapMode === "TERRAIN" ? "#4f46e5" : "#ec4899",
                        }}
                    />

                    <div
                        style={{
                            width: 1,
                            height: 20,
                            background: "rgba(255,255,255,0.2)",
                            margin: "0 4px",
                        }}
                    />

                    {!planFixed ? (
                        <button
                            onClick={() => setPlanFixed(true)}
                            style={{
                                background: "#22c55e",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                padding: "6px 12px",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                            }}
                        >
                            <Check size={14} className="inline mr-1" /> Fijar Mapeo
                        </button>
                    ) : (
                        <button
                            onClick={() => setPlanFixed(false)}
                            style={{
                                background: "rgba(255,255,255,0.12)",
                                color: "white",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: 8,
                                padding: "6px 12px",
                                fontSize: 11,
                                cursor: "pointer",
                            }}
                        >
                            Ajustar Nodos
                        </button>
                    )}
                </div>
            )}

            {planImageUrl && mapMode === "IMAGE" && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 40,
                        background: "rgba(15,15,20,0.95)",
                        backdropFilter: "blur(10px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "auto",
                    }}
                >
                    <div style={{ position: "relative" }}>
                        <img
                            src={planImageUrl}
                            style={{
                                maxWidth: "80vw",
                                maxHeight: "80vh",
                                border: "2px solid rgba(255,255,255,0.1)",
                                borderRadius: 8,
                                opacity: planOpacity,
                            }}
                            draggable={false}
                        />

                        {!planFixed &&
                            srcNodes.map((pt, idx) => {
                                const imgEl = document.querySelector('img[draggable="false"]');
                                const rect = imgEl?.getBoundingClientRect();
                                const scaleX = rect?.width ? rect.width / imgSize.w : 1;
                                const scaleY = rect?.height ? rect.height / imgSize.h : 1;

                                return (
                                    <div
                                        key={`src-${idx}`}
                                        style={{
                                            position: "absolute",
                                            left: pt.x * scaleX - 12,
                                            top: pt.y * scaleY - 12,
                                            width: 24,
                                            height: 24,
                                            background: "#ec4899",
                                            border: "2px solid white",
                                            borderRadius: "50%",
                                            cursor: "grab",
                                            zIndex: 45,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                                        }}
                                        onMouseDown={(e) => {
                                            if (isFixed) return;
                                            e.stopPropagation();
                                            setDraggingSrcNode(idx);
                                        }}
                                    >
                                        <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>
                                            {idx + 1}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>

                    {draggingSrcNode !== null && (
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 200,
                                cursor: "grabbing",
                                pointerEvents: "auto",
                            }}
                            onMouseMove={(e) => {
                                const imgEl = document.querySelector('img[draggable="false"]');
                                if (!imgEl) return;

                                const rect = imgEl.getBoundingClientRect();
                                const scaleX = imgSize.w / rect.width;
                                const scaleY = imgSize.h / rect.height;
                                const newX = (e.clientX - rect.left) * scaleX;
                                const newY = (e.clientY - rect.top) * scaleY;

                                setSrcNodes((prev) => {
                                    const next = [...prev];
                                    next[draggingSrcNode] = { x: newX, y: newY };
                                    return next;
                                });
                            }}
                            onMouseUp={() => setDraggingSrcNode(null)}
                        />
                    )}
                </div>
            )}

            {planImageUrl && mapMode === "TERRAIN" && (
                <>
                    <canvas
                        ref={canvasRef}
                        width={typeof window !== "undefined" ? window.innerWidth : 1920}
                        height={typeof window !== "undefined" ? window.innerHeight : 1080}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: 18,
                        }}
                    />

                    {editorTab === "OVERLAY" && !isFixed && !planFixed &&
                        displayDstNodes.map((pt, idx) => (
                            <div
                                key={`dst-${idx}`}
                                style={{
                                    position: "absolute",
                                    left: pt.x - 12,
                                    top: pt.y - 12,
                                    width: 24,
                                    height: 24,
                                    background: "#facc15",
                                    border: "2px solid black",
                                    borderRadius: "50%",
                                    cursor: "grab",
                                    zIndex: 25,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                                    pointerEvents: "auto",
                                }}
                                onMouseDown={(e) => {
                                    if (isFixed) return;
                                    e.stopPropagation();
                                    setDraggingDstNode(idx);
                                }}
                            >
                                <span style={{ color: "black", fontSize: 10, fontWeight: 700 }}>
                                    {idx + 1}
                                </span>
                            </div>
                        ))}

                    {draggingDstNode !== null && (
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 200,
                                cursor: "grabbing",
                                pointerEvents: "auto",
                            }}
                            onMouseMove={(e) => {
                                if (!svgRef.current) return;

                                const rect = svgRef.current.getBoundingClientRect();
                                let pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

                                const snapPoints = displayLines.flatMap((l) => [
                                    { x: l.x1, y: l.y1 },
                                    { x: l.x2, y: l.y2 },
                                ]);

                                for (const p of snapPoints) {
                                    if (Math.hypot(p.x - pt.x, p.y - pt.y) < CORNER_SNAP_R) {
                                        pt = { x: p.x, y: p.y };
                                        break;
                                    }
                                }

                                if (isAnchored) {
                                    const coords = getPitchYawFromScreenPoint(pt);
                                    if (!coords) return;

                                    setAnchoredDstNodes((prev) => {
                                        const next = [...prev];
                                        if (!next[draggingDstNode]) return prev;
                                        next[draggingDstNode] = { pitch: coords[0], yaw: coords[1] };
                                        return next;
                                    });
                                } else {
                                    setDstNodes((prev) => {
                                        const next = [...prev];
                                        next[draggingDstNode] = pt;
                                        return next;
                                    });
                                }
                            }}
                            onMouseUp={() => setDraggingDstNode(null)}
                        />
                    )}
                </>
            )}

            <svg
                ref={svgRef}
                className="absolute inset-0 z-20"
                style={{
                    width: "100%",
                    height: "100%",
                    // Para que se pueda navegar (pan) la cámara incluso con herramientas activas,
                    // el fondo del SVG es 'none'. Solo las líneas y puntos capturan clics.
                    // EXCEPCIÓN: 'line' y 'arrow' necesitan 'auto' para empezar el trazo en el vacío,
                    // y cuando hay un ARRASTRE activo (!!dragTarget) necesitamos capturar el movimiento en todo el canvas.
                    pointerEvents: isFixed ? "none" : ((activeTool === "line" || activeTool === "arrow" || activeTool === "location" || activeTool === "polygon" || activeTool === "drawing" || !!dragTarget) ? "auto" : "none"),
                }}
                onMouseDown={(e) => {
                    if (isFixed) return;
                    if (activeTool === "select") {
                        let hit = false;
                        const p = getPoint(e);

                        for (let i = displayFreehandStrokes.length - 1; i >= 0; i--) {
                            if (getStrokeHitDistance(p, displayFreehandStrokes[i].projectedPoints) <= LINE_HIT_TOLERANCE) {
                                const hitId = displayFreehandStrokes[i].id;
                                if (e.ctrlKey || e.metaKey) {
                                    setSelectedLineIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(hitId)) next.delete(hitId);
                                        else next.add(hitId);
                                        return next;
                                    });
                                } else {
                                    setSelectedLineIds(new Set([hitId]));
                                }
                                hit = true;
                                break;
                            }
                        }

                        for (let i = displayLines.length - 1; i >= 0; i--) {
                            if (getLineHitDistance(p, displayLines[i]) <= LINE_HIT_TOLERANCE) {
                                const hitId = displayLines[i].id;
                                if (e.ctrlKey || e.metaKey) {
                                    // Ctrl/Cmd + clic: toggle individual en la selección
                                    setSelectedLineIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(hitId)) next.delete(hitId);
                                        else next.add(hitId);
                                        return next;
                                    });
                                } else {
                                    // Clic simple: seleccionar solo esta línea
                                    setSelectedLineIds(new Set([hitId]));
                                }
                                hit = true;
                                break;
                            }
                        }

                        if (!hit) handleCanvasMouseDown(e);
                    } else {
                        handleCanvasMouseDown(e);
                    }
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
            >
                <defs>
                    {(["classic", "thin", "heavy-head", "wayfinding", "bold", "clean", "chevron", "brush", "curve-soft-left", "curve-soft-right", "curve-strong-left", "curve-strong-right"] as ArrowVariant[]).flatMap((variant) => {
                        const style = getArrowStyle({ arrowVariant: variant });
                        return [
                            { state: "selected", color: "#ec4899" },
                            { state: "fixed", color: "#60a5fa" },
                            { state: "anchored", color: "#22c55e" },
                            { state: "free", color: "#facc15" },
                        ].map(({ state, color }) => (
                            <marker
                                key={`arrowhead-${variant}-${state}`}
                                id={`arrowhead-${variant}-${state}`}
                                markerWidth={style.headSize}
                                markerHeight={style.headSize}
                                refX={Math.max(style.headSize - 1, 4)}
                                refY={style.headSize / 2}
                                orient="auto"
                            >
                                <polygon points={style.markerPoints} fill={color} />
                            </marker>
                        ));
                    })}
                </defs>

                {displayPolygons.map((poly) => {
                    if (poly.points.some(p => p.x === -9999)) return null;

                    const isSelected = selectedLineIds.has(poly.id);
                    const isPolyFixed = fixedLineIds.has(poly.id);
                    const isPolyAnchored = anchoredPolygons.some((p) => p.id === poly.id);

                    const pointsStr = poly.points.map(p => `${p.x},${p.y}`).join(" ");

                    const strokeColor = isSelected ? "#ec4899" : isPolyFixed ? "#60a5fa" : isPolyAnchored ? "#22c55e" : (poly.strokeColor || "white");
                    const strokeWidth = isSelected ? 3 : 2;
                    
                    return (
                        <g key={poly.id} style={{ pointerEvents: (activeTool === "select" || activeTool === "polygon") ? "auto" : "none" }}>
                            <polygon
                                points={pointsStr}
                                fill={poly.fillColor || "rgba(16, 185, 129, 0.4)"}
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                style={{ cursor: activeTool === "select" ? "pointer" : "default" }}
                                onMouseDown={(e) => {
                                    if (isPolyFixed) return;
                                    if (activeTool !== "select") return;
                                    e.stopPropagation();
                                    setSelectedLineIds(new Set([poly.id]));
                                }}
                            />
                            {isSelected && !isPolyFixed && poly.points.map((pt, idx) => (
                                <circle
                                    key={`vertex-${idx}`}
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={6}
                                    fill="white"
                                    stroke={strokeColor}
                                    strokeWidth={2}
                                    style={{ cursor: "move", pointerEvents: "auto" }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setDragTarget({ type: "poly-vertex", polyId: poly.id, vertexIndex: idx });
                                    }}
                                />
                            ))}
                        </g>
                    );
                })}

                {draftPolygonPoints.length > 0 && (
                    <g>
                        {draftPolygonPoints.length >= 2 && (
                            <polygon
                                points={[...draftPolygonPoints, preview].filter(Boolean).map(p => `${p!.x},${p!.y}`).join(" ")}
                                fill="rgba(16, 185, 129, 0.2)"
                                stroke="none"
                                pointerEvents="none"
                            />
                        )}
                        <polyline
                            points={draftPolygonPoints.map(p => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke="white"
                            strokeWidth={2}
                            strokeDasharray="5,5"
                            pointerEvents="none"
                        />
                        {/* Línea hacia el mouse si queremos previsualizar */}
                        {preview && (
                            <line
                                x1={draftPolygonPoints[draftPolygonPoints.length - 1].x}
                                y1={draftPolygonPoints[draftPolygonPoints.length - 1].y}
                                x2={preview.x}
                                y2={preview.y}
                                stroke="white"
                                strokeWidth={2}
                                strokeDasharray="5,5"
                                pointerEvents="none"
                            />
                        )}
                        {draftPolygonPoints.map((p, idx) => (
                            <circle
                                key={`draft-poly-${idx}`}
                                cx={p.x}
                                cy={p.y}
                                r={idx === 0 ? 8 : 4} // El primero es más grande para cerrar
                                fill={idx === 0 ? "rgba(16, 185, 129, 0.8)" : "white"}
                                stroke="white"
                                strokeWidth={1}
                                style={{ cursor: idx === 0 ? "pointer" : "default", pointerEvents: "auto" }}
                                onMouseDown={(e) => {
                                    if (idx === 0 && draftPolygonPoints.length >= 3) {
                                        e.stopPropagation();
                                        finalizePolygon(draftPolygonPoints);
                                    }
                                }}
                            />
                        ))}
                    </g>
                )}

                {displayFreehandStrokes.map((stroke) => {
                    const isSelected = selectedLineIds.has(stroke.id);
                    const isLocked = fixedLineIds.has(stroke.id);
                    const strokeColor = isSelected ? "#ec4899" : isLocked ? "#60a5fa" : (stroke.color ?? "#ffffff");
                    const strokeWidth = stroke.strokeWidth ?? 4;

                    return (
                        <polyline
                            key={stroke.id}
                            points={stroke.projectedPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ pointerEvents: activeTool === "select" ? "auto" : "none", cursor: activeTool === "select" ? "pointer" : "default" }}
                            onMouseDown={(e) => {
                                if (activeTool !== "select") return;
                                e.stopPropagation();
                                setSelectedLineIds(new Set([stroke.id]));
                            }}
                        />
                    );
                })}

                {draftFreehandDisplayPoints.length > 1 && (
                    <polyline
                        points={draftFreehandDisplayPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill="none"
                        stroke="#f8fafc"
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.85}
                        pointerEvents="none"
                    />
                )}

                {isAnchored && (
                    <text
                        x={20}
                        y={40}
                        fill="#22c55e"
                        fontSize="12"
                        fontWeight="700"
                        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                    >
                        🔒 ANCLADO — {anchoredLines.length} línea(s) en world-space
                    </text>
                )}

                {fixedLineIds.size > 0 && (
                    <text
                        x={20}
                        y={isAnchored ? 60 : 40}
                        fill="#60a5fa"
                        fontSize="12"
                        fontWeight="700"
                        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                    >
                        🔐 {fixedLineIds.size} línea(s) fijada(s) (no borrables)
                    </text>
                )}

                {displayLines.map((line) => {
                    const isSelected = displaySelectedIds.has(line.id);
                    const isLineFixed = fixedLineIds.has(line.id);
                    const isLineAnchored = anchoredLines.some((l) => l.id === line.id);
                    const arrowStyle = getArrowStyle(line);
                    const linePathD = getLinePathD(line);

                    const strokeColor = isSelected
                        ? "#ec4899"
                        : isLineFixed
                            ? "#60a5fa"
                            : isLineAnchored
                                ? "#22c55e"
                                : "#facc15";

                    const markerId = isSelected
                        ? `arrowhead-${arrowStyle.variant}-selected`
                        : isLineFixed
                            ? `arrowhead-${arrowStyle.variant}-fixed`
                            : isLineAnchored
                                ? `arrowhead-${arrowStyle.variant}-anchored`
                                : `arrowhead-${arrowStyle.variant}-free`;

                    return (
                        <g
                            key={line.id}
                            style={{ pointerEvents: activeTool === "select" ? "auto" : "none" }}
                        >
                            {linePathD ? (
                                <path
                                    d={linePathD}
                                    fill="none"
                                    stroke="transparent"
                                    strokeWidth={20}
                                    style={{ cursor: activeTool === "select" ? "pointer" : "default" }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        if (activeTool === "select") {
                                            if (e.ctrlKey || e.metaKey) {
                                                setSelectedLineIds((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(line.id)) next.delete(line.id);
                                                    else next.add(line.id);
                                                    return next;
                                                });
                                            } else {
                                                setSelectedLineIds(new Set([line.id]));
                                            }
                                        }
                                    }}
                                />
                            ) : (
                                <line
                                    x1={line.x1}
                                    y1={line.y1}
                                    x2={line.x2}
                                    y2={line.y2}
                                    stroke="transparent"
                                    strokeWidth={20}
                                    style={{ cursor: activeTool === "select" ? "pointer" : "default" }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        if (activeTool === "select") {
                                            if (e.ctrlKey || e.metaKey) {
                                                setSelectedLineIds((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(line.id)) next.delete(line.id);
                                                    else next.add(line.id);
                                                    return next;
                                                });
                                            } else {
                                                setSelectedLineIds(new Set([line.id]));
                                            }
                                        }
                                    }}
                                />
                            )}

                            {line.type === "arrow" && arrowStyle.outlined && (
                                linePathD ? (
                                    <path
                                        d={linePathD}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.95)"
                                        strokeWidth={(isSelected ? arrowStyle.strokeWidth + 4 : arrowStyle.strokeWidth + 3)}
                                        strokeLinecap={arrowStyle.strokeLinecap}
                                        strokeLinejoin="round"
                                        pointerEvents="none"
                                    />
                                ) : (
                                    <line
                                        x1={line.x1}
                                        y1={line.y1}
                                        x2={line.x2}
                                        y2={line.y2}
                                        stroke="rgba(255,255,255,0.95)"
                                        strokeWidth={(isSelected ? arrowStyle.strokeWidth + 4 : arrowStyle.strokeWidth + 3)}
                                        strokeLinecap={arrowStyle.strokeLinecap}
                                        pointerEvents="none"
                                    />
                                )
                            )}
                            {linePathD ? (
                                <path
                                    d={linePathD}
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeWidth={isSelected ? arrowStyle.strokeWidth + 2 : arrowStyle.strokeWidth}
                                    strokeLinecap={arrowStyle.strokeLinecap}
                                    strokeLinejoin="round"
                                    strokeDasharray={isLineFixed ? "8 4" : arrowStyle.strokeDasharray}
                                    markerEnd={`url(#${markerId})`}
                                    pointerEvents="none"
                                />
                            ) : (
                                <line
                                    x1={line.x1}
                                    y1={line.y1}
                                    x2={line.x2}
                                    y2={line.y2}
                                    stroke={strokeColor}
                                    strokeWidth={line.type === "arrow" ? (isSelected ? arrowStyle.strokeWidth + 2 : arrowStyle.strokeWidth) : (isSelected ? 5 : 3)}
                                    strokeLinecap={line.type === "arrow" ? arrowStyle.strokeLinecap : "round"}
                                    strokeDasharray={isLineFixed ? "8 4" : arrowStyle.strokeDasharray}
                                    markerEnd={line.type === "arrow" ? `url(#${markerId})` : undefined}
                                    pointerEvents="none"
                                />
                            )}

                            {(activeTool === "select" || activeTool === "line" || activeTool === "arrow") && !isLineFixed && !isLineAnchored && (
                                <>
                                    {/* Punto inicial: Solo se oculta si está fusionado con la base de un marco */}
                                    {!(line.type === "arrow" && displayFrames.some((f) => {
                                        const snapPoint = getFrameSnapPoint(f);
                                        return Math.hypot(snapPoint.x - line.x1, snapPoint.y - line.y1) < 2;
                                    })) && (
                                        <circle
                                            cx={line.x1}
                                            cy={line.y1}
                                            r={6}
                                            fill="#f97316"
                                            stroke="white"
                                            strokeWidth={2}
                                            style={{ cursor: activeTool === "select" ? "move" : "default" }}
                                            pointerEvents={activeTool === "select" ? "auto" : "none"}
                                            onMouseDown={(e) => {
                                                if (activeTool !== "select" || isLineFixed) return;
                                                e.stopPropagation();
                                                setDragTarget({ type: "endpoint", lineId: line.id, endpoint: "start" });
                                            }}
                                        />
                                    )}
                                    {/* Punto final: Solo se oculta si está fusionado con la base de un marco */}
                                    {!(line.type === "arrow" && displayFrames.some((f) => {
                                        const snapPoint = getFrameSnapPoint(f);
                                        return Math.hypot(snapPoint.x - line.x2, snapPoint.y - line.y2) < 2;
                                    })) && (
                                        <circle
                                            cx={line.x2}
                                            cy={line.y2}
                                            r={6}
                                            fill="#f97316"
                                            stroke="white"
                                            strokeWidth={2}
                                            style={{ cursor: activeTool === "select" ? "move" : "default" }}
                                            pointerEvents={activeTool === "select" ? "auto" : "none"}
                                            onMouseDown={(e) => {
                                                if (activeTool !== "select" || isLineFixed) return;
                                                e.stopPropagation();
                                                setDragTarget({ type: "endpoint", lineId: line.id, endpoint: "end" });
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </g>
                    );
                })}

                {(activeTool === "line" || activeTool === "arrow") && drawing && startPoint && preview && (
                    <g>
                        {(() => {
                            const previewArrowStyle = getArrowStyle({ arrowVariant: activeArrowPreset });
                            const previewLine: Line = {
                                id: "preview-arrow",
                                type: "arrow",
                                arrowVariant: previewArrowStyle.variant,
                                strokeWidth: previewArrowStyle.strokeWidth,
                                headSize: previewArrowStyle.headSize,
                                bend: previewArrowStyle.bend,
                                curveDirection: previewArrowStyle.curveDirection,
                                x1: startPoint.x,
                                y1: startPoint.y,
                                x2: preview.x,
                                y2: preview.y,
                            };
                            const previewPathD = activeTool === "arrow" ? getLinePathD(previewLine) : null;

                            return (
                                <>
                                    {activeTool === "arrow" && (
                                        <defs>
                                            <marker
                                                id="preview-arrowhead"
                                                markerWidth={previewArrowStyle.headSize}
                                                markerHeight={previewArrowStyle.headSize}
                                                refX={Math.max(previewArrowStyle.headSize - 1, 4)}
                                                refY={previewArrowStyle.headSize / 2}
                                                orient="auto"
                                            >
                                                <polygon points={previewArrowStyle.markerPoints} fill="#f97316" />
                                            </marker>
                                        </defs>
                                    )}

                                    {activeTool === "arrow" && previewArrowStyle.outlined && (
                                        previewPathD ? (
                                            <path
                                                d={previewPathD}
                                                fill="none"
                                                stroke="rgba(255,255,255,0.95)"
                                                strokeWidth={previewArrowStyle.strokeWidth + 3}
                                                strokeLinecap={previewArrowStyle.strokeLinecap}
                                                strokeLinejoin="round"
                                                pointerEvents="none"
                                            />
                                        ) : (
                                            <line
                                                x1={startPoint.x}
                                                y1={startPoint.y}
                                                x2={preview.x}
                                                y2={preview.y}
                                                stroke="rgba(255,255,255,0.95)"
                                                strokeWidth={previewArrowStyle.strokeWidth + 3}
                                                strokeLinecap={previewArrowStyle.strokeLinecap}
                                                pointerEvents="none"
                                            />
                                        )
                                    )}

                                    {previewPathD ? (
                                        <path
                                            d={previewPathD}
                                            fill="none"
                                            stroke="#f97316"
                                            strokeWidth={previewArrowStyle.strokeWidth}
                                            strokeLinecap={previewArrowStyle.strokeLinecap}
                                            strokeLinejoin="round"
                                            strokeDasharray="5,5"
                                            markerEnd="url(#preview-arrowhead)"
                                            pointerEvents="none"
                                        />
                                    ) : (
                                        <line
                                            x1={startPoint.x}
                                            y1={startPoint.y}
                                            x2={preview.x}
                                            y2={preview.y}
                                            stroke="#f97316"
                                            strokeWidth={activeTool === "arrow" ? previewArrowStyle.strokeWidth : 3}
                                            strokeLinecap={activeTool === "arrow" ? previewArrowStyle.strokeLinecap : "round"}
                                            strokeDasharray="5,5"
                                            markerEnd={activeTool === "arrow" ? "url(#preview-arrowhead)" : undefined}
                                            pointerEvents="none"
                                        />
                                    )}
                                </>
                            );
                        })()}
                        <circle
                            cx={preview.x}
                            cy={preview.y}
                            r={6}
                            fill="#22c55e"
                            stroke="white"
                            strokeWidth={2}
                            pointerEvents="none"
                        />
                    </g>
                )}

                {snapResult?.snapped && (
                    <circle
                        cx={snapResult.point.x}
                        cy={snapResult.point.y}
                        r={8}
                        fill="none"
                        stroke={snapResult.snapType === "midpoint" ? "#60a5fa" : "#22c55e"}
                        strokeWidth={2}
                        pointerEvents="none"
                    />
                )}
                {/* RENDER PASIVO DE TEXTOS (Solo visualización, no bloquea navegación) */}
                {false && displayTexts.map((txt) => {
                    if (txt.x === -9999) return null;
                    const isSelected = selectedLineIds.has(txt.id);
                    const isEditing = editingTextId === txt.id;
                    
                    // Si se está editando o seleccionando con Canva Logic, lo ocultamos del SVG 
                    // para mostrarlo en la capa HTML superior con mejor calidad y controles
                    if (isSelected || isEditing) return null;

                    const color = "#facc15"; // Amarillo base
                    
                    return (
                        <g key={txt.id} transform={`translate(${txt.x}, ${txt.y})`} pointerEvents="none">
                            <text
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={color}
                                fontSize="24"
                                fontWeight="bold"
                                style={{
                                    fontFamily: "Inter, system-ui, sans-serif",
                                    userSelect: "none",
                                    textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)",
                                }}
                            >
                                {txt.text}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* CAPA DE EDICIÓN INTERACTIVA (ESTILO CANVA) - z-25 para no tapar sidebar (z-30) */}
            <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
                {displayTexts.map((txt) => {
                    const isSelected = selectedLineIds.has(txt.id);
                    const isEditing = editingTextId === txt.id;
                    const canInteract = activeTool === "select" || isEditing;
                    if (txt.x === -9999) return null;
                    const textScale = anchoredTextIds.has(txt.id) ? getAnchoredObjectScale(txt.anchorHfov) : 1;

                    const canvaPurple = "#8b5cf6";

                    return (
                        <div 
                            key={`editor-${txt.id}`}
                            className="absolute"
                            style={{
                                left: txt.x,
                                top: txt.y,
                                transform: "translate(-50%, -50%)",
                                pointerEvents: canInteract ? "auto" : "none",
                                zIndex: isEditing ? 50 : 40,
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (activeTool === "select") {
                                  setSelectedLineIds(new Set([txt.id]));
                                  if (!isEditing) {
                                    setDragTarget({ type: "text", textId: txt.id });
                                  }
                                }
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingTextValue(txt.text);
                                setEditingTextId(txt.id);
                                setDragTarget(null); // Evitar arrastre mientras se edita
                            }}
                        >
                            {/* Barra de Colores Flotante (Estilo Canva) */}
                            {(isSelected && !isEditing) && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-2 rounded-full border border-white/20 shadow-2xl z-50">
                                    {["#ffffff", "#facc15", "#ef4444", "#22c55e", "#3b82f6", "#000000"].map(color => (
                                        <button
                                            key={color}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const update = (t: TextItem) => t.id === txt.id ? { ...t, color } : t;
                                                setTexts(prev => prev.map(update));
                                                setAnchoredTexts(prev => prev.map(update));
                                            }}
                                            className="w-5 h-5 rounded-full border border-white/20 hover:scale-125 transition-transform"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <div className="w-px h-4 bg-white/20 mx-1" />
                                    <span className="text-[10px] text-white/60 font-bold uppercase">{txt.fontSize ? Math.round(txt.fontSize) : 24}px</span>
                                </div>
                            )}

                            {/* Marco Púrpura de Selección */}
                            <div
                                className="relative group p-1 drop-shadow-2xl"
                                style={{
                                    transform: `scale(${textScale})`,
                                    transformOrigin: "center center",
                                }}
                            >
                                {(isSelected && !isEditing) && (
                                    <>
                                        <div 
                                            className="absolute inset-0 border-2 border-[#8b5cf6] rounded-md pointer-events-none"
                                            style={{ margin: -6 }}
                                        />
                                        {/* Tiradores de las esquinas estilo Canva */}
                                        {[
                                          { left: -10, top: -10, corner: "nw" as const, cursor: "nw-resize" }, 
                                          { right: -10, top: -10, corner: "ne" as const, cursor: "ne-resize" }, 
                                          { left: -10, bottom: -10, corner: "sw" as const, cursor: "sw-resize" }, 
                                          { right: -10, bottom: -10, corner: "se" as const, cursor: "se-resize" }
                                        ].map((handle, i) => (
                                          <div 
                                            key={i} 
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                const pt = getPoint(e);
                                                setDragTarget({ 
                                                    type: "resize", 
                                                    textId: txt.id, 
                                                    startSize: txt.fontSize || 24, 
                                                    startX: pt.x,
                                                    startY: pt.y,
                                                    corner: handle.corner
                                                });
                                            }}
                                            className="absolute w-4 h-4 bg-white border-2 border-[#8b5cf6] rounded-full shadow-md z-[60]" 
                                            style={{ ...handle, cursor: handle.cursor }} 
                                          />
                                        ))}
                                    </>
                                )}

                                {isEditing ? (
                                    <textarea
                                      autoFocus
                                      value={editingTextValue}
                                      onChange={(e) => {
                                        setEditingTextValue(e.target.value);
                                      }}
                                      onFocus={(e) => {
                                        const len = e.target.value.length;
                                        e.target.setSelectionRange(len, len);
                                      }}
                                      className="bg-black/50 text-white font-bold px-4 py-2 rounded-lg border-2 border-[#8b5cf6] outline-none min-w-[150px] text-center resize-none overflow-hidden"
                                      style={{ 
                                        fontSize: txt.fontSize || 24,
                                        fontFamily: "Inter, system-ui, sans-serif",
                                        color: txt.color || "#ffffff"
                                      }}
                                      onBlur={() => {
                                          const val = editingTextValue.trim();
                                          if (val) {
                                              const update = (t: TextItem) => t.id === txt.id ? { ...t, text: val } : t;
                                              setTexts(prev => prev.map(update));
                                              setAnchoredTexts(prev => prev.map(update));
                                          }
                                          setEditingTextValue("");
                                          setEditingTextId(null);
                                      }}
                                      onKeyDown={(e) => {
                                          if (e.key === "Backspace" || e.key === "Delete") {
                                              e.stopPropagation();
                                          }
                                          if (e.key === "Enter" && !e.shiftKey) {
                                              e.preventDefault();
                                              e.currentTarget.blur();
                                          }
                                      }}
                                    />
                                ) : (
                                    <div 
                                      className={`px-4 py-2 font-bold select-none whitespace-nowrap transition-transform ${activeTool === "select" ? "cursor-move active:scale-[0.98]" : "cursor-default"}`}
                                      style={{ 
                                        fontSize: txt.fontSize || 24,
                                        color: txt.color || "#facc15",
                                        fontFamily: "Inter, system-ui, sans-serif",
                                        textShadow: "0 2px 10px rgba(0,0,0,0.5)"
                                      }}
                                    >
                                        {txt.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* --- CAPA DE MARCADORES POI --- */}
                {displayPoiBadges.map((badge) => {
                    const isSelected = selectedLineIds.has(badge.id);
                    const isLocked = fixedLineIds.has(badge.id);
                    const isEditing = editingTextId === badge.id;
                    if (badge.x === -9999) return null;
                    const poiScale = anchoredPoiBadgeIds.has(badge.id) ? getAnchoredObjectScale(badge.anchorHfov) : 1;

                    if (badge.kind === "location") {
                        const badgeColor = badge.color || "#f97316";
                        return (
                            <div
                                key={badge.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: badge.x,
                                    top: badge.y,
                                    transform: `translate(-50%, -100%) scale(${poiScale})`,
                                    transformOrigin: "center bottom",
                                    zIndex: isEditing ? 50 : (isSelected ? 42 : 34),
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    if (activeTool === "select") {
                                        setSelectedLineIds(new Set([badge.id]));
                                        if (!isLocked && !isEditing) {
                                            setDragTarget({ type: "poi-badge", poiBadgeId: badge.id });
                                        }
                                    }
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeTool === "select") {
                                        setSelectedLineIds(new Set([badge.id]));
                                    }
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTextValue(badge.title || "Ubicación");
                                    setEditingTextId(badge.id);
                                    setDragTarget(null);
                                }}
                            >
                                {/* Barra de Colores (Estilo Canva) - Solo visible en edición */}
                                {isEditing && (
                                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-2 rounded-full border border-white/20 shadow-2xl z-50">
                                        {["#f97316", "#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#eab308"].map(color => (
                                            <button
                                                key={color}
                                                onMouseDown={(e) => {
                                                    // Prevent focus loss from input
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const update = (b: PoiBadge) => b.id === badge.id ? { ...b, color } : b;
                                                    setPoiBadges(prev => prev.map(update));
                                                    setAnchoredPoiBadges(prev => prev.map(update));
                                                }}
                                                className="w-5 h-5 rounded-full border border-white/20 hover:scale-125 transition-transform"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}

                                <div
                                    className="relative flex flex-col items-center justify-end"
                                    style={{ height: 90, minWidth: 100 }}
                                >
                                    {/* Etiqueta editable (Pill) */}
                                    <div className="absolute top-0 flex justify-center z-10 w-max max-w-[300px]" style={{ pointerEvents: "auto" }}>
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                value={editingTextValue}
                                                onChange={(e) => setEditingTextValue(e.target.value)}
                                                onFocus={(e) => {
                                                    const len = e.target.value.length;
                                                    e.target.setSelectionRange(len, len);
                                                }}
                                                className="text-white text-[11px] font-bold px-4 py-1.5 rounded-full outline-none text-center pointer-events-auto border-2 border-white min-w-[120px]"
                                                style={{ backgroundColor: badgeColor, boxShadow: `0 4px 12px ${badgeColor}66` }}
                                                onBlur={() => {
                                                    const val = editingTextValue.trim();
                                                    const update = (b: PoiBadge) => b.id === badge.id ? { ...b, title: val || "Ubicación" } : b;
                                                    setPoiBadges(prev => prev.map(update));
                                                    setAnchoredPoiBadges(prev => prev.map(update));
                                                    setEditingTextId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.currentTarget.blur();
                                                    }
                                                    e.stopPropagation();
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div
                                                className={`text-white text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap overflow-hidden text-ellipsis transition-transform border-2 ${isSelected ? "border-white scale-105" : "border-white/20 hover:scale-105 hover:border-white/50"}`}
                                                style={{ cursor: "pointer", pointerEvents: "auto", backgroundColor: badgeColor, boxShadow: `0 4px 12px ${badgeColor}66` }}
                                            >
                                                {badge.title || "Ubicación"}
                                            </div>
                                        )}
                                    </div>

                                    {/* Línea guía punteada vertical */}
                                    <div
                                        className="w-px border-l-2 border-dashed pointer-events-none"
                                        style={{ height: "50px", marginTop: "12px", marginBottom: "0px", borderColor: badgeColor }}
                                    />

                                    {/* Punto/ancla convertido en flecha sutil */}
                                    <svg width="12" height="6" viewBox="0 0 12 6" fill="none" className="pointer-events-none drop-shadow-md">
                                        <path d="M0 0L6 6L12 0H0Z" fill={badgeColor} />
                                    </svg>
                                </div>
                            </div>
                        );
                    }

                    const tailHeight = Math.max(26, Math.round(badge.height * 0.45));
                    const baseWidth = badge.variant === "circle" ? 20 : 26;
                    const wrapperWidth = Math.max(badge.width + 28, 120);
                    const wrapperHeight = badge.height + tailHeight + 18;

                    return (
                        <div
                            key={badge.id}
                            className="absolute pointer-events-auto"
                            style={{
                                left: badge.x,
                                top: badge.y,
                                transform: `translate(-50%, -100%) scale(${poiScale})`,
                                transformOrigin: "center bottom",
                                zIndex: isSelected ? 42 : 34,
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (activeTool === "select") {
                                    setSelectedLineIds(new Set([badge.id]));
                                    if (!isLocked) {
                                        setDragTarget({ type: "poi-badge", poiBadgeId: badge.id });
                                    }
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activeTool === "select") {
                                    setSelectedLineIds(new Set([badge.id]));
                                }
                            }}
                        >
                            <div
                                className="relative"
                                style={{
                                    width: wrapperWidth,
                                    height: wrapperHeight,
                                }}
                            >
                                <div
                                    className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full border border-white/25 bg-black/40 backdrop-blur-sm"
                                    style={{
                                        width: baseWidth,
                                        height: 10,
                                        boxShadow: isSelected ? "0 0 18px rgba(139, 92, 246, 0.35)" : "none",
                                    }}
                                />

                                <div
                                    className="absolute left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-white/70 to-white/20"
                                    style={{
                                        bottom: 8,
                                        width: 4,
                                        height: tailHeight,
                                    }}
                                />

                                <div
                                    className="absolute left-1/2 -translate-x-1/2"
                                    style={{
                                        bottom: 8 + tailHeight - 2,
                                        width: 0,
                                        height: 0,
                                        borderLeft: "6px solid transparent",
                                        borderRight: "6px solid transparent",
                                        borderBottom: "10px solid rgba(255,255,255,0.85)",
                                        filter: isSelected ? "drop-shadow(0 0 10px rgba(139, 92, 246, 0.4))" : "none",
                                    }}
                                />

                                <div
                                    className={`absolute left-1/2 -translate-x-1/2 overflow-hidden border-2 bg-black/55 backdrop-blur-md shadow-2xl ${
                                        badge.variant === "circle" ? "rounded-full" : "rounded-2xl"
                                    } ${isSelected ? "border-[#8b5cf6]" : "border-white/25"}`}
                                    style={{
                                        bottom: 8 + tailHeight,
                                        width: badge.width,
                                        height: badge.height,
                                        boxShadow: isSelected ? "0 0 28px rgba(139, 92, 246, 0.35)" : "0 8px 24px rgba(0,0,0,0.35)",
                                    }}
                                >
                                    {badge.imageUrl ? (
                                        <img src={badge.imageUrl} alt={badge.title || "POI"} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/70">
                                            <MapIcon size={24} />
                                        </div>
                                    )}

                                    {badge.title && (
                                        <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-[10px] font-bold text-white truncate text-center">
                                            {badge.title}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* --- CAPA DE MARCOS 360 (Portales) --- */}
                {displayFrames.map((frame) => {
                    const isSelected = selectedLineIds.has(frame.id);
                    const isLocked = fixedLineIds.has(frame.id);
                    const frameScale = frame.renderScale ?? (anchoredFrameIds.has(frame.id) ? getAnchoredObjectScale(frame.anchorHfov) : 1);

                    return (
                        <div
                            key={frame.id}
                            className="absolute"
                            style={{
                                left: frame.x,
                                top: frame.y,
                                transform: `translate(-50%, -50%) scale(${frameScale})`,
                                transformOrigin: "center center",
                                pointerEvents: "auto",
                                zIndex: isSelected ? 40 : 35,
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (isEditing) {
                                    setSelectedLineIds(new Set([frame.id]));
                                    // Solo permitir arrastrar si NO está bloqueado
                                    if (!isLocked) {
                                        const pt = getPoint(e);
                                        frameDidDragRef.current = false;
                                        setPendingFrameDrag({
                                            frameId: frame.id,
                                            startX: pt.x,
                                            startY: pt.y,
                                        });
                                    }
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (frameDidDragRef.current) {
                                    frameDidDragRef.current = false;
                                    return;
                                }
                                setSelectedLineIds(new Set([frame.id]));
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();

                                if (frameDidDragRef.current) return;

                                if ((frame.targetSceneKey || frame.targetSceneId) && !dragTargetRef.current) {
                                    if (onNavigate) {
                                        onNavigate({
                                            sceneId: frame.targetSceneId,
                                            sceneKey: frame.targetSceneKey,
                                        });
                                    }
                                }
                            }}
                        >
                            <div 
                                className={`relative group border-2 transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)]
                                    ${isSelected ? "border-[#8b5cf6]" : "border-white/20 hover:border-white/40"}
                                    ${frame.type === "circle" ? "rounded-full" : "rounded-2xl"}
                                    overflow-hidden bg-black/40 backdrop-blur-md ${isLocked ? "opacity-90" : ""}
                                `}
                                style={{
                                    width: frame.width,
                                    height: frame.height,
                                    boxShadow: isSelected ? "0 0 30px rgba(139, 92, 246, 0.4)" : "none"
                                }}
                            >
                                {/* VISTA PREVIA DEL PORTAL (Si existe escena vinculada) */}
                                {frame.previewUrl && frame.type !== "grid" && (
                                    <div className="absolute inset-0 z-0">
                                        <img 
                                            src={frame.previewUrl} 
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                            alt="Preview portal" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                    </div>
                                )}

                            {/* BOTÓN DE SALTO (Navegación entre escenas) - Reubicado a la esquina y ultra-clicable */}
                            {(frame.targetSceneKey || frame.targetSceneId) && frame.type !== "grid" && (
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        console.log("Clic en botón de salto para:", frame.targetSceneKey ?? frame.targetSceneId);
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (onNavigate) {
                                            onNavigate({ sceneId: frame.targetSceneId, sceneKey: frame.targetSceneKey });
                                        }
                                    }}
                                    className="absolute top-2 right-2 z-50 p-2 rounded-full bg-brand-500 text-white shadow-xl hover:scale-125 active:scale-90 transition-all cursor-pointer pointer-events-auto border-2 border-white/20"
                                    title="Saltar a esta escena"
                                >
                                    <Play size={12} fill="currentColor" />
                                </button>
                            )}
                                
                                {/* UI DE AYUDA (Solo si NO hay imagen y NO está fijado) */}
                                {(frame.type === "grid") && (
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:24px_24px]" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                                                Zona / Grilla
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {(!frame.previewUrl && !isLocked && frame.type !== "grid") && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40 group-hover:text-white/60 transition-colors pointer-events-none z-10">
                                        <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                                            <Maximize2 size={32} className="opacity-20" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                                            {frame.type === "circle" ? "Portal Circular" : "Vista 360"}
                                        </span>
                                    </div>
                                )}

                                {/* ICONO DE PORTAL FIJADO (Solo si está fijado) */}
                                {isLocked && !frame.previewUrl && frame.type !== "grid" && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                        <MapIcon size={24} className="text-emerald-400 opacity-60" />
                                    </div>
                                )}

                                {/* Punto de "DIANA" en el CONTORNO INFERIOR - Se oculta si hay una flecha fusionada (snap) */}
                                {!displayLines.some(l => {
                                    const snapPoint = getFrameSnapPoint(frame);
                                    const d1 = Math.hypot(l.x1 - snapPoint.x, l.y1 - snapPoint.y);
                                    const d2 = Math.hypot(l.x2 - snapPoint.x, l.y2 - snapPoint.y);
                                    return l.type === "arrow" && (d1 < 2 || d2 < 2);
                                }) && !isLocked && (
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white/60 rounded-full blur-[1px] border border-white/20 z-50" />
                                )}
                            </div>

                            {/* Tiradores de las 4 esquinas (Canva Style) - FUERA del overflow-hidden */}
                            {(isSelected && !isLocked) && [
                                { left: -6, top: -6, cursor: "nw-resize" }, 
                                { right: -6, top: -6, cursor: "ne-resize" }, 
                                { left: -6, bottom: -6, cursor: "sw-resize" }, 
                                { right: -6, bottom: -6, cursor: "se-resize" }
                            ].map((style, i) => (
                                <div 
                                    key={i}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        const pt = getPoint(e);
                                        setDragTarget({
                                            type: "frame-resize",
                                            frameId: frame.id,
                                            startWidth: frame.width,
                                            startHeight: frame.height,
                                            startX: pt.x,
                                            startY: pt.y
                                        });
                                    }}
                                    className="absolute w-4 h-4 bg-white rounded-full border-2 border-[#8b5cf6] shadow-xl active:scale-125 transition-transform z-[100]"
                                    style={{ ...style, cursor: style.cursor }}
                                >
                                    <div className="absolute inset-1 bg-[#8b5cf6] rounded-full" />
                                </div>
                            ))}
                        </div>
                    );
                })}

                {/* --- CAPA DE IMÁGENES SUELTAS --- */}
                {displayImages.map((img) => {
                    const isSelected = selectedLineIds.has(img.id);
                    if (img.x === -9999) return null;
                    const imageScale = anchoredImageIds.has(img.id) ? getAnchoredObjectScale(img.anchorHfov) : 1;

                    return (
                        <div
                            key={img.id}
                            className="absolute pointer-events-auto"
                            style={{
                                left: img.x,
                                top: img.y,
                                width: img.width,
                                height: img.height,
                                transform: `translate(-50%, -50%) scale(${imageScale})`,
                                transformOrigin: "center center",
                                zIndex: isSelected ? 40 : 30
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                if (activeTool === "select") {
                                    setSelectedLineIds(new Set([img.id]));
                                }
                            }}
                        >
                            <div className={`relative group w-full h-full border-2 rounded-xl overflow-hidden shadow-2xl transition-all
                                ${isSelected ? "border-[#8b5cf6]" : "border-white/20"}`}
                            >
                                <img src={img.url} className="w-full h-full object-cover" alt="Asset" />
                            </div>
                        </div>
                    );
                })}

                {/* Preview de nuevo texto (Canva style) */}
                {draftTextItem && (
                    <div 
                        className="absolute animate-pulse"
                        style={{ left: draftTextItem.x, top: draftTextItem.y, transform: "translate(-50%, -50%)" }}
                    >
                        <div className="border-2 border-dashed border-[#8b5cf6] px-4 py-2 bg-[#8b5cf6]/10 rounded-lg text-white font-bold opacity-70">
                            {draftTextItem.text}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}
