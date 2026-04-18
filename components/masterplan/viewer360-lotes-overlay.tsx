"use client";

import { useEffect, useRef } from "react";
import { MasterplanUnit } from "@/lib/masterplan-store";
import type { OverlayCornerAdjustment } from "@/lib/tour-overlay";
import {
  SvgViewBox,
  svgPathToLatLng,
  geoToPitchYaw,
  projectSphericalToScreen,
} from "@/lib/geo-projection";

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: "#10b981",
  BLOQUEADO: "#94a3b8",
  RESERVADA: "#f59e0b",
  VENDIDA: "#ef4444",
  SUSPENDIDO: "#64748b",
};

const HANDLE_R = 8;
const HANDLE_HIT = 18;
const NS = "http://www.w3.org/2000/svg";
const ROT_GAP = 36;

interface ScreenPt {
  x: number;
  y: number;
}

interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centX: number;
  centY: number;
}

type DragMode = "translate" | "scale" | "rotate" | "corner" | "edge";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startLat: number;
  startLng: number;
  startAlt: number;
  startHdg: number;
  startViewYaw: number;
  startPlanRot: number;
  startPlanScale: number;
  startPlanScaleX: number;
  startPlanScaleY: number;
  startCornerAdjustments: OverlayCornerAdjustment[];
  startAngle: number;
  centX: number;
  centY: number;
  handleIndex?: number;
}

interface LiveDelta {
  latM: number;
  lngM: number;
  scaleFactor: number;
  hdgDelta: number;
  planRotDelta: number;
  cornerAdjustments: OverlayCornerAdjustment[] | null;
}

interface FrameData {
  corners: ScreenPt[];
  edgeMidpoints: ScreenPt[];
  centroid: ScreenPt;
  topEdgeMidpoint: ScreenPt;
}

export interface Viewer360LotesOverlayProps {
  viewer: any;
  mode?: "geo-calibrated" | "manual";
  units: MasterplanUnit[];
  overlayImageUrl?: string;
  overlayBounds: [[number, number], [number, number]];
  overlayRotation: number;
  svgViewBox: SvgViewBox;
  camLat: number;
  camLng: number;
  camAlt: number;
  imageHeading: number;
  latOffset: number;
  lngOffset: number;
  planRotation: number;
  planScale: number;
  planScaleX?: number;
  planScaleY?: number;
  planCornerAdjustments?: OverlayCornerAdjustment[];
  planCornersAbsolute?: { pitch: number; yaw: number }[];
  pitchBias?: number;
  cameraRoll?: number;
  opacity?: number;
  showLabels?: boolean;
  showPerimeter?: boolean;
  cleanMode?: boolean;
  transformLocked?: boolean;
  alignmentGuides?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  isEditing: boolean;
  onEnterEdit?: () => void;
  onExitEdit?: () => void;
  onParamsChange?: (p: {
    latOffset: number;
    lngOffset: number;
    camAlt: number;
    imageHeading: number;
    planRotation: number;
    planScale: number;
    planScaleX?: number;
    planScaleY?: number;
    planCornerAdjustments?: OverlayCornerAdjustment[];
    planCornersAbsolute?: { pitch: number; yaw: number }[];
  }) => void;
}

function svgEl(tag: string, attrs: Record<string, string | number>, text?: string) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

