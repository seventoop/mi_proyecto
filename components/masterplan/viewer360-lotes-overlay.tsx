"use client";

import { useEffect, useRef } from "react";
import { MasterplanUnit } from "@/lib/masterplan-store";
import {
  SvgViewBox,
  svgPathToLatLng,
  geoToPitchYaw,
  projectSphericalToScreen,
} from "@/lib/geo-projection";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: "#10b981",
  BLOQUEADO:  "#94a3b8",
  RESERVADA:  "#f59e0b",
  VENDIDA:    "#ef4444",
  SUSPENDIDO: "#64748b",
};

const HANDLE_R   = 8;
const HANDLE_HIT = 18;
const NS = "http://www.w3.org/2000/svg";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScreenPt { x: number; y: number }

interface Bbox {
  minX: number; minY: number;
  maxX: number; maxY: number;
  centX: number; centY: number;
}

type DragMode = "translate" | "scale" | "rotate";

interface DragState {
  mode: DragMode;
  startX: number; startY: number;
  startLat: number; startLng: number;
  startAlt: number;
  startHdg: number;
  startViewYaw: number;   // Pannellum viewYaw captured at drag start
  startPlanRot: number;
  startPlanScale: number;
  startAngle: number;
  centX: number; centY: number;
}

interface LiveDelta {
  latM: number;
  lngM: number;
  scaleFactor: number;
  hdgDelta: number;
  planRotDelta: number;
}

