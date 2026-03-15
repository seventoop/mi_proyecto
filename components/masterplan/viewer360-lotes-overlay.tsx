"use client";

import { useEffect, useRef } from "react";
import { MasterplanUnit } from "@/lib/masterplan-store";
import {
  SvgViewBox,
  svgPathToLatLng,
  geoToPitchYaw,
  projectSphericalToScreen,
} from "@/lib/geo-projection";

// Colours mirror masterplan-map STATUS_COLORS
const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: "#10b981",
  BLOQUEADO:  "#94a3b8",
  RESERVADA:  "#f59e0b",
  VENDIDA:    "#ef4444",
  SUSPENDIDO: "#64748b",
};

interface Viewer360LotesOverlayProps {
  viewer: any; // Pannellum instance
  units: MasterplanUnit[];
  overlayBounds: [[number, number], [number, number]]; // [[swLat,swLng],[neLat,neLng]]
  overlayRotation: number;
  svgViewBox: SvgViewBox;
  camLat: number;
  camLng: number;
  camAlt: number;       // metres, e.g. 500
  imageHeading: number; // degrees, 0 = North
}

export default function Viewer360LotesOverlay({
  viewer,
  units,
  overlayBounds,
  overlayRotation,
  svgViewBox,
  camLat,
  camLng,
  camAlt,
  imageHeading,
}: Viewer360LotesOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const rafRef       = useRef<number>();

  // ── Mutable refs — written every render, read inside the rAF loop ──────────
  // This pattern lets sliders update the overlay at 60fps with zero lag:
  // no effect restart, no rAF cancel/restart, the loop just reads fresh refs.
  const camAltRef          = useRef(camAlt);
  const imageHeadingRef    = useRef(imageHeading);
  const camLatRef          = useRef(camLat);
  const camLngRef          = useRef(camLng);
  const overlayBoundsRef   = useRef(overlayBounds);
  const overlayRotationRef = useRef(overlayRotation);
  const svgViewBoxRef      = useRef(svgViewBox);
  const unitsRef           = useRef(units);

  // Sync refs on every render (safe — this runs before the rAF next tick)
  camAltRef.current          = camAlt;
  imageHeadingRef.current    = imageHeading;
  camLatRef.current          = camLat;
  camLngRef.current          = camLng;
  overlayBoundsRef.current   = overlayBounds;
  overlayRotationRef.current = overlayRotation;
  svgViewBoxRef.current      = svgViewBox;
  unitsRef.current           = units;

  // ── rAF draw loop — only restarts if the Pannellum instance is replaced ────
  useEffect(() => {
    const frame = () => {
      const svg       = svgRef.current;
      const container = containerRef.current;

      if (!svg || !container || !viewer) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // Read all mutable values from refs (always fresh, no stale closures)
      const _units    = unitsRef.current;
      const _alt      = camAltRef.current;
      const _hdg      = imageHeadingRef.current;
      const _camLat   = camLatRef.current;
      const _camLng   = camLngRef.current;
      const _bounds   = overlayBoundsRef.current;
      const _rotation = overlayRotationRef.current;
      const _viewBox  = svgViewBoxRef.current;

      const viewPitch = viewer.getPitch() as number;
      const viewYaw   = viewer.getYaw()   as number;
      const hfov      = viewer.getHfov()  as number;
      const W = container.clientWidth;
      const H = container.clientHeight;

      svg.innerHTML = "";
      const NS = "http://www.w3.org/2000/svg";

      for (const unit of _units) {
        // ── 1. Extract SVG path ──────────────────────────────────────────────
        let svgPath = unit.path as string | undefined;
        if (!svgPath && (unit as any).coordenadasMasterplan) {
          try {
            const c = JSON.parse((unit as any).coordenadasMasterplan);
            svgPath = c.path;
          } catch {}
        }
        if (!svgPath) continue;

        // ── 2. SVG → geographic [lat, lng] vertices ──────────────────────────
        const latLngs = svgPathToLatLng(svgPath, _viewBox, _bounds, _rotation);
        if (latLngs.length < 3) continue;

        // ── 3. Geo → screen pixels ───────────────────────────────────────────
        const screenPts = latLngs.map(([lat, lng]) => {
          const { pitch, yaw } = geoToPitchYaw(lat, lng, _camLat, _camLng, _alt, _hdg);
          return projectSphericalToScreen(pitch, yaw, viewPitch, viewYaw, hfov, W, H);
        });

        // Need at least 3 non-null (in-front-of-camera) vertices
        const visiblePts = screenPts.filter(Boolean) as { x: number; y: number }[];
        if (visiblePts.length < 3) continue;

        // ── 4. Build SVG path string (skip behind-camera vertices) ───────────
        let d = "";
        for (const pt of screenPts) {
          if (!pt) continue;
          d += `${d === "" ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)} `;
        }
        d += "Z";

        const color = ESTADO_COLORS[unit.estado] ?? "#94a3b8";

        // ── 5. Polygon ───────────────────────────────────────────────────────
        const pathEl = document.createElementNS(NS, "path");
        pathEl.setAttribute("d", d);
        pathEl.setAttribute("fill", color + "3d");   // ~24% opacity
        pathEl.setAttribute("stroke", color);
        pathEl.setAttribute("stroke-width", "2");
        pathEl.setAttribute("stroke-linejoin", "round");
        svg.appendChild(pathEl);

        // ── 6. Lot number at polygon centroid ────────────────────────────────
        const cx = (visiblePts.reduce((s, p) => s + p.x, 0) / visiblePts.length).toFixed(1);
        const cy = (visiblePts.reduce((s, p) => s + p.y, 0) / visiblePts.length).toFixed(1);

        // Shadow pass
        const textShadow = document.createElementNS(NS, "text");
        textShadow.setAttribute("x", cx);
        textShadow.setAttribute("y", cy);
        textShadow.setAttribute("fill", "none");
        textShadow.setAttribute("stroke", "rgba(0,0,0,0.75)");
        textShadow.setAttribute("stroke-width", "4");
        textShadow.setAttribute("stroke-linejoin", "round");
        textShadow.setAttribute("font-size", "13");
        textShadow.setAttribute("font-family", "Inter, system-ui, sans-serif");
        textShadow.setAttribute("font-weight", "700");
        textShadow.setAttribute("text-anchor", "middle");
        textShadow.setAttribute("dominant-baseline", "middle");
        textShadow.textContent = unit.numero;
        svg.appendChild(textShadow);

        // Fill pass
        const label = document.createElementNS(NS, "text");
        label.setAttribute("x", cx);
        label.setAttribute("y", cy);
        label.setAttribute("fill", "white");
        label.setAttribute("font-size", "13");
        label.setAttribute("font-family", "Inter, system-ui, sans-serif");
        label.setAttribute("font-weight", "700");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.textContent = unit.numero;
        svg.appendChild(label);
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [viewer]); // ← only restart if the Pannellum instance itself is replaced

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-10">
      <svg
        ref={svgRef}
        data-overlay-svg="true"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      />
    </div>
  );
}
