"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, Layers, Check, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pencil, Eye, Move } from "lucide-react";
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
  onCalibrationSaved?: (updates: Pick<ImagenMapaItem, "altitudM" | "imageHeading" | "latOffset" | "lngOffset" | "planRotation" | "planScale">) => void;
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
  const [planScale,     setPlanScale]     = useState<number>(imagen.planScale ?? 1);
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

  // ─── Arrow step: same heading-aware conversion as the mouse drag ─────────
  // screenDx / screenDy are unit screen-space vectors (+X = right, +Y = down).
  // stepM is the desired displacement in meters.
  // Reuses the exact same matrix as the drag's translate handler so arrows
  // and mouse produce identical plan movement for equal screen displacements.
  const arrowStepRef = useRef<(screenDx: number, screenDy: number, stepM: number) => void>(() => {});
  arrowStepRef.current = (screenDx: number, screenDy: number, stepM: number) => {
    const viewer = instanceRef.current;
    if (!viewer) return;
    const DEG = Math.PI / 180;
    const viewYaw = (() => { try { return viewer.getYaw() as number; } catch { return 0; } })();
    const effHdgRad = (overlayHdg + viewYaw) * DEG;
    // Same rotation matrix used by the drag translate handler
    const north_m = (screenDx * (-Math.sin(effHdgRad)) + screenDy * (-Math.cos(effHdgRad))) * stepM;
    const east_m  = (screenDx * ( Math.cos(effHdgRad)) + screenDy * (-Math.sin(effHdgRad))) * stepM;
    // Same sign convention: latOffset/lngOffset move camera, negate to move plan
    setLatOffset((v) => v - north_m);
    setLngOffset((v) => v - east_m);
  };

  // ─── Keyboard arrow keys when editing ───
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isEditingRef.current || !hasOverlayDataRef.current) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const stepM = e.shiftKey ? 25 : 5;
      if (e.key === "ArrowUp")    arrowStepRef.current( 0, -1, stepM);
      if (e.key === "ArrowDown")  arrowStepRef.current( 0, +1, stepM);
      if (e.key === "ArrowLeft")  arrowStepRef.current(-1,  0, stepM);
      if (e.key === "ArrowRight") arrowStepRef.current(+1,  0, stepM);
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
        body: JSON.stringify({ altitudM: overlayAlt, imageHeading: overlayHdg, latOffset, lngOffset, planRotation, planScale }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setCalibSaved(true);
      setTimeout(() => setCalibSaved(false), 2000);
      // Notify parent so it can refresh its items list (fixes stale data on reopen)
      onCalibrationSaved?.({ altitudM: overlayAlt, imageHeading: overlayHdg, latOffset, lngOffset, planRotation, planScale });
    } catch {
      toast.error("No se pudo guardar la calibración");
    } finally {
      setIsSavingCalib(false);
    }
  }, [imagen.id, overlayAlt, overlayHdg, latOffset, lngOffset, planRotation, planScale, onCalibrationSaved]);

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
                planScale={planScale}
                isEditing={isEditing}
                onEnterEdit={() => setIsEditing(true)}
                onExitEdit={() => setIsEditing(false)}
                onParamsChange={({ latOffset: lo, lngOffset: lng, camAlt, imageHeading, planRotation: pr, planScale: ps }) => {
                  setLatOffset(lo);
                  setLngOffset(lng);
                  setOverlayAlt(camAlt);
                  setOverlayHdg(imageHeading);
                  setPlanRotation(pr);
                  setPlanScale(ps);
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
                onArrowStep={(dx, dy) => arrowStepRef.current(dx, dy, 5)}
                planRotation={planRotation}
                onPlanRotChange={setPlanRotation}
                planScale={planScale}
                onPlanScaleChange={setPlanScale}
                onSave={saveCalibration}
                isSaving={isSavingCalib}
                saved={calibSaved}
                isEditing={isEditing}
                onEnterEdit={() => setIsEditing(true)}
                onExitEdit={() => setIsEditing(false)}
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
  onArrowStep: (screenDx: number, screenDy: number) => void;
  planRotation: number;
  onPlanRotChange: (v: number) => void;
  planScale: number;
  onPlanScaleChange: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
  saved: boolean;
  isEditing: boolean;
  onEnterEdit: () => void;
  onExitEdit: () => void;
}

function OverlayControls({
  showOverlay, onToggle,
  altitudM, onAltChange,
  imageHeading, onHeadingChange,
  latOffset, lngOffset,
  onLatOffsetChange, onLngOffsetChange,
  onArrowStep,
  planRotation, onPlanRotChange,
  planScale, onPlanScaleChange,
  onSave, isSaving, saved,
  isEditing, onEnterEdit, onExitEdit,
}: OverlayControlsProps) {
  const sign = (n: number) => n >= 0 ? `+${n}` : `${n}`;

  return (
    <>
      {/* ── Toolbar pill (Visible when NOT editing) ── */}
      {!isEditing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1.5 shadow-xl">
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
            onClick={onEnterEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar Overlay
          </button>
        </div>
      )}

      {/* ── Right Sidebar (Visible WHEN editing) ── */}
      {isEditing && (
        <div className="absolute top-16 right-4 bottom-24 w-80 bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-[9999] animate-in slide-in-from-right-8 pointer-events-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Pencil className="w-4 h-4 text-indigo-400" />
              Modo Edición
            </h3>
            <button
              onClick={onExitEdit}
              className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col gap-2">
            
            {/* 1. Calibración del Panorama */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Cámara 360
              </h4>
              
              <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  Altitud (Zoom Perspectiva)
                  <span className="text-indigo-400 font-bold">{altitudM} m</span>
                </label>
                <input
                  type="range" min={10} max={1000} step={5}
                  value={altitudM}
                  onChange={(e) => onAltChange(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  Orientación (Rumbo)
                  <span className="text-indigo-400 font-bold">{imageHeading}°</span>
                </label>
                <input
                  type="range" min={0} max={359} step={1}
                  value={imageHeading}
                  onChange={(e) => onHeadingChange(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            {/* 2. Edición del Plano */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Move className="w-3.5 h-3.5" /> Edición del Plano
              </h4>
              
              <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  Escala del plano
                  <span className="text-indigo-400 font-bold">{planScale.toFixed(2)}×</span>
                </label>
                <input
                  type="range" min={0.1} max={3} step={0.01}
                  value={planScale}
                  onChange={(e) => onPlanScaleChange(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mt-1 pt-2 border-t border-white/10">
                  Mover plano (Offset)
                </label>
                {/* N/S + E/O */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded-lg">
                    <button onClick={() => onArrowStep( 0, -1)} className="p-1 hover:text-indigo-400"><ArrowUp className="w-4 h-4" /></button>
                    <span className="text-[10px] text-slate-400 my-0.5">N/S {sign(Math.round(latOffset))}</span>
                    <button onClick={() => onArrowStep( 0, +1)} className="p-1 hover:text-indigo-400"><ArrowDown className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded-lg">
                    <button onClick={() => onArrowStep(+1,  0)} className="p-1 hover:text-indigo-400"><ArrowRight className="w-4 h-4" /></button>
                    <span className="text-[10px] text-slate-400 my-0.5">E/O {sign(Math.round(lngOffset))}</span>
                    <button onClick={() => onArrowStep(-1,  0)} className="p-1 hover:text-indigo-400"><ArrowLeft className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                    Girar plano
                    <span className="text-indigo-400 font-bold">{Math.round(planRotation)}°</span>
                  </label>
                  <input
                    type="range" min={-180} max={180} step={1}
                    value={planRotation}
                    onChange={(e) => onPlanRotChange(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Hint overlay */}
            <p className="text-[10px] leading-relaxed text-slate-500 text-center px-2">
              También puedes arrastrar el plano directamente o usar <b>Shift + Flechas</b> en tu teclado.
            </p>

          </div>

          {/* 3. Acciones (Footer) */}
          <div className="p-4 border-t border-white/10 bg-black/50 rounded-b-2xl space-y-2">
             <button
              onClick={onToggle}
              className="w-full flex items-center justify-center py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors border border-white/10 rounded-lg mb-2"
            >
              {showOverlay ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5 opacity-50" />}
              {showOverlay ? "Ocultar Lotes" : "Mostrar Lotes"}
            </button>

            <button
              onClick={onSave}
              disabled={isSaving}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                saved
                  ? "bg-green-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-500/25"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <><Check className="w-4 h-4" /> Guardado</>
              ) : (
                "Guardar Alineación"
              )}
            </button>
          </div>
          
        </div>
      )}
    </>
  );
}