function convexHull(pts: ScreenPt[]): ScreenPt[] {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
  const cross = (o: ScreenPt, a: ScreenPt, b: ScreenPt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: ScreenPt[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: ScreenPt[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function pointInPolygon(pt: ScreenPt, poly: ScreenPt[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function edgeMidpoints(points: ScreenPt[]): ScreenPt[] {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
  });
}

function averagePoint(points: ScreenPt[]): ScreenPt {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function rotatePoint(point: ScreenPt, angle: number): ScreenPt {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function inverseRotatePoint(point: ScreenPt, angle: number): ScreenPt {
  return rotatePoint(point, -angle);
}

function computeFrameFromHull(hull: ScreenPt[]): FrameData | null {
  if (hull.length < 3) return null;

  let bestArea = Infinity;
  let bestAngle = 0;
  let bestBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  for (let i = 0; i < hull.length; i++) {
    const current = hull[i];
    const next = hull[(i + 1) % hull.length];
    const angle = Math.atan2(next.y - current.y, next.x - current.x);
    const rotated = hull.map((point) => inverseRotatePoint(point, angle));
    const xs = rotated.map((point) => point.x);
    const ys = rotated.map((point) => point.y);
    const bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    if (area < bestArea) {
      bestArea = area;
      bestAngle = angle;
      bestBounds = bounds;
    }
  }

  const rotatedCorners = [
    { x: bestBounds.minX, y: bestBounds.minY },
    { x: bestBounds.maxX, y: bestBounds.minY },
    { x: bestBounds.maxX, y: bestBounds.maxY },
    { x: bestBounds.minX, y: bestBounds.maxY },
  ];
  const corners = rotatedCorners.map((point) => rotatePoint(point, bestAngle));
  const centroid = averagePoint(corners);
  const mids = edgeMidpoints(corners);
  const topEdgeIndex = mids.reduce((bestIndex, point, index, list) =>
    point.y < list[bestIndex].y ? index : bestIndex,
  0);

  return {
    corners,
    edgeMidpoints: mids,
    centroid,
    topEdgeMidpoint: mids[topEdgeIndex],
  };
}

function normalizeCornerAdjustments(adjustments?: OverlayCornerAdjustment[] | null): OverlayCornerAdjustment[] {
  if (!Array.isArray(adjustments) || adjustments.length !== 4) {
    return Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
  }
  return adjustments.map((point) => ({ x: point?.x ?? 0, y: point?.y ?? 0 }));
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

function computeHomography(from: ScreenPt[], to: ScreenPt[]) {
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
  return { a, b, c, d, e, f, g, h };
}

function applyHomography(point: ScreenPt, homography: ReturnType<typeof computeHomography>): ScreenPt {
  if (!homography) return point;
  const denom = homography.g * point.x + homography.h * point.y + 1;
  if (Math.abs(denom) < 1e-9) return point;
  return {
    x: (homography.a * point.x + homography.b * point.y + homography.c) / denom,
    y: (homography.d * point.x + homography.e * point.y + homography.f) / denom,
  };
}

function updateCornerAdjustment(
  adjustments: OverlayCornerAdjustment[],
  index: number,
  deltaX: number,
  deltaY: number,
): OverlayCornerAdjustment[] {
  return adjustments.map((point, pointIndex) =>
    pointIndex === index
      ? { x: point.x + deltaX, y: point.y + deltaY }
      : { ...point },
  );
}

function updateEdgeAdjustment(
  adjustments: OverlayCornerAdjustment[],
  edgeIndex: number,
  deltaX: number,
  deltaY: number,
): OverlayCornerAdjustment[] {
  const indices = [edgeIndex, (edgeIndex + 1) % 4];
  return adjustments.map((point, pointIndex) =>
    indices.includes(pointIndex)
      ? { x: point.x + deltaX, y: point.y + deltaY }
      : { ...point },
  );
}

export default function Viewer360LotesOverlay({
  viewer,
  units,
  overlayImageUrl,
  overlayBounds,
  overlayRotation,
  svgViewBox,
  camLat,
  camLng,
  camAlt,
  imageHeading,
  latOffset,
  lngOffset,
  planRotation,
  planScale,
  planScaleX = 1,
  planScaleY = 1,
  planCornerAdjustments,
  pitchBias = 0,
  cameraRoll = 0,
  opacity = 0.55,
  showLabels = true,
  showPerimeter = true,
  cleanMode = false,
  transformLocked = false,
  alignmentGuides = true,
  flipX = false,
  flipY = false,
  isEditing,
  onEnterEdit,
  onExitEdit,
  onParamsChange,
  mode,
  planCornersAbsolute,
}: Viewer360LotesOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hitAreaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  const camAltRef = useRef(camAlt);
  const imageHeadingRef = useRef(imageHeading);
  const camLatRef = useRef(camLat);
  const camLngRef = useRef(camLng);
  const latOffsetRef = useRef(latOffset);
  const lngOffsetRef = useRef(lngOffset);
  const planRotRef = useRef(planRotation);
  const planScaleRef = useRef(planScale);
  const planScaleXRef = useRef(planScaleX);
  const planScaleYRef = useRef(planScaleY);
  const planCornerAdjustmentsRef = useRef<OverlayCornerAdjustment[]>(normalizeCornerAdjustments(planCornerAdjustments));
  const pitchBiasRef = useRef(pitchBias);
  const cameraRollRef = useRef(cameraRoll);
  const opacityRef = useRef(opacity);
  const showLabelsRef = useRef(showLabels);
  const showPerimeterRef = useRef(showPerimeter);
  const cleanModeRef = useRef(cleanMode);
  const lockedRef = useRef(transformLocked);
  const guidesRef = useRef(alignmentGuides);
  const flipXRef = useRef(flipX);
  const flipYRef = useRef(flipY);
  const overlayBoundsRef = useRef(overlayBounds);
  const overlayRotRef = useRef(overlayRotation);
  const svgViewBoxRef = useRef(svgViewBox);
  const unitsRef = useRef(units);
  const isEditingRef = useRef(isEditing);
  const onEnterEditRef = useRef(onEnterEdit);
  const onExitEditRef = useRef(onExitEdit);
  const onParamsChangeRef = useRef(onParamsChange);

  camAltRef.current = camAlt;
  imageHeadingRef.current = imageHeading;
  camLatRef.current = camLat;
  camLngRef.current = camLng;
  latOffsetRef.current = latOffset;
  lngOffsetRef.current = lngOffset;
  planRotRef.current = planRotation;
  planScaleRef.current = planScale;
  planScaleXRef.current = planScaleX;
  planScaleYRef.current = planScaleY;
  planCornerAdjustmentsRef.current = normalizeCornerAdjustments(planCornerAdjustments);
  pitchBiasRef.current = pitchBias;
  cameraRollRef.current = cameraRoll;
  opacityRef.current = opacity;
  showLabelsRef.current = showLabels;
  showPerimeterRef.current = showPerimeter;
  cleanModeRef.current = cleanMode;
  lockedRef.current = transformLocked;
  guidesRef.current = alignmentGuides;
  flipXRef.current = flipX;
  flipYRef.current = flipY;
  overlayBoundsRef.current = overlayBounds;
  overlayRotRef.current = overlayRotation;
  svgViewBoxRef.current = svgViewBox;
  unitsRef.current = units;
  isEditingRef.current = isEditing;
  onEnterEditRef.current = onEnterEdit;
  onExitEditRef.current = onExitEdit;
  onParamsChangeRef.current = onParamsChange;
  const modeRef = useRef(mode);
  const planCornersAbsoluteRef = useRef(planCornersAbsolute);
  modeRef.current = mode;
  planCornersAbsoluteRef.current = planCornersAbsolute;

  const bboxRef = useRef<Bbox | null>(null);
  const hullRef = useRef<ScreenPt[]>([]);
  const frameRef = useRef<FrameData | null>(null);
  const centScreenRef = useRef<ScreenPt | null>(null);
  const rotHandlePosRef = useRef<ScreenPt | null>(null);

  const liveDeltaRef = useRef<LiveDelta>({
    latM: 0,
    lngM: 0,
    scaleFactor: 1,
    hdgDelta: 0,
    planRotDelta: 0,
    cornerAdjustments: null,
  });
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const frame = () => {
      const svg = svgRef.current;
      const container = containerRef.current;
      const hitDiv = hitAreaRef.current;
      if (!svg || !container || !viewer) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const _units = unitsRef.current;
      const _bounds = overlayBoundsRef.current;
      const _rotation = overlayRotRef.current;
      const _viewBox = svgViewBoxRef.current;
      const _editing = isEditingRef.current;
      const _mode = modeRef.current;
      const _absCorners = planCornersAbsoluteRef.current;
      const delta = liveDeltaRef.current;

      const _alt = camAltRef.current;
      const _hdg = imageHeadingRef.current + delta.hdgDelta;
      const _planRot = planRotRef.current + delta.planRotDelta;
      const _planScale = planScaleRef.current * delta.scaleFactor;
      const _planScaleX = planScaleXRef.current;
      const _planScaleY = planScaleYRef.current;
      const _pitchBias = pitchBiasRef.current;
      const _cameraRoll = cameraRollRef.current;
      const _opacity = opacityRef.current;
      const _showLabels = showLabelsRef.current && !cleanModeRef.current;
      const _showPerimeter = showPerimeterRef.current && !cleanModeRef.current;
      const _showGuides = guidesRef.current && !cleanModeRef.current;
      const _locked = lockedRef.current;
      const _flipX = flipXRef.current ? -1 : 1;
      const _flipY = flipYRef.current ? -1 : 1;
      const DEG = Math.PI / 180;
      const _camLat = camLatRef.current + delta.latM / 111320;
      const _camLng = camLngRef.current + delta.lngM / (111320 * Math.cos(camLatRef.current * DEG));

      svg.style.pointerEvents = _editing && !_locked ? "all" : "none";
      svg.style.cursor = _editing && !_locked ? "crosshair" : "default";

      const viewPitch = viewer.getPitch() as number;
      const viewYaw = viewer.getYaw() as number;
      const hfov = viewer.getHfov() as number;
      const activeContainer = containerRef.current;
      if (!activeContainer) return;

      const W = activeContainer.clientWidth;
      const H = activeContainer.clientHeight;

      const cosRoll = Math.cos(_cameraRoll * DEG);
      const sinRoll = Math.sin(_cameraRoll * DEG);
      const halfW = W / 2;
      const halfH = H / 2;

      const projectGeo = (lat: number, lng: number): ScreenPt | null => {
        const { pitch, yaw } = geoToPitchYaw(lat, lng, _camLat, _camLng, _alt, _hdg);
        const raw = projectSphericalToScreen(pitch + _pitchBias, yaw, viewPitch, viewYaw, hfov, W, H);
        if (!raw) return null;
        if (_cameraRoll === 0) return raw;
        const dx = raw.x - halfW;
        const dy = raw.y - halfH;
        return {
          x: halfW + dx * cosRoll - dy * sinRoll,
          y: halfH + dx * sinRoll + dy * cosRoll,
        };
      };

      const projectManual = (p: { pitch: number, yaw: number }): ScreenPt | null => {
         const raw = projectSphericalToScreen(p.pitch, p.yaw, viewPitch, viewYaw, hfov, W, H);
         if (!raw) return null;
         return raw;
      };

      svg.innerHTML = "";

      let manualCorners: ScreenPt[] | null = null;
      if (_mode === "manual" && Array.isArray(_absCorners) && _absCorners.length === 4) {
        manualCorners = _absCorners.map(p => projectManual(p)).filter(Boolean) as ScreenPt[];
        if (manualCorners.length < 4) manualCorners = null;
      }

      const planRotRad = _planRot * DEG;
      const cosPR = Math.cos(planRotRad);
      const sinPR = Math.sin(planRotRad);

      const allLatLngs: [number, number][][] = [];
      let centLat = 0;
      let centLng = 0;
      let centCount = 0;

      for (const unit of _units) {
        let svgPath = unit.path as string | undefined;
        if (!svgPath && (unit as any).coordenadasMasterplan) {
          try {
            const c = JSON.parse((unit as any).coordenadasMasterplan);
            svgPath = c.path;
          } catch {}
        }
        if (!svgPath) {
          allLatLngs.push([]);
          continue;
        }
        const latLngs = svgPathToLatLng(svgPath, _viewBox, _bounds, _rotation);
        allLatLngs.push(latLngs);
        for (const [lat, lng] of latLngs) {
          centLat += lat;
          centLng += lng;
          centCount++;
        }
      }
      if (centCount > 0) {
        centLat /= centCount;
        centLng /= centCount;
      }
      const cosCent = Math.cos(centLat * DEG);
      centScreenRef.current = projectGeo(centLat, centLng);

      const effectiveScaleEW = _planScale * _planScaleX;
      const effectiveScaleNS = _planScale * _planScaleY;

      interface UnitData {
        rawPts: Array<ScreenPt | null>;
        visiblePts: ScreenPt[];
        color: string;
        numero: string;
        d: string;
      }
      const unitData: UnitData[] = [];
      let bbMinX = Infinity, bbMinY = Infinity, bbMaxX = -Infinity, bbMaxY = -Infinity;

      const transformGeoPoint = (lat: number, lng: number): [number, number] => {
        const dLat = (lat - centLat) * 111320 * _flipY;
        const dLng = (lng - centLng) * 111320 * cosCent * _flipX;
        const dLatS = dLat * effectiveScaleNS;
        const dLngS = dLng * effectiveScaleEW;
        const rdLat = dLatS * cosPR - dLngS * sinPR;
        const rdLng = dLatS * sinPR + dLngS * cosPR;
        return [centLat + rdLat / 111320, centLng + rdLng / (111320 * cosCent)];
      };

      const mapPointToManual = (lat: number, lng: number): ScreenPt | null => {
         if (!manualCorners) return null;
         const [[swLat, swLng], [neLat, neLng]] = _bounds;
         const nx = (lng - swLng) / (neLng - swLng);
         const ny = (neLat - lat) / (neLat - swLat);
         
         const cNW = manualCorners[0], cNE = manualCorners[1], cSE = manualCorners[2], cSW = manualCorners[3];
         const topX = cNW.x + nx * (cNE.x - cNW.x);
         const topY = cNW.y + nx * (cNE.y - cNW.y);
         const botX = cSW.x + nx * (cSE.x - cSW.x);
         const botY = cSW.y + nx * (cSE.y - cSW.y);
         
         return {
            x: topX + ny * (botX - topX),
            y: topY + ny * (botY - topY)
         };
      };

      for (let i = 0; i < _units.length; i++) {
        const unit = _units[i];
        const rawLatLngs = allLatLngs[i];
        if (!rawLatLngs || rawLatLngs.length < 3) continue;

        let screenPts: Array<ScreenPt | null>;
        if (_mode === "manual" && manualCorners) {
           screenPts = rawLatLngs.map(([lat, lng]) => mapPointToManual(lat, lng));
        } else {
           const rotatedLatLngs = rawLatLngs.map(([lat, lng]) => transformGeoPoint(lat, lng));
           screenPts = rotatedLatLngs.map(([lat, lng]) => projectGeo(lat, lng));
        }
        
        const visiblePts = screenPts.filter(Boolean) as ScreenPt[];
        if (visiblePts.length < 3) continue;

        for (const pt of visiblePts) {
          if (pt.x < bbMinX) bbMinX = pt.x; if (pt.y < bbMinY) bbMinY = pt.y;
          if (pt.x > bbMaxX) bbMaxX = pt.x; if (pt.y > bbMaxY) bbMaxY = pt.y;
        }

        const hull = convexHull(visiblePts);
        unitData.push({
          rawPts: screenPts,
          visiblePts,
          color: ESTADO_COLORS[unit.estado] || "#10b981",
          numero: unit.numero,
          d: hull.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z",
        });
      }

      const getFinalHull = () => {
        const pts: ScreenPt[] = [];
        for (const u of unitData) pts.push(...u.visiblePts);
        return pts.length >= 3 ? convexHull(pts) : [];
      };

      const finalHull = getFinalHull();
      const hasCornerWarp = Array.isArray(planCornerAdjustmentsRef.current) &&
        planCornerAdjustmentsRef.current.some(c => c.x !== 0 || c.y !== 0);

      const adj = planCornerAdjustmentsRef.current || [];
      const getWarpedCorners = (): ScreenPt[] | null => {
        if (_mode === "manual" && manualCorners) return manualCorners;
        
        const hull = finalHull;
        if (hull.length < 3) return null;
        const hMinX = Math.min(...hull.map(p => p.x)), hMinY = Math.min(...hull.map(p => p.y));
        const hMaxX = Math.max(...hull.map(p => p.x)), hMaxY = Math.max(...hull.map(p => p.y));
        const baseCorners = [
          { x: hMinX, y: hMinY },
          { x: hMaxX, y: hMinY },
          { x: hMaxX, y: hMaxY },
          { x: hMinX, y: hMaxY },
        ];
        return baseCorners.map((bc, i) => ({
          x: bc.x + (adj[i]?.x ?? 0) + (delta.cornerAdjustments?.[i]?.x ?? 0),
          y: bc.y + (adj[i]?.y ?? 0) + (delta.cornerAdjustments?.[i]?.y ?? 0),
        }));
      };

      const warpedCorners = getWarpedCorners();
      const warpUnit = (u: UnitData): UnitData => {
        if (!warpedCorners) return u;
        const corners = warpedCorners;
        const hull = finalHull;
        const hMinX = Math.min(...hull.map(p => p.x)), hMinY = Math.min(...hull.map(p => p.y));
        const hMaxX = Math.max(...hull.map(p => p.x)), hMaxY = Math.max(...hull.map(p => p.y));
        const hW = hMaxX - hMinX || 1, hH = hMaxY - hMinY || 1;

        const warpPt = (pt: ScreenPt): ScreenPt => {
          const nx = (pt.x - hMinX) / hW, ny = (pt.y - hMinY) / hH;
          const topX = corners[0].x + nx * (corners[1].x - corners[0].x);
          const topY = corners[0].y + nx * (corners[1].y - corners[0].y);
          const botX = corners[3].x + nx * (corners[2].x - corners[3].x);
          const botY = corners[3].y + nx * (corners[2].y - corners[3].y);
          return { x: topX + ny * (botX - topX), y: topY + ny * (botY - topY) };
        };

        const newVisible = u.visiblePts.map(warpPt);
        const newHull = convexHull(newVisible);
        return {
          ...u,
          visiblePts: newVisible,
          d: newHull.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z",
        };
      };

      const warpedUnitData = (hasCornerWarp || _mode === "manual") ? unitData.map(warpUnit) : unitData;

      if (_mode === "manual" && warpedCorners) {
        bboxRef.current = {
          minX: Math.min(...warpedCorners.map(p => p.x)),
          minY: Math.min(...warpedCorners.map(p => p.y)),
          maxX: Math.max(...warpedCorners.map(p => p.x)),
          maxY: Math.max(...warpedCorners.map(p => p.y)),
          centX: (Math.min(...warpedCorners.map(p => p.x)) + Math.max(...warpedCorners.map(p => p.x))) / 2,
          centY: (Math.min(...warpedCorners.map(p => p.y)) + Math.max(...warpedCorners.map(p => p.y))) / 2,
        };
      } else if (unitData.length > 0 && isFinite(bbMinX)) {
        bboxRef.current = {
          minX: bbMinX, minY: bbMinY, maxX: bbMaxX, maxY: bbMaxY,
          centX: (bbMinX + bbMaxX) / 2, centY: (bbMinY + bbMaxY) / 2,
        };
      } else {
        bboxRef.current = null;
      }

      if (warpedCorners) {
        const warpedMids = edgeMidpoints(warpedCorners);
        const topEdgeIndex = warpedMids.reduce((best, point, index, list) =>
          point.y < list[best].y ? index : best, 0);
        frameRef.current = {
          corners: warpedCorners,
          edgeMidpoints: warpedMids,
          centroid: averagePoint(warpedCorners),
          topEdgeMidpoint: warpedMids[topEdgeIndex],
        };
      } else {
        frameRef.current = computeFrameFromHull(finalHull);
      }

      if (hitDiv) {
        if (!_editing && finalHull.length >= 3) {
          const hMinX = Math.min(...finalHull.map(p => p.x)), hMinY = Math.min(...finalHull.map(p => p.y));
          const hMaxX = Math.max(...finalHull.map(p => p.x)), hMaxY = Math.max(...finalHull.map(p => p.y));
          hitDiv.style.left = `${hMinX}px`; hitDiv.style.top = `${hMinY}px`;
          hitDiv.style.width = `${hMaxX - hMinX}px`; hitDiv.style.height = `${hMaxY - hMinY}px`;
          hitDiv.style.pointerEvents = "auto"; hitDiv.style.cursor = "pointer";
        } else {
          hitDiv.style.pointerEvents = "none";
          hitDiv.style.cursor = "default";
        }
      }

      for (const { d, color, visiblePts, numero } of warpedUnitData) {
        svg.appendChild(svgEl("path", {
          d,
          fill: color + (_editing ? "50" : "3d"),
          "fill-opacity": _opacity,
          stroke: color,
          "stroke-opacity": Math.max(0.35, _opacity),
          "stroke-width": _editing ? "2.5" : "2",
          "stroke-linejoin": "round",
        }));
        if (_showLabels && visiblePts.length > 0) {
          const cx = (visiblePts.reduce((sum, p) => sum + p.x, 0) / visiblePts.length).toFixed(1);
          const cy = (visiblePts.reduce((sum, p) => sum + p.y, 0) / visiblePts.length).toFixed(1);
          const textAttrs = { x: cx, y: cy, "font-size": "13", "font-family": "Inter,sans-serif", "font-weight": "700", "text-anchor": "middle", "dominant-baseline": "middle" };
          const outline = svgEl("text", { ...textAttrs, fill: "none", stroke: "rgba(0,0,0,0.75)", "stroke-width": "4", "stroke-linejoin": "round" });
          outline.textContent = numero; svg.appendChild(outline);
          const lbl = svgEl("text", { ...textAttrs, fill: "white" });
          lbl.textContent = numero; svg.appendChild(lbl);
        }
      }

      if (_showGuides && finalHull.length >= 3) {
        const hullD = finalHull.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
        svg.appendChild(svgEl("path", { d: hullD, fill: "none", stroke: "rgba(255,255,255,0.18)", "stroke-width": "1", "stroke-dasharray": "5 4" }));
      }

      if (overlayImageUrl && frameRef.current) {
        const [c0, c1, , c3] = frameRef.current.corners;
        const matrix = [c1.x - c0.x, c1.y - c0.y, c3.x - c0.x, c3.y - c0.y, c0.x, c0.y].join(" ");
        svg.appendChild(svgEl("image", { href: overlayImageUrl, x: 0, y: 0, width: 1, height: 1, transform: `matrix(${matrix})` }));
      }

      if (_editing && frameRef.current) {
        const frameData = frameRef.current;
        const topEdgeIndex = frameData.edgeMidpoints.reduce((best, point, index, list) =>
          point.y < list[best].y ? index : best, 0);
        const edgeStart = frameData.corners[topEdgeIndex], edgeEnd = frameData.corners[(topEdgeIndex + 1) % 4];
        const midX = frameData.topEdgeMidpoint.x, midY = frameData.topEdgeMidpoint.y;
        const eDx = edgeEnd.x - edgeStart.x, eDy = edgeEnd.y - edgeStart.y, eLen = Math.hypot(eDx, eDy) || 1;
        const p1x = -eDy / eLen, p1y = eDx / eLen, p2x = eDy / eLen, p2y = -eDx / eLen;
        const centSc = centScreenRef.current ?? frameData.centroid;
        const dot1 = (midX - centSc.x) * p1x + (midY - centSc.y) * p1y;
        const outX = dot1 >= 0 ? p1x : p2x, outY = dot1 >= 0 ? p1y : p2y;
        const rhX = midX + outX * ROT_GAP, rhY = midY + outY * ROT_GAP;
        rotHandlePosRef.current = { x: rhX, y: rhY };

        const borderD = frameData.corners.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
        svg.appendChild(svgEl("path", { d: borderD, fill: "none", stroke: "rgba(99,102,241,0.7)", "stroke-width": "1.5" }));

        if (_mode !== "manual") {
           svg.appendChild(svgEl("line", { x1: midX, y1: midY, x2: rhX, y2: rhY, stroke: "rgba(99,102,241,0.6)", "stroke-width": "1.5", "stroke-dasharray": "4 3" }));
           svg.appendChild(svgEl("circle", { cx: rhX, cy: rhY, r: HANDLE_R, fill: "#6366f1", stroke: "white", "stroke-width": "2" }));
        }

        for (const { x, y } of frameData.corners) {
          svg.appendChild(svgEl("circle", { cx: x, cy: y, r: HANDLE_R, fill: "white", stroke: "#6366f1", "stroke-width": "2" }));
        }
        if (_mode !== "manual") {
           for (const { x, y } of frameData.edgeMidpoints) {
             svg.appendChild(svgEl("rect", { x: x - 5, y: y - 5, width: 10, height: 10, rx: 3, fill: "#eef2ff", stroke: "#6366f1", "stroke-width": "1.5" }));
           }
        }
      } else {
        rotHandlePosRef.current = null;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [viewer]);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    const hitArea = hitAreaRef.current;
    if (!svg || !container || !hitArea) return;

    function localPt(e: PointerEvent): ScreenPt {
      const rect = container!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function dist(a: ScreenPt, b: ScreenPt) { return Math.hypot(a.x - b.x, a.y - b.y); }

    const onHitAreaDown = (e: PointerEvent) => {
      if (transformLocked || !isEditing) return;
      onEnterEdit?.();
      onSvgDown(e);
    };

    const onSvgDown = (e: PointerEvent) => {
        const bb = bboxRef.current, pt = localPt(e), frame = frameRef.current;
        e.stopPropagation(); e.preventDefault();
        if (lockedRef.current) return;
        if (!bb || !frame) { onExitEditRef.current?.(); return; }

        const rotHandle = rotHandlePosRef.current ?? { x: bb.centX, y: bb.minY - ROT_GAP };
        const cornerIndex = frame.corners.findIndex((corner) => dist(pt, corner) <= HANDLE_HIT);
        const edgeIndex = frame.edgeMidpoints.findIndex((midpoint) => dist(pt, midpoint) <= HANDLE_HIT);

        let mode: DragMode | null = null;
        let handleIndex: number | undefined;

        if (modeRef.current === "manual") {
          if (cornerIndex >= 0) { mode = "corner"; handleIndex = cornerIndex; }
          else if (pointInPolygon(pt, frame.corners)) { mode = "translate"; }
        } else {
          if (dist(pt, rotHandle) <= HANDLE_HIT) mode = "rotate";
          else if (cornerIndex >= 0) { mode = "corner"; handleIndex = cornerIndex; }
          else if (edgeIndex >= 0) { mode = "edge"; handleIndex = edgeIndex; }
          else if (pointInPolygon(pt, frame.corners)) mode = "translate";
        }

        if (!mode) { onExitEditRef.current?.(); return; }

        const startViewYaw = (() => { try { return viewer.getYaw() as number; } catch { return 0; } })();
        svg.setPointerCapture(e.pointerId);
        liveDeltaRef.current = { latM: 0, lngM: 0, scaleFactor: 1, hdgDelta: 0, planRotDelta: 0, cornerAdjustments: null };
        dragRef.current = {
          mode,
          startX: e.clientX,
          startY: e.clientY,
          startLat: latOffsetRef.current,
          startLng: lngOffsetRef.current,
          startAlt: camAltRef.current,
          startHdg: imageHeadingRef.current,
          startViewYaw,
          startPlanRot: planRotRef.current,
          startPlanScale: planScaleRef.current,
          startPlanScaleX: planScaleXRef.current,
          startPlanScaleY: planScaleYRef.current,
          startCornerAdjustments: [...planCornerAdjustmentsRef.current],
          startAngle: Math.atan2(pt.y - bb.centY, pt.x - bb.centX),
          centX: bb.centX,
          centY: bb.centY,
          handleIndex
        };
      };

      const onMove = (e: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;

        const activeContainer = containerRef.current;
        if (!activeContainer) return;

        const W = activeContainer.clientWidth;
        const H = activeContainer.clientHeight;
        const hfov = (() => {
          try {
            return viewer.getHfov() as number;
          } catch {
            return 100;
          }
        })();
        const DEG = Math.PI / 180;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        if (drag.mode === "translate") {
          const mpp = (2 * drag.startAlt * Math.tan((hfov * DEG) / 2)) / W;
          const effHdgRad = (drag.startHdg + drag.startViewYaw) * DEG;
          const screenRightM = dx * mpp;
          const screenDownM = dy * mpp;
          const northM =
            screenRightM * -Math.sin(effHdgRad) + screenDownM * -Math.cos(effHdgRad);
          const eastM =
            screenRightM * Math.cos(effHdgRad) + screenDownM * -Math.sin(effHdgRad);
          liveDeltaRef.current = {
            latM: -northM,
            lngM: -eastM,
            scaleFactor: 1,
            hdgDelta: 0,
            planRotDelta: 0,
            cornerAdjustments: null,
          };
        } else if (drag.mode === "scale") {
          const factor = Math.exp((-dy / H) * 3);
          liveDeltaRef.current = {
            latM: 0,
            lngM: 0,
            scaleFactor: factor,
            hdgDelta: 0,
            planRotDelta: 0,
            cornerAdjustments: null,
          };
        } else if (drag.mode === "rotate") {
          const pt = localPt(e);
          const angle = Math.atan2(pt.y - drag.centY, pt.x - drag.centX);
          const deltaDeg = (angle - drag.startAngle) / DEG;
          liveDeltaRef.current = {
            latM: 0,
            lngM: 0,
            scaleFactor: 1,
            hdgDelta: 0,
            planRotDelta: deltaDeg,
            cornerAdjustments: null,
          };
        } else if (drag.mode === "edge" && drag.handleIndex !== undefined) {
          const factor = Math.exp((-dy / H) * 2);
          const sx = drag.handleIndex % 2 === 0 ? 1 : factor;
          const sy = drag.handleIndex % 2 === 0 ? factor : 1;
          onParamsChangeRef.current?.({
            latOffset: drag.startLat,
            lngOffset: drag.startLng,
            camAlt: drag.startAlt,
            imageHeading: drag.startHdg,
            planRotation: drag.startPlanRot,
            planScale: drag.startPlanScale,
            planScaleX: drag.startPlanScaleX * sx,
            planScaleY: drag.startPlanScaleY * sy,
            planCornerAdjustments: drag.startCornerAdjustments,
          });
        } else if (drag.mode === "corner" && drag.handleIndex !== undefined) {
          if (modeRef.current === "manual") {
            const coords = (() => {
              try {
                return viewer.mouseEventToCoords(e) as [number, number];
              } catch {
                return null;
              }
            })();
            if (coords) {
              const [pitch, yaw] = coords;
              const nextCorners = [...(planCornersAbsoluteRef.current || [])];
              if (nextCorners.length === 4) {
                nextCorners[drag.handleIndex] = { pitch, yaw };
                onParamsChangeRef.current?.({
                  latOffset: drag.startLat,
                  lngOffset: drag.startLng,
                  camAlt: drag.startAlt,
                  imageHeading: drag.startHdg,
                  planRotation: drag.startPlanRot,
                  planScale: drag.startPlanScale,
                  planCornerAdjustments: drag.startCornerAdjustments,
                  planCornersAbsolute: nextCorners,
                });
              }
            }
          } else {
            const nextAdjustments = [...drag.startCornerAdjustments];
            const effHdgRad = (drag.startHdg + drag.startViewYaw) * DEG;
            const mpp = (2 * drag.startAlt * Math.tan((hfov * DEG) / 2)) / W;
            const screenRightM = dx * mpp;
            const screenDownM = dy * mpp;
            const northM =
              screenRightM * -Math.sin(effHdgRad) + screenDownM * -Math.cos(effHdgRad);
            const eastM =
              screenRightM * Math.cos(effHdgRad) + screenDownM * -Math.sin(effHdgRad);
            nextAdjustments[drag.handleIndex] = { x: -eastM, y: -northM };
            liveDeltaRef.current = {
              latM: 0,
              lngM: 0,
              scaleFactor: 1,
              hdgDelta: 0,
              planRotDelta: 0,
              cornerAdjustments: nextAdjustments,
            };
          }
        }
      };

      const onUp = () => {
        const drag = dragRef.current;
        if (!drag) return;

        const d = liveDeltaRef.current;
        const finalLat = drag.startLat + d.latM;
        const finalLng = drag.startLng + d.lngM;
        const finalHdg = ((drag.startHdg + d.hdgDelta) % 360 + 360) % 360;
        const finalPlanRot = ((drag.startPlanRot + d.planRotDelta) % 360 + 360) % 360;
        const finalCamAlt = camAltRef.current;
        const finalPlanScale = Math.max(0.05, drag.startPlanScale * d.scaleFactor);
        const finalCornerAdjustments = d.cornerAdjustments ?? drag.startCornerAdjustments;

        liveDeltaRef.current = {
          latM: 0,
          lngM: 0,
          scaleFactor: 1,
          hdgDelta: 0,
          planRotDelta: 0,
          cornerAdjustments: null,
        };
        dragRef.current = null;

        onParamsChangeRef.current?.({
          latOffset: finalLat,
          lngOffset: finalLng,
          camAlt: finalCamAlt,
          imageHeading: finalHdg,
          planRotation: finalPlanRot,
          planScale: finalPlanScale,
          planScaleX: drag.startPlanScaleX,
          planScaleY: drag.startPlanScaleY,
          planCornerAdjustments: finalCornerAdjustments,
        });
      };

      if (!hitArea || !svg) return;

      hitArea.addEventListener("pointerdown", onHitAreaDown);
      svg.addEventListener("pointerdown", onSvgDown);
      svg.addEventListener("pointermove", onMove);
      svg.addEventListener("pointerup", onUp);
      svg.addEventListener("pointercancel", onUp);

    const stopFn = (e: Event) => {
      e.stopPropagation();
      if (e.type !== "wheel") e.preventDefault();
    };
    svg.addEventListener("mousedown", stopFn);
    svg.addEventListener("touchstart", stopFn, { passive: false });
    svg.addEventListener("touchmove", stopFn, { passive: false });
    svg.addEventListener("touchend", stopFn);

    return () => {
      hitArea.removeEventListener("pointerdown", onHitAreaDown);
      svg.removeEventListener("pointerdown", onSvgDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
      svg.removeEventListener("mousedown", stopFn);
      svg.removeEventListener("touchstart", stopFn);
      svg.removeEventListener("touchmove", stopFn);
      svg.removeEventListener("touchend", stopFn);
    };
  }, [viewer]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div ref={hitAreaRef} className="absolute" />
      <svg
        ref={svgRef}
        data-overlay-svg="true"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      />
    </div>
  );
}