export interface Viewer360LotesOverlayProps {
  viewer: any;
  units: MasterplanUnit[];
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
  isEditing: boolean;
  onEnterEdit?: () => void;
  onExitEdit?: () => void;
  onParamsChange?: (p: {
    latOffset: number; lngOffset: number;
    camAlt: number; imageHeading: number;
    planRotation: number; planScale: number;
  }) => void;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function svgEl(tag: string, attrs: Record<string, string | number>, text?: string) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

// Andrew's monotone chain — O(n log n) convex hull
function convexHull(pts: ScreenPt[]): ScreenPt[] {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
  const cross = (o: ScreenPt, a: ScreenPt, b: ScreenPt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: ScreenPt[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: ScreenPt[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// Ray-casting point-in-polygon — works for any simple polygon
function pointInPolygon(pt: ScreenPt, poly: ScreenPt[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = (yi > pt.y) !== (yj > pt.y) &&
      pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Viewer360LotesOverlay({
  viewer,
  units, overlayBounds, overlayRotation, svgViewBox,
  camLat, camLng, camAlt, imageHeading,
  latOffset, lngOffset,
  planRotation, planScale,
  isEditing,
  onEnterEdit, onExitEdit, onParamsChange,
}: Viewer360LotesOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const hitAreaRef   = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>();

  // ── Prop refs ────────────────────────────────────────────────────────────────
  const camAltRef        = useRef(camAlt);
  const imageHeadingRef  = useRef(imageHeading);
  const camLatRef        = useRef(camLat);
  const camLngRef        = useRef(camLng);
  const latOffsetRef     = useRef(latOffset);
  const lngOffsetRef     = useRef(lngOffset);
  const planRotRef       = useRef(planRotation);
  const planScaleRef     = useRef(planScale);
  const overlayBoundsRef = useRef(overlayBounds);
  const overlayRotRef    = useRef(overlayRotation);
  const svgViewBoxRef    = useRef(svgViewBox);
  const unitsRef         = useRef(units);
  const isEditingRef     = useRef(isEditing);
  const onEnterEditRef   = useRef(onEnterEdit);
  const onExitEditRef    = useRef(onExitEdit);
  const onParamsChangeRef= useRef(onParamsChange);

  camAltRef.current        = camAlt;
  imageHeadingRef.current  = imageHeading;
  camLatRef.current        = camLat;
  camLngRef.current        = camLng;
  latOffsetRef.current     = latOffset;
  lngOffsetRef.current     = lngOffset;
  planRotRef.current       = planRotation;
  planScaleRef.current     = planScale;
  overlayBoundsRef.current = overlayBounds;
  overlayRotRef.current    = overlayRotation;
  svgViewBoxRef.current    = svgViewBox;
  unitsRef.current         = units;
  isEditingRef.current     = isEditing;
  onEnterEditRef.current   = onEnterEdit;
  onExitEditRef.current    = onExitEdit;
  onParamsChangeRef.current= onParamsChange;

  // State accessible from pointer handlers via refs
  const bboxRef        = useRef<Bbox | null>(null);
  const hullRef        = useRef<ScreenPt[]>([]);        // convex hull of all visible pts
  const geoCornersRef  = useRef<ScreenPt[]>([]);        // 4 projected geo-bbox corners
  const centScreenRef  = useRef<ScreenPt | null>(null); // projected geo centroid (stable during rotation)
  const ROT_GAP        = 36;

  const liveDeltaRef = useRef<LiveDelta>({ latM: 0, lngM: 0, scaleFactor: 1, hdgDelta: 0, planRotDelta: 0 });
  const dragRef      = useRef<DragState | null>(null);

  // ── rAF draw loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const frame = () => {
      const svg       = svgRef.current;
      const container = containerRef.current;
      const hitDiv    = hitAreaRef.current;
      if (!svg || !container || !viewer) { rafRef.current = requestAnimationFrame(frame); return; }

      const _units    = unitsRef.current;
      const _bounds   = overlayBoundsRef.current;
      const _rotation = overlayRotRef.current;
      const _viewBox  = svgViewBoxRef.current;
      const _editing  = isEditingRef.current;
      const delta     = liveDeltaRef.current;

      const _alt      = camAltRef.current;
      const _hdg      = imageHeadingRef.current + delta.hdgDelta;
      const _planRot  = planRotRef.current + delta.planRotDelta;
      const _planScale = planScaleRef.current * delta.scaleFactor;
      const DEG       = Math.PI / 180;
      const _camLat   = camLatRef.current + delta.latM / 111320;
      const _camLng   = camLngRef.current + delta.lngM /
        (111320 * Math.cos(camLatRef.current * DEG));

      svg.style.pointerEvents = _editing ? "all" : "none";
      svg.style.cursor        = _editing ? "crosshair" : "default";

      const viewPitch = viewer.getPitch() as number;
      const viewYaw   = viewer.getYaw()   as number;
      const hfov      = viewer.getHfov()  as number;
      const W = container.clientWidth;
      const H = container.clientHeight;

      svg.innerHTML = "";

      const planRotRad = _planRot * DEG;
      const cosPR      = Math.cos(planRotRad);
      const sinPR      = Math.sin(planRotRad);

      // ── Pass 0: collect geo points, compute centroid ─────────────────────
      const allLatLngs: [number, number][][] = [];
      let centLat = 0, centLng = 0, centCount = 0;

      // Also track geo bbox BEFORE planRotation (for geo-corner handles)
      let gMinLat = Infinity, gMinLng = Infinity, gMaxLat = -Infinity, gMaxLng = -Infinity;

      for (const unit of _units) {
        let svgPath = unit.path as string | undefined;
        if (!svgPath && (unit as any).coordenadasMasterplan) {
          try { const c = JSON.parse((unit as any).coordenadasMasterplan); svgPath = c.path; } catch {}
        }
        if (!svgPath) { allLatLngs.push([]); continue; }
        const latLngs = svgPathToLatLng(svgPath, _viewBox, _bounds, _rotation);
        allLatLngs.push(latLngs);
        for (const [lat, lng] of latLngs) {
          centLat += lat; centLng += lng; centCount++;
          if (lat < gMinLat) gMinLat = lat;
          if (lng < gMinLng) gMinLng = lng;
          if (lat > gMaxLat) gMaxLat = lat;
          if (lng > gMaxLng) gMaxLng = lng;
        }
      }
      if (centCount > 0) { centLat /= centCount; centLng /= centCount; }
      const cosCent = Math.cos(centLat * DEG);

      // Project geo centroid to screen — stable anchor for rotation handle.
      // Since planRotation rotates around this centroid, its screen position
      // does NOT change when the plan rotates (only when translated/zoomed).
      {
        const { pitch: cPitch, yaw: cYaw } = geoToPitchYaw(
          centLat, centLng, _camLat, _camLng, _alt, _hdg
        );
        centScreenRef.current = projectSphericalToScreen(
          cPitch, cYaw, viewPitch, viewYaw, hfov, W, H
        );
      }

      // ── Pass 1: apply plan transform, project to screen ───────────────────
      interface UnitData {
        visiblePts: ScreenPt[];
        color: string;
        numero: string;
        d: string;
      }
      const unitData: UnitData[] = [];
      let bbMinX = Infinity, bbMinY = Infinity, bbMaxX = -Infinity, bbMaxY = -Infinity;
      const allVisiblePts: ScreenPt[] = [];

      for (let i = 0; i < _units.length; i++) {
        const unit = _units[i];
        const rawLatLngs = allLatLngs[i];
        if (!rawLatLngs || rawLatLngs.length < 3) continue;

        const rotatedLatLngs: [number, number][] = rawLatLngs.map(([lat, lng]) => {
          const dLat = (lat - centLat) * 111320;
          const dLng = (lng - centLng) * 111320 * cosCent;
          const rdLat = (dLat * cosPR - dLng * sinPR) * _planScale;
          const rdLng = (dLat * sinPR + dLng * cosPR) * _planScale;
          return [centLat + rdLat / 111320, centLng + rdLng / (111320 * cosCent)];
        });

        const screenPts = rotatedLatLngs.map(([lat, lng]) => {
          const { pitch, yaw } = geoToPitchYaw(lat, lng, _camLat, _camLng, _alt, _hdg);
          return projectSphericalToScreen(pitch, yaw, viewPitch, viewYaw, hfov, W, H);
        });

        const visiblePts = screenPts.filter(Boolean) as ScreenPt[];
        if (visiblePts.length < 3) continue;

        for (const pt of visiblePts) {
          if (pt.x < bbMinX) bbMinX = pt.x;
          if (pt.y < bbMinY) bbMinY = pt.y;
          if (pt.x > bbMaxX) bbMaxX = pt.x;
          if (pt.y > bbMaxY) bbMaxY = pt.y;
          allVisiblePts.push(pt);
        }

        let d = "";
        for (const pt of screenPts) {
          if (!pt) continue;
          d += `${d === "" ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)} `;
        }
        d += "Z";

        unitData.push({
          visiblePts,
          color: ESTADO_COLORS[unit.estado] ?? "#94a3b8",
          numero: unit.numero,
          d,
        });
      }

      // Compute convex hull for hitbox (stored in ref for pointer handler)
      const hull = allVisiblePts.length >= 3 ? convexHull(allVisiblePts) : [];
      hullRef.current = hull;

      // AABB bbox (used only for centroid + rotation handle position)
      if (unitData.length > 0 && isFinite(bbMinX)) {
        bboxRef.current = {
          minX: bbMinX, minY: bbMinY,
          maxX: bbMaxX, maxY: bbMaxY,
          centX: (bbMinX + bbMaxX) / 2, centY: (bbMinY + bbMaxY) / 2,
        };
      } else {
        bboxRef.current = null;
      }

      // Compute geo-bbox corners: 4 corners of unrotated bbox, apply planRotation+scale, project
      let screenGeoCorners: ScreenPt[] = [];
      if (isFinite(gMinLat)) {
        const rawGeoCorners: [number, number][] = [
          [gMinLat, gMinLng], [gMinLat, gMaxLng],
          [gMaxLat, gMaxLng], [gMaxLat, gMinLng],
        ];
        screenGeoCorners = rawGeoCorners.map(([lat, lng]) => {
          const dLat = (lat - centLat) * 111320;
          const dLng = (lng - centLng) * 111320 * cosCent;
          const rdLat = (dLat * cosPR - dLng * sinPR) * _planScale;
          const rdLng = (dLat * sinPR + dLng * cosPR) * _planScale;
          const rLat = centLat + rdLat / 111320;
          const rLng = centLng + rdLng / (111320 * cosCent);
          const { pitch, yaw } = geoToPitchYaw(rLat, rLng, _camLat, _camLng, _alt, _hdg);
          return projectSphericalToScreen(pitch, yaw, viewPitch, viewYaw, hfov, W, H);
        }).filter(Boolean) as ScreenPt[];
      }
      geoCornersRef.current = screenGeoCorners;

      // Update hit-area div (enter-edit click target — only active when NOT editing)
      if (hitDiv) {
        if (!_editing && hull.length >= 3) {
          // Size hit-area to the AABB of the hull (tight, no extra padding)
          const hMinX = Math.min(...hull.map(p => p.x));
          const hMinY = Math.min(...hull.map(p => p.y));
          const hMaxX = Math.max(...hull.map(p => p.x));
          const hMaxY = Math.max(...hull.map(p => p.y));
          hitDiv.style.left          = `${hMinX}px`;
          hitDiv.style.top           = `${hMinY}px`;
          hitDiv.style.width         = `${hMaxX - hMinX}px`;
          hitDiv.style.height        = `${hMaxY - hMinY}px`;
          hitDiv.style.pointerEvents = "auto";
          hitDiv.style.cursor        = "pointer";
        } else {
          hitDiv.style.pointerEvents = "none";
          hitDiv.style.cursor        = "default";
        }
      }

      // ── Pass 2: draw units ───────────────────────────────────────────────
      for (const { d, color, visiblePts, numero } of unitData) {
        svg.appendChild(svgEl("path", {
          d,
          fill: color + (_editing ? "50" : "3d"),
          stroke: color,
          "stroke-width": _editing ? "2.5" : "2",
          "stroke-linejoin": "round",
        }));

        const cx = (visiblePts.reduce((s, p) => s + p.x, 0) / visiblePts.length).toFixed(1);
        const cy = (visiblePts.reduce((s, p) => s + p.y, 0) / visiblePts.length).toFixed(1);
        const textAttrs = {
          x: cx, y: cy,
          "font-size": "13", "font-family": "Inter,system-ui,sans-serif",
          "font-weight": "700", "text-anchor": "middle", "dominant-baseline": "middle",
        };

        const outline = svgEl("text", { ...textAttrs, fill: "none", stroke: "rgba(0,0,0,0.75)", "stroke-width": "4", "stroke-linejoin": "round" });
        outline.textContent = numero;
        svg.appendChild(outline);

        const lbl = svgEl("text", { ...textAttrs, fill: "white" });
        lbl.textContent = numero;
        svg.appendChild(lbl);
      }

      // ── Pass 3: edit handles ─────────────────────────────────────────────
      if (_editing && bboxRef.current && screenGeoCorners.length === 4) {
        // Rotation handle anchor: projected geo centroid (invariant under planRotation).
        // Falls back to AABB centroid only if projection failed (edge case).
        const centSc = centScreenRef.current;
        const rhX = centSc ? centSc.x : bboxRef.current.centX;
        const rhY = centSc ? centSc.y - ROT_GAP - HANDLE_R * 2 : bboxRef.current.minY - ROT_GAP;
        const lineStartY = centSc ? centSc.y - HANDLE_R - 4 : bboxRef.current.minY;

        // Border: solid thin line connecting the 4 projected geo corners
        const borderD = screenGeoCorners.map((p, i) =>
          `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
        ).join(" ") + " Z";
        svg.appendChild(svgEl("path", {
          d: borderD,
          fill: "none",
          stroke: "rgba(99,102,241,0.7)",
          "stroke-width": "1.5",
        }));

        // Line from stable centroid anchor up to rotation handle
        svg.appendChild(svgEl("line", {
          x1: rhX, y1: lineStartY, x2: rhX, y2: rhY + HANDLE_R,
          stroke: "rgba(99,102,241,0.6)", "stroke-width": "1.5", "stroke-dasharray": "4 3",
        }));

        // Corner handles at geo-bbox projected corners
        for (const { x: hx, y: hy } of screenGeoCorners) {
          svg.appendChild(svgEl("circle", {
            cx: hx, cy: hy, r: HANDLE_R,
            fill: "white", stroke: "#6366f1", "stroke-width": "2",
          }));
        }

        // Rotation handle — fixed above projected centroid, never rotates
        svg.appendChild(svgEl("circle", {
          cx: rhX, cy: rhY, r: HANDLE_R,
          fill: "#6366f1", stroke: "white", "stroke-width": "2",
        }));
        svg.appendChild(svgEl("path", {
          d: `M${rhX - 4},${rhY} a4,4 0 1,1 5,3`,
          fill: "none", stroke: "white", "stroke-width": "1.5", "stroke-linecap": "round",
        }));
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [viewer]);

  // ── Pointer event handling ─────────────────────────────────────────────────
  useEffect(() => {
    const svg     = svgRef.current;
    const hitArea = hitAreaRef.current;
    const container = containerRef.current;
    if (!svg || !container || !hitArea) return;

    function localPt(e: PointerEvent): ScreenPt {
      const rect = container!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function dist(a: ScreenPt, b: ScreenPt) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    const onHitAreaDown = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onEnterEditRef.current?.();
    };

    const onSvgDown = (e: PointerEvent) => {
      const bb   = bboxRef.current;
      const pt   = localPt(e);
      const hull = hullRef.current;
      const geoCorners = geoCornersRef.current;
      e.stopPropagation();
      e.preventDefault();

      if (!bb) { onExitEditRef.current?.(); return; }

      // Match the render position: centroid-projected anchor, fixed offset above it
      const centSc = centScreenRef.current;
      const rotHandle = centSc
        ? { x: centSc.x, y: centSc.y - ROT_GAP - HANDLE_R * 2 }
        : { x: bb.centX, y: bb.minY - 36 };

      let mode: DragMode | null = null;
      if (dist(pt, rotHandle) <= HANDLE_HIT) {
        mode = "rotate";
      } else if (geoCorners.some((c) => dist(pt, c) <= HANDLE_HIT)) {
        mode = "scale";
      } else if (hull.length >= 3 && pointInPolygon(pt, hull)) {
        mode = "translate";
      } else {
        onExitEditRef.current?.();
        return;
      }

      // Capture viewYaw at drag start — essential for correct screen-space movement
      const startViewYaw = (() => { try { return viewer.getYaw() as number; } catch { return 0; } })();

      svg.setPointerCapture(e.pointerId);
      liveDeltaRef.current = { latM: 0, lngM: 0, scaleFactor: 1, hdgDelta: 0, planRotDelta: 0 };
      dragRef.current = {
        mode,
        startX: e.clientX, startY: e.clientY,
        startLat: latOffsetRef.current,
        startLng: lngOffsetRef.current,
        startAlt: camAltRef.current,
        startHdg: imageHeadingRef.current,
        startViewYaw,
        startPlanRot: planRotRef.current,
        startPlanScale: planScaleRef.current,
        startAngle: Math.atan2(pt.y - bb.centY, pt.x - bb.centX) * (180 / Math.PI),
        centX: bb.centX, centY: bb.centY,
      };
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const W    = container.clientWidth;
      const H    = container.clientHeight;
      const hfov = (() => { try { return viewer.getHfov() as number; } catch { return 100; } })();
      const DEG  = Math.PI / 180;
      const dx   = e.clientX - drag.startX;
      const dy   = e.clientY - drag.startY;

      if (drag.mode === "translate") {
        const mpp = (2 * drag.startAlt * Math.tan((hfov * DEG) / 2)) / W;

        // Use imageHeading + viewYaw as effective heading.
        // This is the bearing the user actually sees in the viewer,
        // so screen-right maps to geo-direction (effHdg + 90°) correctly.
        const effHdgRad      = (drag.startHdg + drag.startViewYaw) * DEG;
        const screen_right_m = dx * mpp;
        const screen_down_m  = dy * mpp;
        const north_m = screen_right_m * (-Math.sin(effHdgRad)) + screen_down_m * (-Math.cos(effHdgRad));
        const east_m  = screen_right_m * ( Math.cos(effHdgRad)) + screen_down_m * (-Math.sin(effHdgRad));
        liveDeltaRef.current = { latM: north_m, lngM: east_m, scaleFactor: 1, hdgDelta: 0, planRotDelta: 0 };

      } else if (drag.mode === "scale") {
        const factor = Math.exp(-dy / H * 3);
        liveDeltaRef.current = { latM: 0, lngM: 0, scaleFactor: factor, hdgDelta: 0, planRotDelta: 0 };

      } else if (drag.mode === "rotate") {
        const rect     = container.getBoundingClientRect();
        const curPt    = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const curAngle = Math.atan2(curPt.y - drag.centY, curPt.x - drag.centX) * (180 / Math.PI);
        liveDeltaRef.current = { latM: 0, lngM: 0, scaleFactor: 1, hdgDelta: 0, planRotDelta: curAngle - drag.startAngle };
      }
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;

      const d = liveDeltaRef.current;
      const finalLat      = drag.startLat + d.latM;
      const finalLng      = drag.startLng + d.lngM;
      const finalHdg      = ((drag.startHdg + d.hdgDelta) % 360 + 360) % 360;
      const finalPlanRot  = ((drag.startPlanRot + d.planRotDelta) % 360 + 360) % 360;
      const finalCamAlt   = camAltRef.current;
      const finalPlanScale = Math.max(0.05, drag.startPlanScale * d.scaleFactor);

      liveDeltaRef.current = { latM: 0, lngM: 0, scaleFactor: 1, hdgDelta: 0, planRotDelta: 0 };
      dragRef.current = null;

      onParamsChangeRef.current?.({
        latOffset:    finalLat,
        lngOffset:    finalLng,
        camAlt:       finalCamAlt,
        imageHeading: finalHdg,
        planRotation: finalPlanRot,
        planScale:    finalPlanScale,
      });
    };

    hitArea.addEventListener("pointerdown", onHitAreaDown);
    svg.addEventListener("pointerdown",   onSvgDown);
    svg.addEventListener("pointermove",   onMove);
    svg.addEventListener("pointerup",     onUp);
    svg.addEventListener("pointercancel", onUp);

    const stopFn = (e: Event) => {
      e.stopPropagation();
      if (e.type !== "wheel") e.preventDefault();
    };
    svg.addEventListener("mousedown",  stopFn);
    svg.addEventListener("touchstart", stopFn, { passive: false });
    svg.addEventListener("touchmove",  stopFn, { passive: false });
    svg.addEventListener("touchend",   stopFn);

    return () => {
      hitArea.removeEventListener("pointerdown", onHitAreaDown);
      svg.removeEventListener("pointerdown",   onSvgDown);
      svg.removeEventListener("pointermove",   onMove);
      svg.removeEventListener("pointerup",     onUp);
      svg.removeEventListener("pointercancel", onUp);
      svg.removeEventListener("mousedown",  stopFn);
      svg.removeEventListener("touchstart", stopFn);
      svg.removeEventListener("touchmove",  stopFn);
      svg.removeEventListener("touchend",   stopFn);
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
