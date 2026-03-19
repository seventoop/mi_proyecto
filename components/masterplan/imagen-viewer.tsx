"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Layers, ChevronUp, ChevronDown, Check, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImagenMapaItem, IMAGEN_TIPO_CONFIG } from "@/types/imagen-mapa";
import { MasterplanUnit } from "@/lib/masterplan-store";
import { SvgViewBox, svgPathToLatLng, geoToPitchYaw } from "@/lib/geo-projection";
import Viewer360LotesOverlay from "./viewer360-lotes-overlay";

interface ImagenViewerProps {
  imagen: ImagenMapaItem;
  onClose: () => void;
  // Called after a successful calibration save — lets the parent refresh its items list
  onCalibrationSaved?: (updates: Pick<ImagenMapaItem, "altitudM" | "imageHeading" | "latOffset" | "lngOffset" | "planRotation">) => void;
  // Optional overlay data — only used for tipo="360"
  units?: MasterplanUnit[];
  overlayBounds?: [[number, number], [number, number]] | null;
  overlayRotation?: number;
  svgViewBox?: SvgViewBox | null;
}

// ─── Pannellum loader (singleton) ─────────────────────────────────────────────
let pannellumLoaded = false;
let pannellumLoading = false;
const pannellumCallbacks: (() => void)[] = [];

