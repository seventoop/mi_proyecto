"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, X, Upload, Trash2, Pencil, Loader2,
  Check, ImageIcon, Globe, PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMasterplanStore } from "@/lib/masterplan-store";
import { ImagenMapaItem, ImagenMapaTipo, IMAGEN_TIPO_CONFIG } from "@/types/imagen-mapa";
import { SvgViewBox } from "@/lib/geo-projection";
import dynamic from "next/dynamic";

const ImagenViewer = dynamic(() => import("./imagen-viewer"), { ssr: false });

// ─── Props ───────────────────────────────────────────────────────────────────
interface ImagenesMapaToolProps {
  proyectoId: string;
  map: any; // Leaflet map instance
  // Overlay data for 360° lot projection
  overlayBounds?: [[number, number], [number, number]] | null;
  overlayRotation?: number;
  svgViewBox?: SvgViewBox | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Default form ─────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  titulo: "",
  tipo: "foto" as ImagenMapaTipo,
  unidadId: "",
  altitudM: 500,
  imageHeading: 0,
};

// ─── Custom marker HTML ───────────────────────────────────────────────────────
function markerHtml(color: string, emoji: string) {
  return `
    <div style="
      width:36px;height:36px;border-radius:50%;
      background:${color};
      border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;cursor:pointer;
    ">${emoji}</div>
  `;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ImagenesMapaTool({
  proyectoId, map,
  overlayBounds = null, overlayRotation = 0, svgViewBox = null,
  isOpen, onOpenChange,
}: ImagenesMapaToolProps) {
  const { units } = useMasterplanStore();
  const [items, setItems] = useState<ImagenMapaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Upload + positioning flow
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "positioning" | "saving">("idle");
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingTipo, setPendingTipo] = useState<ImagenMapaTipo>("foto");
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null);

  // Form for confirming details after positioning
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Detail / viewer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewerItem, setViewerItem] = useState<ImagenMapaItem | null>(null);

  // Leaflet refs
  const markersRef = useRef<Map<string, any>>(new Map());
  const positionCursorRef = useRef<any>(null);
  const clickHandlerRef = useRef<((e: any) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load items ──────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/imagenes-mapa`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      toast.error("Error cargando imágenes");
    } finally {
      setIsLoading(false);
    }
  }, [proyectoId]);

  // Load on mount so markers always render from DB on page load (not just when panel opens)
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ── Sync markers on map ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    const addMarkers = async () => {
      const L = (await import("leaflet")).default;

      // Remove stale markers
      markersRef.current.forEach((marker, id) => {
        if (!items.find((it) => it.id === id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });

      // Add / update markers
      items.forEach((item) => {
        if (markersRef.current.has(item.id)) return; // already on map

        const cfg = IMAGEN_TIPO_CONFIG[item.tipo] || IMAGEN_TIPO_CONFIG.foto;
        const icon = L.divIcon({
          html: markerHtml(cfg.color, cfg.emoji),
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([item.lat, item.lng], { icon });
        marker.bindTooltip(item.titulo || `Imagen ${cfg.label}`, {
          direction: "top",
          offset: [0, -20],
          className: "lot-tooltip",
        });
        marker.on("click", () => {
          setSelectedId(item.id);
          onOpenChange(true);
        });
        marker.addTo(map);
        markersRef.current.set(item.id, marker);
      });
    };

    addMarkers();
  }, [items, map]);

  // ── Cleanup all markers on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      cancelPositioning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Positioning mode ─────────────────────────────────────────────────────────
  const startPositioning = useCallback(
    async (url: string, tipo: ImagenMapaTipo) => {
      if (!map) return;
      const L = (await import("leaflet")).default;

      setPendingUrl(url);
      setPendingTipo(tipo);
      setUploadState("positioning");

      // Change cursor
      map.getContainer().style.cursor = "crosshair";

      const handleClick = (e: any) => {
        const { lat, lng } = e.latlng;
        setPendingPos({ lat, lng });

        // Show a preview marker at click position
        if (positionCursorRef.current) positionCursorRef.current.remove();
        const cfg = IMAGEN_TIPO_CONFIG[tipo];
        const icon = L.divIcon({
          html: markerHtml(cfg.color, cfg.emoji),
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        positionCursorRef.current = L.marker([lat, lng], { icon }).addTo(map);

        setUploadState("saving");
        setForm({ ...DEFAULT_FORM, tipo });
        setShowForm(true);

        // Remove click listener
        map.off("click", handleClick);
        map.getContainer().style.cursor = "";
        clickHandlerRef.current = null;
      };

      clickHandlerRef.current = handleClick;
      map.on("click", handleClick);
    },
    [map]
  );

  const cancelPositioning = useCallback(() => {
    if (!map) return;
    if (clickHandlerRef.current) {
      map.off("click", clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    if (positionCursorRef.current) {
      positionCursorRef.current.remove();
      positionCursorRef.current = null;
    }
    map.getContainer().style.cursor = "";
    setPendingUrl(null);
    setPendingPos(null);
    setUploadState("idle");
    setShowForm(false);
    setEditingId(null);
  }, [map]);

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadState("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", proyectoId);

      // Use /api/upload/360 for 360° images, /api/upload for others
      const endpoint = pendingTipo === "360" ? "/api/upload/360" : "/api/upload/360";
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al subir");
      }

      toast.success("Imagen subida. Hacé clic en el mapa para posicionarla.");
      await startPositioning(data.url, pendingTipo);
    } catch (err: any) {
      toast.error(err.message || "Error al subir la imagen");
      setUploadState("idle");
    }
  };

  // ── Save (create) ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!pendingUrl || !pendingPos) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/imagenes-mapa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: pendingUrl,
          tipo: form.tipo,
          titulo: form.titulo || null,
          lat: pendingPos.lat,
          lng: pendingPos.lng,
          unidadId: form.unidadId || null,
          altitudM: form.altitudM,
          imageHeading: form.imageHeading,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      toast.success("Imagen guardada");
      setItems((prev) => [...prev, data.item]);
      setSelectedId(data.item.id);
      cancelPositioning();
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update existing ────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/imagenes-mapa/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo || null,
          tipo: form.tipo,
          unidadId: form.unidadId || null,
          altitudM: form.altitudM,
          imageHeading: form.imageHeading,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");

      toast.success("Imagen actualizada");
      setItems((prev) => prev.map((it) => (it.id === editingId ? data.item : it)));
      setShowForm(false);
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta imagen del mapa?")) return;
    try {
      const res = await fetch(`/api/imagenes-mapa/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");

      // Remove marker
      const marker = markersRef.current.get(id);
      if (marker) { marker.remove(); markersRef.current.delete(id); }

      setItems((prev) => prev.filter((it) => it.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Imagen eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  // ── Open edit form ─────────────────────────────────────────────────────────
  const openEditForm = (item: ImagenMapaItem) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo || "",
      tipo: item.tipo,
      unidadId: item.unidadId || "",
      altitudM: item.altitudM ?? 500,
      imageHeading: item.imageHeading ?? 0,
    });
    setShowForm(true);
  };

  const selectedItem = items.find((it) => it.id === selectedId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toolbar button */}
      <button
        onClick={() => onOpenChange(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap",
          isOpen
            ? "bg-indigo-500 text-white border-transparent"
            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
        )}
        title="Imágenes del mapa"
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Imágenes</span>
        {items.length > 0 && (
          <span className={cn(
            "ml-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full",
            isOpen ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-400"
          )}>
            {items.length}
          </span>
        )}
      </button>

      {/* Positioning mode overlay hint */}
      <AnimatePresence>
        {uploadState === "positioning" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 pointer-events-none"
          >
            <span className="animate-pulse">●</span>
            Hacé clic en el mapa para posicionar la imagen
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute top-0 right-0 bottom-0 z-40 w-72 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 flex flex-col shadow-2xl"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onOpenChange(false); cancelPositioning(); }}
                  className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white -ml-1 mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Imágenes</span>
                {items.length > 0 && (
                  <span className="text-xs text-slate-400">({items.length})</span>
                )}
              </div>
            </div>

            {/* Upload section */}
            {uploadState === "idle" && (
              <div className="px-4 py-3 border-b border-slate-700/50 flex-shrink-0 space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Tipo de imagen a subir
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(["foto", "360", "panoramica"] as ImagenMapaTipo[]).map((t) => {
                    const cfg = IMAGEN_TIPO_CONFIG[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setPendingTipo(t)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all border",
                          pendingTipo === t
                            ? "border-indigo-500 bg-indigo-500/20 text-white"
                            : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500"
                        )}
                      >
                        <span className="text-base">{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Subir imagen
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Uploading spinner */}
            {uploadState === "uploading" && (
              <div className="px-4 py-4 border-b border-slate-700/50 flex items-center gap-3 flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-sm text-slate-300">Subiendo imagen...</span>
              </div>
            )}

            {/* Positioning hint in panel */}
            {uploadState === "positioning" && (
              <div className="px-4 py-4 border-b border-slate-700/50 flex-shrink-0 space-y-2">
                <p className="text-sm text-indigo-300 font-medium flex items-center gap-2">
                  <span className="animate-pulse text-indigo-400">●</span>
                  Hacé clic en el mapa
                </p>
                <p className="text-xs text-slate-400">
                  Elegí la ubicación donde se tomó la fotografía.
                </p>
                <button
                  onClick={cancelPositioning}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
              </div>
            )}

            {/* Save form (after positioning) */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 border-b border-slate-700/50 flex-shrink-0 space-y-3 overflow-hidden"
                >
                  <p className="text-xs font-semibold text-white">
                    {editingId ? "Editar imagen" : "Confirmar imagen"}
                  </p>

                  {/* Título */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide">
                      Título (opcional)
                    </label>
                    <input
                      value={form.titulo}
                      onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ej: Vista desde el acceso principal"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Tipo */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide">
                      Tipo
                    </label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ImagenMapaTipo }))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {(Object.entries(IMAGEN_TIPO_CONFIG) as [ImagenMapaTipo, any][]).map(
                        ([key, cfg]) => (
                          <option key={key} value={key}>
                            {cfg.emoji} {cfg.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Vincular a unidad */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wide">
                      Vincular a lote (opcional)
                    </label>
                    <select
                      value={form.unidadId}
                      onChange={(e) => setForm((f) => ({ ...f, unidadId: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">— Sin vincular —</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          Lote {u.numero}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 360°-only: altitude + heading */}
                  {form.tipo === "360" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center justify-between">
                          Altitud del dron (m)
                          <span className="text-indigo-400 font-bold">{form.altitudM} m</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          step={10}
                          value={form.altitudM}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, altitudM: Math.max(1, Number(e.target.value)) }))
                          }
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-500">
                          Altura de vuelo del dron al tomar la foto.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center justify-between">
                          Orientación / Rumbo (°)
                          <span className="text-indigo-400 font-bold">{form.imageHeading}°</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={359}
                          step={1}
                          value={form.imageHeading}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              imageHeading: ((Number(e.target.value) % 360) + 360) % 360,
                            }))
                          }
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-500">
                          Dirección hacia la que apunta el centro de la imagen. 0 = Norte.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={editingId ? handleUpdate : handleSave}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {editingId ? "Actualizar" : "Guardar"}
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        if (!editingId) cancelPositioning();
                        setEditingId(null);
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                  <p className="text-sm text-slate-500">No hay imágenes aún</p>
                  <p className="text-xs text-slate-600">
                    Subí una imagen y hacé clic en el mapa para posicionarla.
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {items.map((item) => {
                    const cfg = IMAGEN_TIPO_CONFIG[item.tipo] || IMAGEN_TIPO_CONFIG.foto;
                    const isSelected = selectedId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(isSelected ? null : item.id)}
                        className={cn(
                          "group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border",
                          isSelected
                            ? "bg-indigo-500/20 border-indigo-500/50"
                            : "bg-slate-800/50 border-transparent hover:bg-slate-800"
                        )}
                      >
                        {/* Thumbnail */}
                        <div
                          className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-slate-700 flex items-center justify-center"
                        >
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {item.titulo || `${cfg.emoji} ${cfg.label}`}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {cfg.label}
                            {item.unidad && ` · Lote ${item.unidad.numero}`}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewerItem(item); }}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                            title="Ver imagen"
                          >
                            <PanelRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditForm(item); }}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail panel for selected item */}
            <AnimatePresence>
              {selectedItem && !showForm && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 350 }}
                  className="border-t border-slate-700/50 bg-slate-800/80 px-4 py-3 flex-shrink-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                      {selectedItem.titulo || "Sin título"}
                    </span>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="p-1 rounded-lg hover:bg-slate-700 text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5 mb-3">
                    <p>{IMAGEN_TIPO_CONFIG[selectedItem.tipo]?.label}</p>
                    {selectedItem.unidad && <p>Lote {selectedItem.unidad.numero}</p>}
                    <p className="font-mono">
                      {selectedItem.lat.toFixed(6)}, {selectedItem.lng.toFixed(6)}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewerItem(selectedItem)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {selectedItem.tipo === "360" ? "Ver en 360°" : "Ver imagen"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen viewer */}
      {viewerItem && (
        <ImagenViewer
          imagen={viewerItem}
          onClose={() => setViewerItem(null)}
          units={units}
          overlayBounds={overlayBounds}
          overlayRotation={overlayRotation}
          svgViewBox={svgViewBox}
        />
      )}
    </>
  );
}
