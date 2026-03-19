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

const HANDLE_R      = 8;   // corner / rotation handle radius (px)
const HANDLE_HIT    = 18;  // hit-test radius for handles (px)
const BBOX_PAD      = 16;  // padding around lot bounding box
const ROT_GAP       = 36;  // px above bbox top for rotation handle
const NS = "http://www.w3.org/2000/svg";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  startPlanRot: number;
  startAngle: number;
  centX: number; centY: number;
}

interface LiveDelta {
  latM: number;
  lngM: number;
  altFactor: number;
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
  isEditing: boolean;
  onEnterEdit?: () => void;
  onExitEdit?: () => void;
  onParamsChange?: (p: {
    latOffset: number; lngOffset: number;
    camAlt: number; imageHeading: number;
    planRotation: number;
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
function convexHull(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: { x: number; y: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: { x: number; y: number }[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Viewer360LotesOverlay({
  viewer,
  units, overlayBounds, overlayRotation, svgViewBox,
  camLat, camLng, camAlt, imageHeading,
  latOffset, lngOffset,
  planRotation,
  isEditing,
  onEnterEdit, onExitEdit, onParamsChange,
}: Viewer360LotesOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const hitAreaRef   = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>();

  // ── Prop refs — synced every render, read inside rAF/event handlers ─────────
  const camAltRef        = useRef(camAlt);
  const imageHeadingRef  = useRef(imageHeading);
  const camLatRef        = useRef(camLat);
  const camLngRef        = useRef(camLng);
  const latOffsetRef     = useRef(latOffset);
  const lngOffsetRef     = useRef(lngOffset);
  const planRotRef       = useRef(planRotation);
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
  overlayBoundsRef.current = overlayBounds;
  overlayRotRef.current    = overlayRotation;
  svgViewBoxRef.current    = svgViewBox;
  unitsRef.current         = units;
  isEditingRef.current     = isEditing;
  onEnterEditRef.current   = onEnterEdit;
  onExitEditRef.current    = onExitEdit;
  onParamsChangeRef.current= onParamsChange;

  // AABB of all visible lots — for hit-testing in event handlers
  const bboxRef = useRef<Bbox | null>(null);

  // Live drag delta — added on top of prop values in rAF loop for zero-lag rendering
  const liveDeltaRef = useRef<LiveDelta>({ latM: 0, lngM: 0, altFactor: 1, hdgDelta: 0, planRotDelta: 0 });

  // Drag state
  const dragRef = useRef<DragState | null>(null);

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

      // Apply live drag deltas on top of prop values
      const _alt      = camAltRef.current * delta.altFactor;
      const _hdg      = imageHeadingRef.current + delta.hdgDelta;
      const _planRot  = planRotRef.current + delta.planRotDelta;
      const DEG       = Math.PI / 180;
      const _camLat   = camLatRef.current + delta.latM / 111320;
      const _camLng   = camLngRef.current + delta.lngM /
        (111320 * Math.cos(camLatRef.current * DEG));

      // Update SVG pointer-events: only intercept events when editing
      svg.style.pointerEvents = _editing ? "all" : "none";
      svg.style.cursor        = _editing ? "crosshair" : "default";

      const viewPitch = viewer.getPitch() as number;
      const viewYaw   = viewer.getYaw()   as number;
      const hfov      = viewer.getHfov()  as number;
      const W = container.clientWidth;
      const H = container.clientHeight;

      svg.innerHTML = "";

      // ── Plan rotation helpers ────────────────────────────────────────────
      const planRotRad = _planRot * DEG;
      const cosPR      = Math.cos(planRotRad);
      const sinPR      = Math.sin(planRotRad);

      // ── Pass 0: collect all geo points to compute rotation centroid ──────
      const allLatLngs: [number, number][][] = [];
      let centLat = 0, centLng = 0, centCount = 0;

      for (const unit of _units) {
        let svgPath = unit.path as string | undefined;
        if (!svgPath && (unit as any).coordenadasMasterplan) {
          try { const c = JSON.parse((unit as any).coordenadasMasterplan); svgPath = c.path; } catch {}
        }
        if (!svgPath) { allLatLngs.push([]); continue; }
        const latLngs = svgPathToLatLng(svgPath, _viewBox, _bounds, _rotation);
        allLatLngs.push(latLngs);
        for (const [lat, lng] of latLngs) { centLat += lat; centLng += lng; centCount++; }
      }
      if (centCount > 0) { centLat /= centCount; centLng /= centCount; }
      const cosCent = Math.cos(centLat * DEG);

      // ── Pass 1: apply plan rotation, project to screen ───────────────────
      interface UnitData {
        visiblePts: { x: number; y: number }[];
        color: string;
        numero: string;
        d: string;
      }
      const unitData: UnitData[] = [];
      let bbMinX = Infinity, bbMinY = Infinity, bbMaxX = -Infinity, bbMaxY = -Infinity;
      const allVisiblePts: { x: number; y: number }[] = [];

      for (let i = 0; i < _units.length; i++) {
        const unit = _units[i];
        const rawLatLngs = allLatLngs[i];
        if (!rawLatLngs || rawLatLngs.length < 3) continue;

        // Rotate each geo point around the plan centroid
        const rotatedLatLngs: [number, number][] = rawLatLngs.map(([lat, lng]) => {
          const dLat = (lat - centLat) * 111320;
          const dLng = (lng - centLng) * 111320 * cosCent;
          const rdLat = dLat * cosPR - dLng * sinPR;
          const rdLng = dLat * sinPR + dLng * cosPR;
          return [centLat + rdLat / 111320, centLng + rdLng / (111320 * cosCent)];
        });

        const screenPts = rotatedLatLngs.map(([lat, lng]) => {
          const { pitch, yaw } = geoToPitchYaw(lat, lng, _camLat, _camLng, _alt, _hdg);
          return projectSphericalToScreen(pitch, yaw, viewPitch, viewYaw, hfov, W, H);
        });

        const visiblePts = screenPts.filter(Boolean) as { x: number; y: number }[];
        if (visiblePts.length < 3) continue;

        // Accumulate for AABB bbox
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

      // Store AABB bbox (with padding) for hit-testing
      if (unitData.length > 0 && isFinite(bbMinX)) {
        bboxRef.current = {
          minX: bbMinX - BBOX_PAD, minY: bbMinY - BBOX_PAD,
          maxX: bbMaxX + BBOX_PAD, maxY: bbMaxY + BBOX_PAD,
          centX: (bbMinX + bbMaxX) / 2, centY: (bbMinY + bbMaxY) / 2,
        };
      } else {
        bboxRef.current = null;
      }

      // Update hit-area div (for entering edit mode)
      if (hitDiv) {
        if (!_editing && bboxRef.current) {
          const bb = bboxRef.current;
          hitDiv.style.left         = `${bb.minX}px`;
          hitDiv.style.top          = `${bb.minY}px`;
          hitDiv.style.width        = `${bb.maxX - bb.minX}px`;
          hitDiv.style.height       = `${bb.maxY - bb.minY}px`;
          hitDiv.style.pointerEvents = "auto";
          hitDiv.style.cursor       = "pointer";
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

        // Outline (stroke for legibility)
        const outline = svgEl("text", { ...textAttrs, fill: "none", stroke: "rgba(0,0,0,0.75)", "stroke-width": "4", "stroke-linejoin": "round" });
        outline.textContent = numero;
        svg.appendChild(outline);

        const lbl = svgEl("text", { ...textAttrs, fill: "white" });
        lbl.textContent = numero;
        svg.appendChild(lbl);
      }

      // ── Pass 3: draw edit handles ────────────────────────────────────────
      if (_editing && bboxRef.current && allVisiblePts.length >= 3) {
        const bb  = bboxRef.current;
        const cx  = bb.centX, cy = bb.centY;
        const rotY = bb.minY - ROT_GAP;

        // ── Convex hull selection outline (follows actual lot shape) ──────
        const hull = convexHull(allVisiblePts);
        if (hull.length >= 3) {
          const hullD = hull.map((p, i) =>
            `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
          ).join(" ") + " Z";
          svg.appendChild(svgEl("path", {
            d: hullD,
            fill: "none",
            stroke: "rgba(99,102,241,0.8)",
            "stroke-width": "1.5",
            "stroke-dasharray": "6 4",
            rx: "4",
          }));
        }

        // Line to rotation handle
        svg.appendChild(svgEl("line", {
          x1: cx, y1: bb.minY, x2: cx, y2: rotY,
          stroke: "rgba(99,102,241,0.6)", "stroke-width": "1.5", "stroke-dasharray": "4 3",
        }));

        // Corner handles (scale) — at AABB corners
        const corners = [
          [bb.minX, bb.minY], [bb.maxX, bb.minY],
          [bb.maxX, bb.maxY], [bb.minX, bb.maxY],
        ] as const;
        for (const [hx, hy] of corners) {
          svg.appendChild(svgEl("circle", {
            cx: hx, cy: hy, r: HANDLE_R,
            fill: "white", stroke: "#6366f1", "stroke-width": "2",
          }));
        }

        // Rotation handle
        svg.appendChild(svgEl("circle", {
          cx, cy: rotY, r: HANDLE_R,
          fill: "#6366f1", stroke: "white", "stroke-width": "2",
        }));
        svg.appendChild(svgEl("path", {
          d: `M${cx - 4},${rotY} a4,4 0 1,1 5,3`,
          fill: "none", stroke: "white", "stroke-width": "1.5", "stroke-linecap": "round",
        }));

        // Center move handle
        svg.appendChild(svgEl("circle", {
          cx, cy, r: HANDLE_R + 2,
          fill: "rgba(99,102,241,0.2)", stroke: "#6366f1", "stroke-width": "1.5",
          "stroke-dasharray": "3 2",
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

    function localPt(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function insideBbox(pt: { x: number; y: number }, bb: Bbox) {
      return pt.x >= bb.minX && pt.x <= bb.maxX && pt.y >= bb.minY && pt.y <= bb.maxY;
    }

    // ── Hit area: click to enter edit mode ──────────────────────────────────
    const onHitAreaDown = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onEnterEditRef.current?.();
    };

    // ── SVG: all edit-mode interactions ─────────────────────────────────────
    const onSvgDown = (e: PointerEvent) => {
      const bb = bboxRef.current;
      const pt = localPt(e);
      e.stopPropagation();
      e.preventDefault();

      if (!bb) { onExitEditRef.current?.(); return; }

      const rotHandle = { x: bb.centX, y: bb.minY - ROT_GAP };
      const corners = [
        { x: bb.minX, y: bb.minY }, { x: bb.maxX, y: bb.minY },
        { x: bb.maxX, y: bb.maxY }, { x: bb.minX, y: bb.maxY },
      ];

      let mode: DragMode | null = null;
      if (dist(pt, rotHandle) <= HANDLE_HIT) {
        mode = "rotate";
      } else if (corners.some((c) => dist(pt, c) <= HANDLE_HIT)) {
        mode = "scale";
      } else if (insideBbox(pt, bb)) {
        mode = "translate";
      } else {
        // Click outside overlay → exit edit mode
        onExitEditRef.current?.();
        return;
      }

      svg.setPointerCapture(e.pointerId);
      liveDeltaRef.current = { latM: 0, lngM: 0, altFactor: 1, hdgDelta: 0, planRotDelta: 0 };
      dragRef.current = {
        mode,
        startX: e.clientX, startY: e.clientY,
        startLat: latOffsetRef.current,
        startLng: lngOffsetRef.current,
        startAlt: camAltRef.current,
        startHdg: imageHeadingRef.current,
        startPlanRot: planRotRef.current,
        startAngle: Math.atan2(pt.y - bb.centY, pt.x - bb.centX) * (180 / Math.PI),
        centX: bb.centX, centY: bb.centY,
      };
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const W   = container.clientWidth;
      const H   = container.clientHeight;
      const hfov = (() => { try { return viewer.getHfov() as number; } catch { return 100; } })();
      const DEG  = Math.PI / 180;
      const dx   = e.clientX - drag.startX;
      const dy   = e.clientY - drag.startY;

      if (drag.mode === "translate") {
        const mpp          = (2 * drag.startAlt * Math.tan((hfov * DEG) / 2)) / W;
        const hdgRad       = drag.startHdg * DEG;
        const screen_right_m = dx * mpp;
        const screen_down_m  = dy * mpp;
        const north_m = screen_right_m * (-Math.sin(hdgRad)) + screen_down_m * (-Math.cos(hdgRad));
        const east_m  = screen_right_m * ( Math.cos(hdgRad)) + screen_down_m * (-Math.sin(hdgRad));
        liveDeltaRef.current = { latM: north_m, lngM: east_m, altFactor: 1, hdgDelta: 0, planRotDelta: 0 };

      } else if (drag.mode === "scale") {
        const factor = Math.exp(-dy / H * 3);
        liveDeltaRef.current = { latM: 0, lngM: 0, altFactor: factor, hdgDelta: 0, planRotDelta: 0 };

      } else if (drag.mode === "rotate") {
        const rect     = container.getBoundingClientRect();
        const curPt    = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const curAngle = Math.atan2(curPt.y - drag.centY, curPt.x - drag.centX) * (180 / Math.PI);
        liveDeltaRef.current = { latM: 0, lngM: 0, altFactor: 1, hdgDelta: 0, planRotDelta: curAngle - drag.startAngle };
      }
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;

      const d         = liveDeltaRef.current;
      const finalLat  = drag.startLat + d.latM;
      const finalLng  = drag.startLng + d.lngM;
      const finalAlt  = Math.max(10, drag.startAlt * d.altFactor);
      const finalHdg  = ((drag.startHdg + d.hdgDelta) % 360 + 360) % 360;
      const finalPlanRot = ((drag.startPlanRot + d.planRotDelta) % 360 + 360) % 360;

      liveDeltaRef.current = { latM: 0, lngM: 0, altFactor: 1, hdgDelta: 0, planRotDelta: 0 };
      dragRef.current = null;

      onParamsChangeRef.current?.({
        latOffset:    finalLat,
        lngOffset:    finalLng,
        camAlt:       finalAlt,
        imageHeading: finalHdg,
        planRotation: finalPlanRot,
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
    svg.addEventListener("mousedown", stopFn);
    svg.addEventListener("touchstart", stopFn, { passive: false });
    svg.addEventListener("touchmove", stopFn, { passive: false });
    svg.addEventListener("touchend", stopFn);

    return () => {
      hitArea.removeEventListener("pointerdown", onHitAreaDown);
      svg.removeEventListener("pointerdown",   onSvgDown);
      svg.removeEventListener("pointermove",   onMove);
      svg.removeEventListener("pointerup",     onUp);
      svg.removeEventListener("pointercancel", onUp);
      
      svg.removeEventListener("mousedown", stopFn);
      svg.removeEventListener("touchstart", stopFn, { capture: false } as any);
      svg.removeEventListener("touchmove", stopFn, { capture: false } as any);
      svg.removeEventListener("touchend", stopFn);
    };
  }, [viewer]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      {/* Transparent hit area — positioned imperatively over the lot bbox when not editing */}
      <div ref={hitAreaRef} className="absolute" />
      {/* Overlay SVG — pointer-events managed imperatively in rAF loop */}
      <svg
        ref={svgRef}
        data-overlay-svg="true"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      />
    </div>
  );
}