function loadPannellum(callback: () => void) {
  if (pannellumLoaded || (window as any).pannellum) {
    pannellumLoaded = true;
    callback();
    return;
  }
  pannellumCallbacks.push(callback);
  if (pannellumLoading) return;
  pannellumLoading = true;

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
  document.head.appendChild(css);

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
  script.onload = () => {
    pannellumLoaded = true;
    pannellumLoading = false;
    pannellumCallbacks.forEach((cb) => cb());
    pannellumCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImagenViewer({
  imagen,
  onClose,
  onCalibrationSaved,
  units = [],
  overlayBounds = null,
  overlayRotation = 0,
  svgViewBox = null,
}: ImagenViewerProps) {
  const viewerRef   = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  const [isLoading,    setIsLoading]    = useState(true);
  const [viewerReady,  setViewerReady]  = useState(false);

  // Overlay controls — initialise from saved values on the imagen record
  const [showOverlay,   setShowOverlay]   = useState(true);
  const [overlayAlt,    setOverlayAlt]    = useState<number>(imagen.altitudM ?? 500);
  const [overlayHdg,    setOverlayHdg]    = useState<number>(imagen.imageHeading ?? 0);
  const [latOffset,     setLatOffset]     = useState<number>(imagen.latOffset ?? 0);
  const [lngOffset,     setLngOffset]     = useState<number>(imagen.lngOffset ?? 0);
  const [planRotation,  setPlanRotation]  = useState<number>(imagen.planRotation ?? 0);
  const [isSavingCalib, setIsSavingCalib] = useState(false);
  const [calibSaved,    setCalibSaved]    = useState(false);

  // Edit mode — activated by clicking on the lot overlay
  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  const is360 = imagen.tipo === "360";
  const tipoConfig = IMAGEN_TIPO_CONFIG[imagen.tipo];

  // Whether there is enough data to show the overlay
  const hasOverlayData =
    is360 &&
    units.length > 0 &&
    overlayBounds != null &&
    svgViewBox != null;

  const hasOverlayDataRef = useRef(hasOverlayData);
  hasOverlayDataRef.current = hasOverlayData;

  // Adjust camera position by offset (meters → degrees)
  const camLat = imagen.lat + latOffset / 111320;
  const camLng = imagen.lng + lngOffset / (111320 * Math.cos((imagen.lat * Math.PI) / 180));

  // ── Init Pannellum ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!is360) {
      setIsLoading(false);
      return;
    }

    loadPannellum(() => {
      if (!viewerRef.current || !(window as any).pannellum) return;
      setIsLoading(false);

      try {
        instanceRef.current = (window as any).pannellum.viewer(viewerRef.current, {
          type: "equirectangular",
          panorama: imagen.url,
          autoLoad: true,
          showControls: false,
          mouseZoom: false,
          hfov: 100,
          minHfov: 40,
          maxHfov: 120,
          compass: false,
          hotSpots: [],
        });

        instanceRef.current.on("load", () => setViewerReady(true));

        const poll = setInterval(() => {
          try {
            if (instanceRef.current?.isLoaded?.()) {
              setViewerReady(true);
              clearInterval(poll);
            }
          } catch { clearInterval(poll); }
        }, 150);
        setTimeout(() => clearInterval(poll), 15_000);
      } catch (err) {
        console.error("[ImagenViewer] Pannellum error", err);
      }
    });

    return () => {
      setViewerReady(false);
      try { instanceRef.current?.destroy(); } catch {}
      instanceRef.current = null;
    };
  }, [imagen.url, is360]);

  // ─── Smooth Zoom / Overlay Scale Interceptor ───
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !is360) return;
    const handleWheel = (e: WheelEvent) => {
      if (!instanceRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      if (isEditingRef.current && hasOverlayDataRef.current) {
        // Scale the overlay altitude: scroll up = lower alt = bigger lots
        const factor = e.deltaY > 0 ? 1.08 : 0.925;
        setOverlayAlt((prev) => Math.max(10, Math.round(prev * factor)));
      } else {
        const currentFov = instanceRef.current.getHfov();
        const delta = e.deltaY > 0 ? 5 : -5;
        instanceRef.current.setHfov(currentFov + delta);
      }
    };
    el.addEventListener("wheel", handleWheel as any, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", handleWheel as any, { capture: true } as any);
  }, [is360]);

  // ─── Keyboard arrow keys when editing ───
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isEditingRef.current || !hasOverlayDataRef.current) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? 25 : 5;
      if (e.key === "ArrowUp")    setLatOffset((v) => v + step);
      if (e.key === "ArrowDown")  setLatOffset((v) => v - step);
      if (e.key === "ArrowLeft")  setLngOffset((v) => v - step);
      if (e.key === "ArrowRight") setLngOffset((v) => v + step);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Auto-aim camera toward lots when viewer first becomes ready ───────────
  useEffect(() => {
    if (!viewerReady || !hasOverlayData || !instanceRef.current) return;

    let sumPitch = 0, sumYaw = 0, count = 0;
    for (const unit of units) {
      let svgPath = unit.path as string | undefined;
      if (!svgPath && (unit as any).coordenadasMasterplan) {
        try { const c = JSON.parse((unit as any).coordenadasMasterplan); svgPath = c.path; } catch {}
      }
      if (!svgPath) continue;

      const latLngs = svgPathToLatLng(svgPath, svgViewBox!, overlayBounds!, overlayRotation);
      if (latLngs.length === 0) continue;

      const cLat = latLngs.reduce((s, [lat]) => s + lat, 0) / latLngs.length;
      const cLng = latLngs.reduce((s, [, lng]) => s + lng, 0) / latLngs.length;
      const { pitch, yaw } = geoToPitchYaw(cLat, cLng, camLat, camLng, overlayAlt, overlayHdg);
      sumPitch += pitch;
      sumYaw   += yaw;
      count++;
    }

    if (count === 0) return;
    try {
      instanceRef.current.setPitch(sumPitch / count);
      instanceRef.current.setYaw(sumYaw / count);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerReady]);

  // ── Save calibration ──────────────────────────────────────────────────────
  const saveCalibration = useCallback(async () => {
    setIsSavingCalib(true);
    try {
      const res = await fetch(`/api/imagenes-mapa/${imagen.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altitudM: overlayAlt, imageHeading: overlayHdg, latOffset, lngOffset, planRotation }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setCalibSaved(true);
      setTimeout(() => setCalibSaved(false), 2000);
      // Notify parent so it can refresh its items list (fixes stale data on reopen)
      onCalibrationSaved?.({ altitudM: overlayAlt, imageHeading: overlayHdg, latOffset, lngOffset, planRotation });
    } catch {
      toast.error("No se pudo guardar la calibración");
    } finally {
      setIsSavingCalib(false);
    }
  }, [imagen.id, overlayAlt, overlayHdg, latOffset, lngOffset, planRotation, onCalibrationSaved]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{tipoConfig.emoji}</span>
          <span className="text-white font-medium text-sm">
            {imagen.titulo || "Imagen sin título"}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: tipoConfig.color + "33", color: tipoConfig.color }}
          >
            {tipoConfig.label}
          </span>
          {imagen.unidad && (
            <span className="text-xs text-slate-400">Lote {imagen.unidad.numero}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Viewer area ── */}
      <div className="relative flex-1 overflow-hidden">

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          </div>
        )}

        {is360 ? (
          <>
            <div ref={viewerRef} className="w-full h-full" />

            {viewerReady && hasOverlayData && showOverlay && (
              <Viewer360LotesOverlay
                viewer={instanceRef.current}
                units={units}
                overlayBounds={overlayBounds!}
                overlayRotation={overlayRotation}
                svgViewBox={svgViewBox!}
                camLat={camLat}
                camLng={camLng}
                camAlt={overlayAlt}
                imageHeading={overlayHdg}
                latOffset={latOffset}
                lngOffset={lngOffset}
                planRotation={planRotation}
                isEditing={isEditing}
                onEnterEdit={() => setIsEditing(true)}
                onExitEdit={() => setIsEditing(false)}
                onParamsChange={({ latOffset: lo, lngOffset: lng, camAlt, imageHeading, planRotation: pr }) => {
                  setLatOffset(lo);
                  setLngOffset(lng);
                  setOverlayAlt(camAlt);
                  setOverlayHdg(imageHeading);
                  setPlanRotation(pr);
                }}
              />
            )}

            {!isLoading && hasOverlayData && (
              <OverlayControls
                showOverlay={showOverlay}
                onToggle={() => setShowOverlay((v) => !v)}
                altitudM={overlayAlt}
                onAltChange={setOverlayAlt}
                imageHeading={overlayHdg}
                onHeadingChange={setOverlayHdg}
                latOffset={latOffset}
                lngOffset={lngOffset}
                onLatOffsetChange={setLatOffset}
                onLngOffsetChange={setLngOffset}
                onSave={saveCalibration}
                isSaving={isSavingCalib}
                saved={calibSaved}
                isEditing={isEditing}
              />
            )}

            {!isLoading && !hasOverlayData && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40 pointer-events-none">
                Arrastrá para rotar · Scroll para zoom
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={imagen.url}
              alt={imagen.titulo || "Imagen"}
              className="max-w-full max-h-full object-contain rounded-xl"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overlay Controls ─────────────────────────────────────────────────────────

const MOVE_STEP = 5; // metros por click de flecha

interface OverlayControlsProps {
  showOverlay: boolean;
  onToggle: () => void;
  altitudM: number;
  onAltChange: (v: number) => void;
  imageHeading: number;
  onHeadingChange: (v: number) => void;
  latOffset: number;
  lngOffset: number;
  onLatOffsetChange: (v: number) => void;
  onLngOffsetChange: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
  saved: boolean;
  isEditing: boolean;
}

function OverlayControls({
  showOverlay, onToggle,
  altitudM, onAltChange,
  imageHeading, onHeadingChange,
  latOffset, lngOffset,
  onLatOffsetChange, onLngOffsetChange,
  onSave, isSaving, saved,
  isEditing,
}: OverlayControlsProps) {
  const [expanded, setExpanded] = useState(false);

  const sign = (n: number) => n >= 0 ? `+${n}` : `${n}`;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">

      {/* Expanded calibration panel */}
      {expanded && (
        <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 shadow-2xl flex flex-col gap-4 min-w-[300px]">

          {/* Altitud */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center justify-between">
              Altitud del dron
              <span className="text-indigo-400 font-bold">{altitudM} m</span>
            </label>
            <input
              type="number" min={1} max={2000} step={10}
              value={altitudM}
              onChange={(e) => onAltChange(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <input
              type="range" min={10} max={1000} step={5}
              value={altitudM}
              onChange={(e) => onAltChange(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              Ajustá hasta que los lotes coincidan verticalmente con la foto.
            </p>
          </div>

          {/* Orientación */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center justify-between">
              Orientación (rumbo)
              <span className="text-indigo-400 font-bold">{imageHeading}°</span>
            </label>
            <input
              type="number" min={0} max={359} step={1}
              value={imageHeading}
              onChange={(e) => onHeadingChange(((Number(e.target.value) % 360) + 360) % 360)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <input
              type="range" min={0} max={359} step={1}
              value={imageHeading}
              onChange={(e) => onHeadingChange(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              Dirección (brújula) hacia la que apunta el centro de la imagen. 0 = Norte.
            </p>
          </div>

          {/* Desplazamiento */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Posición — desplazamiento
            </label>
            <p className="text-[11px] text-slate-500">
              Mové el plano si los lotes aparecen corridos. Cada flecha = {MOVE_STEP} m.
            </p>

            {/* N/S display + flechas verticales */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 w-24">
                N/S: <span className="text-indigo-400 font-bold">{sign(Math.round(latOffset))} m</span>
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onLatOffsetChange(latOffset + MOVE_STEP)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors"
                  title="Mover Norte"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onLatOffsetChange(latOffset - MOVE_STEP)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors"
                  title="Mover Sur"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* E/O display + flechas horizontales */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 w-24">
                E/O: <span className="text-indigo-400 font-bold">{sign(Math.round(lngOffset))} m</span>
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onLngOffsetChange(lngOffset - MOVE_STEP)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors"
                  title="Mover Oeste"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onLngOffsetChange(lngOffset + MOVE_STEP)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors"
                  title="Mover Este"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reset offset */}
            {(latOffset !== 0 || lngOffset !== 0) && (
              <button
                onClick={() => { onLatOffsetChange(0); onLngOffsetChange(0); }}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Resetear posición
              </button>
            )}
          </div>

          {/* Save */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              saved
                ? "bg-green-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <><Check className="w-4 h-4" /> Guardado</>
            ) : (
              "Guardar calibración"
            )}
          </button>
        </div>
      )}

      {/* Toolbar pill */}
      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1.5 shadow-xl">

        {/* Edit mode badge */}
        {isEditing && (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Pencil className="w-3 h-3" />
              Editando
            </div>
            <div className="w-px h-4 bg-white/10" />
          </>
        )}

        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
            showOverlay
              ? "bg-indigo-600 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          {showOverlay ? "Lotes ON" : "Lotes OFF"}
        </button>

        <div className="w-px h-4 bg-white/10" />

        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
            expanded
              ? "bg-white/10 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Calibrar
          {expanded
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
          }
        </button>
      </div>
    </div>
  );
}
