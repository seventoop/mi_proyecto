"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Save, Trash2, Eye, EyeOff,
  Pencil, Loader2, Layers,
  Building2, Trees, Dumbbell, Wrench, MoreHorizontal,
  SquareDashedBottom, Minus, Circle, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  InfraestructuraItem, InfraestructuraCategoria, InfraestructuraEstado,
  InfraestructuraGeometria, CATEGORIAS_INFRA, ESTADO_INFRA_CONFIG,
  getInfraCategoryColor,
} from "@/types/infraestructura";

// ─── Category icon map ────────────────────────────────────────────────────────
const CATEGORIA_ICONS: Record<InfraestructuraCategoria, React.ReactNode> = {
  vialidad: <Minus className="w-3.5 h-3.5" />,
  areas_verdes: <Trees className="w-3.5 h-3.5" />,
  deportivo: <Dumbbell className="w-3.5 h-3.5" />,
  edificaciones: <Building2 className="w-3.5 h-3.5" />,
  servicios: <Wrench className="w-3.5 h-3.5" />,
  otro: <MoreHorizontal className="w-3.5 h-3.5" />,
};

const GEOMETRIA_ICONS: Record<InfraestructuraGeometria, React.ReactNode> = {
  poligono: <SquareDashedBottom className="w-4 h-4" />,
  linea: <Minus className="w-4 h-4" />,
  punto: <Circle className="w-4 h-4" />,
};

// ─── Haversine distance between two coords (km) ─────────────────────────────
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Shoelace area in m² (approximate, works for small polygons)
function polygonAreaM2(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][1] * coords[j][0];
    area -= coords[j][1] * coords[i][0];
  }
  return Math.abs(area) * 0.5 * 111320 * 111320; // crude lat/lng to m²
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface InfraestructuraToolProps {
  proyectoId: string;
  map: any; // Leaflet map instance (passed when ready)
}

// ─── Default form state ───────────────────────────────────────────────────────
const DEFAULT_FORM = {
  nombre: "",
  categoria: "vialidad" as InfraestructuraCategoria,
  tipo: "calle_principal",
  geometriaTipo: "linea" as InfraestructuraGeometria,
  estado: "planificado" as InfraestructuraEstado,
  descripcion: "",
  fechaEstimadaFin: "",
  porcentajeAvance: 0,
  colorPersonalizado: "#94a3b8",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function InfraestructuraTool({ proyectoId, map }: InfraestructuraToolProps) {
  const { data: session } = useSession();
  const canMutate = ["ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(session?.user?.role || "");

  // Panel open/close
  const [isOpen, setIsOpen] = useState(false);
  // Drawing mode
  const [drawingMode, setDrawingMode] = useState<InfraestructuraGeometria | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  // List of existing infrastructure items
  const [items, setItems] = useState<InfraestructuraItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Form for creating / editing
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [isSaving, setIsSaving] = useState(false);
  // Selected item (detail panel)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Layer visibility per category
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(Object.keys(CATEGORIAS_INFRA))
  );

  // Leaflet refs for drawn layers
  const layersRef = useRef<Map<string, any>>(new Map()); // itemId → L.layer
  const tempLayersRef = useRef<any[]>([]); // temporary drawing layers
  const previewPolyRef = useRef<any>(null); // preview polyline while drawing
  const drawingPointsRef = useRef<[number, number][]>([]); // always-current drawing points

  // ─── Load items on open ──────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!proyectoId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/infraestructura`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      toast.error("Error cargando infraestructura");
    } finally {
      setIsLoading(false);
    }
  }, [proyectoId]);

  // Load on mount so layers always render from DB on page load (not just when panel opens)
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ─── Render items as Leaflet layers ─────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    const renderItems = async () => {
      const L = (await import("leaflet")).default;

      // Remove old layers
      layersRef.current.forEach((layer) => {
        try { map.removeLayer(layer); } catch {}
      });
      layersRef.current.clear();

      for (const item of items) {
        if (!visibleCategories.has(item.categoria)) continue;
        const coords = item.coordenadas;
        if (!coords || coords.length === 0) continue;

        const estadoCfg = ESTADO_INFRA_CONFIG[item.estado] || ESTADO_INFRA_CONFIG.planificado;
        const color = item.colorPersonalizado || estadoCfg.color;
        const dashArray = estadoCfg.dashArray || "";

        let layer: any;

        if (item.geometriaTipo === "poligono" && coords.length >= 3) {
          layer = L.polygon(coords as any, {
            color,
            fillColor: color,
            fillOpacity: item.visible ? 0.3 : 0,
            weight: 2,
            opacity: item.visible ? 0.9 : 0.3,
            dashArray,
          });
        } else if (item.geometriaTipo === "linea" && coords.length >= 2) {
          layer = L.polyline(coords as any, {
            color,
            weight: 4,
            opacity: item.visible ? 0.9 : 0.3,
            dashArray,
          });
        } else if (item.geometriaTipo === "punto" && coords.length >= 1) {
          layer = L.circleMarker(coords[0] as any, {
            radius: 8,
            color,
            fillColor: color,
            fillOpacity: item.visible ? 0.8 : 0.2,
            weight: 2,
            opacity: item.visible ? 1 : 0.3,
          });
        }

        if (!layer) continue;

        // Tooltip
        layer.bindTooltip(
          `<div style="font-family:Inter,sans-serif;padding:2px 0">
            <div style="font-weight:700;font-size:12px;color:${color}">${item.nombre}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">${CATEGORIAS_INFRA[item.categoria]?.tipos.find(t => t.value === item.tipo)?.label ?? item.tipo}</div>
            <div style="font-size:10px;color:#94a3b8">${estadoCfg.label}</div>
          </div>`,
          { sticky: true, direction: "top", className: "lot-tooltip" }
        );

        layer.on("click", () => {
          setSelectedId(item.id);
          if (!isOpen) setIsOpen(true);
        });

        layer.addTo(map);
        layersRef.current.set(item.id, layer);
      }
    };

    renderItems();

    return () => {
      layersRef.current.forEach((layer) => {
        try { map.removeLayer(layer); } catch {}
      });
      layersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, items, visibleCategories]);

  // ─── Drawing logic ────────────────────────────────────────────────────────────
  const clearTempLayers = useCallback(() => {
    tempLayersRef.current.forEach((l) => { try { map?.removeLayer(l); } catch {} });
    tempLayersRef.current = [];
    if (previewPolyRef.current) {
      try { map?.removeLayer(previewPolyRef.current); } catch {}
      previewPolyRef.current = null;
    }
  }, [map]);

  const startDrawing = useCallback((mode: InfraestructuraGeometria) => {
    if (!map) return;
    drawingPointsRef.current = [];
    setDrawingMode(mode);
    setDrawingPoints([]);
    clearTempLayers();
    map.getContainer().style.cursor = "crosshair";
  }, [map, clearTempLayers]);

  const cancelDrawing = useCallback(() => {
    if (!map) return;
    drawingPointsRef.current = [];
    setDrawingMode(null);
    setDrawingPoints([]);
    clearTempLayers();
    map.getContainer().style.cursor = "";
  }, [map, clearTempLayers]);

  // Map click handler for drawing
  useEffect(() => {
    if (!map || !drawingMode) return;

    const onClick = async (e: any) => {
      const L = (await import("leaflet")).default;
      const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
      const next: [number, number][] = [...drawingPointsRef.current, newPt];
      drawingPointsRef.current = next;

      // Update visual feedback (DOM side effects outside updater)
      clearTempLayers();
      next.forEach((pt) => {
        const m = L.circleMarker(pt as any, {
          radius: 5, color: "#f97316", fillColor: "#f97316", fillOpacity: 1, weight: 2,
        });
        m.addTo(map);
        tempLayersRef.current.push(m);
      });

      if (next.length >= 2 && drawingMode !== "punto") {
        const poly = drawingMode === "poligono"
          ? L.polygon(next as any, { color: "#f97316", fillColor: "#f97316", fillOpacity: 0.15, weight: 2, dashArray: "4 2" })
          : L.polyline(next as any, { color: "#f97316", weight: 3, dashArray: "4 2" });
        poly.addTo(map);
        previewPolyRef.current = poly;
      }

      // For punto: single click = complete
      if (drawingMode === "punto") {
        finishDrawing(next);
      } else {
        setDrawingPoints(next);
      }
    };

    const onDblClick = (e: any) => {
      e.originalEvent?.preventDefault();
      e.originalEvent?.stopPropagation();
      if (drawingPointsRef.current.length >= 2) {
        finishDrawing(drawingPointsRef.current);
      }
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    map.doubleClickZoom.disable();

    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      map.doubleClickZoom.enable();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, drawingMode]);

  const finishDrawing = useCallback((points: [number, number][]) => {
    if (points.length === 0) return;
    clearTempLayers();
    if (map?.getContainer?.()) map.getContainer().style.cursor = "";
    drawingPointsRef.current = points;
    setDrawingMode(null);
    setDrawingPoints(points);
    setShowForm(true);
    setEditingId(null);
  }, [clearTempLayers, map]);

  // ─── Form helpers ─────────────────────────────────────────────────────────────
  const handleCategoriaChange = (cat: InfraestructuraCategoria) => {
    const firstTipo = CATEGORIAS_INFRA[cat].tipos[0];
    setForm((f) => ({
      ...f,
      categoria: cat,
      tipo: firstTipo.value,
      geometriaTipo: firstTipo.geometriaDefault,
    }));
  };

  const handleTipoChange = (tipoValue: string) => {
    const cat = CATEGORIAS_INFRA[form.categoria];
    const t = cat?.tipos.find((x) => x.value === tipoValue);
    setForm((f) => ({
      ...f,
      tipo: tipoValue,
      geometriaTipo: t?.geometriaDefault ?? f.geometriaTipo,
    }));
  };

  // ─── Save item ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (drawingPoints.length === 0 && !editingId) {
      toast.error("Dibujá el elemento en el mapa primero"); return;
    }
    setIsSaving(true);
    try {
      const body: any = {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        tipo: form.tipo,
        geometriaTipo: form.geometriaTipo,
        estado: form.estado,
        descripcion: form.descripcion || null,
        fechaEstimadaFin: form.fechaEstimadaFin || null,
        porcentajeAvance: form.porcentajeAvance,
        colorPersonalizado: form.categoria === "otro" ? form.colorPersonalizado : null,
      };

      if (!editingId) {
        body.coordenadas = drawingPoints;
        // Auto-calc
        if (form.geometriaTipo === "poligono" && drawingPoints.length >= 3) {
          body.superficie = Math.round(polygonAreaM2(drawingPoints));
        }
        if (form.geometriaTipo === "linea" && drawingPoints.length >= 2) {
          let totalKm = 0;
          for (let i = 1; i < drawingPoints.length; i++) {
            totalKm += haversineKm(drawingPoints[i - 1], drawingPoints[i]);
          }
          body.longitudM = Math.round(totalKm * 1000);
        }

        const res = await fetch(`/api/proyectos/${proyectoId}/infraestructura`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Error al crear");
        const data = await res.json();
        setItems((prev) => [...prev, data.item]);
        toast.success("Infraestructura creada");
      } else {
        const res = await fetch(`/api/infraestructura/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Error al actualizar");
        const data = await res.json();
        setItems((prev) => prev.map((it) => (it.id === editingId ? data.item : it)));
        toast.success("Infraestructura actualizada");
      }

      setShowForm(false);
      setEditingId(null);
      setDrawingPoints([]);
      setForm({ ...DEFAULT_FORM });
    } catch {
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Edit existing ────────────────────────────────────────────────────────────
  const handleEdit = (item: InfraestructuraItem) => {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      categoria: item.categoria,
      tipo: item.tipo,
      geometriaTipo: item.geometriaTipo,
      estado: item.estado,
      descripcion: item.descripcion || "",
      fechaEstimadaFin: item.fechaEstimadaFin
        ? new Date(item.fechaEstimadaFin).toISOString().split("T")[0]
        : "",
      porcentajeAvance: item.porcentajeAvance,
      colorPersonalizado: item.colorPersonalizado || "#94a3b8",
    });
    setDrawingPoints(item.coordenadas);
    setShowForm(true);
    setSelectedId(null);
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    try {
      await fetch(`/api/infraestructura/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Elemento eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  // ─── Toggle visibility ────────────────────────────────────────────────────────
  const toggleVisibility = async (item: InfraestructuraItem) => {
    try {
      const res = await fetch(`/api/infraestructura/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !item.visible }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => prev.map((it) => (it.id === item.id ? data.item : it)));
      }
    } catch {}
  };

  const toggleCategoryVisibility = (cat: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectedItem = items.find((it) => it.id === selectedId) || null;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toolbar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Infraestructura y Amenities"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap",
          isOpen
            ? "bg-violet-500 text-white border-transparent"
            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
        )}
      >
        <Layers className="w-3.5 h-3.5" />
        Infraestructura
        {items.length > 0 && (
          <span className={cn(
            "ml-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full",
            isOpen ? "bg-white/20 text-white" : "bg-violet-500/20 text-violet-400"
          )}>
            {items.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute top-0 right-0 bottom-0 z-[1100] w-80 bg-slate-950/95 backdrop-blur-sm border-l border-slate-700/60 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-violet-500/20 rounded-lg">
                  <Layers className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Infraestructura</h3>
                  <p className="text-[10px] text-slate-400">{items.length} elementos</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!showForm && !drawingMode && canMutate && (
                  <button
                    onClick={() => { setShowForm(true); setEditingId(null); setDrawingPoints([]); setForm({ ...DEFAULT_FORM }); setSelectedId(null); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                )}
                <button
                  onClick={() => { setIsOpen(false); cancelDrawing(); setShowForm(false); setSelectedId(null); }}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* ─── Drawing mode active ─── */}
              {drawingMode && (
                <div className="m-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-orange-400">
                      Modo dibujo activo —{" "}
                      {drawingMode === "poligono" ? "polígono" : drawingMode === "linea" ? "línea" : "punto"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2.5">
                    {drawingMode === "punto"
                      ? "Hacé clic en el mapa para colocar el punto."
                      : "Hacé clic para agregar puntos. Doble clic para terminar."}
                  </p>
                  <p className="text-[10px] text-slate-500 mb-3">
                    {drawingPoints.length} punto{drawingPoints.length !== 1 ? "s" : ""} colocado{drawingPoints.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2">
                    {drawingMode !== "punto" && drawingPoints.length >= 2 && (
                      <button
                        onClick={() => finishDrawing(drawingPointsRef.current)}
                        className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Terminar
                      </button>
                    )}
                    <button
                      onClick={cancelDrawing}
                      className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Create/Edit Form ─── */}
              {showForm && !drawingMode && (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white mb-1">
                        {editingId ? "Editar elemento" : "Nuevo elemento"}
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowForm(false); setEditingId(null); setDrawingPoints([]); cancelDrawing(); }}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Draw geometry buttons (only for new items) */}
                  {!editingId && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        1. Dibujar en el mapa
                      </p>
                      {drawingPoints.length > 0 ? (
                        <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <p className="text-xs text-emerald-400">
                            {drawingPoints.length} punto{drawingPoints.length !== 1 ? "s" : ""} dibujados
                          </p>
                          <button
                            onClick={() => { setDrawingPoints([]); }}
                            className="ml-auto text-[10px] text-slate-500 hover:text-rose-400"
                          >
                            Redibujar
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["poligono", "linea", "punto"] as InfraestructuraGeometria[]).map((g) => (
                            <button
                              key={g}
                              onClick={() => startDrawing(g)}
                              className="flex flex-col items-center gap-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500 rounded-lg transition-all text-slate-300 hover:text-white"
                            >
                              {GEOMETRIA_ICONS[g]}
                              <span className="text-[9px] font-semibold capitalize">{g}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      {!editingId ? "2. " : ""}Nombre
                    </label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      placeholder="ej: Calle Los Álamos, Plaza Central..."
                      className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-lg text-white placeholder-slate-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                      Categoría
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(Object.keys(CATEGORIAS_INFRA) as InfraestructuraCategoria[]).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleCategoriaChange(cat)}
                          className={cn(
                            "flex flex-col items-center gap-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all",
                            form.categoria === cat
                              ? "bg-violet-500/20 border-violet-500 text-violet-300"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          <span>{CATEGORIAS_INFRA[cat].icon}</span>
                          <span className="truncate w-full text-center px-1">
                            {CATEGORIAS_INFRA[cat].label.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Tipo
                    </label>
                    <select
                      value={form.tipo}
                      onChange={(e) => handleTipoChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-lg text-white outline-none transition-colors"
                    >
                      {CATEGORIAS_INFRA[form.categoria].tipos.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom color for "otro" */}
                  {form.categoria === "otro" && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.colorPersonalizado}
                          onChange={(e) => setForm((f) => ({ ...f, colorPersonalizado: e.target.value }))}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-700 bg-transparent"
                        />
                        <span className="text-xs text-slate-400 font-mono">{form.colorPersonalizado}</span>
                      </div>
                    </div>
                  )}

                  {/* Estado */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                      Estado
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(ESTADO_INFRA_CONFIG) as InfraestructuraEstado[]).map((est) => (
                        <button
                          key={est}
                          onClick={() => setForm((f) => ({ ...f, estado: est }))}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                            form.estado === est
                              ? "bg-slate-600 border-slate-500 text-white"
                              : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600"
                          )}
                          style={form.estado === est ? { borderColor: ESTADO_INFRA_CONFIG[est].color, color: ESTADO_INFRA_CONFIG[est].color } : {}}
                        >
                          {ESTADO_INFRA_CONFIG[est].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Avance */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Avance — {form.porcentajeAvance}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={form.porcentajeAvance}
                      onChange={(e) => setForm((f) => ({ ...f, porcentajeAvance: Number(e.target.value) }))}
                      className="w-full accent-violet-500"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={form.descripcion}
                      onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                      rows={2}
                      placeholder="Detalles del elemento..."
                      className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-lg text-white placeholder-slate-500 outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Fecha estimada */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Fecha estimada de finalización
                    </label>
                    <input
                      type="date"
                      value={form.fechaEstimadaFin}
                      onChange={(e) => setForm((f) => ({ ...f, fechaEstimadaFin: e.target.value }))}
                      className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-lg text-white outline-none transition-colors"
                    />
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || (!editingId && drawingPoints.length === 0) || !form.nombre.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {editingId ? "Actualizar" : "Guardar"}
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setEditingId(null); setDrawingPoints([]); cancelDrawing(); }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Selected item detail ─── */}
              {selectedItem && !showForm && !drawingMode && (
                <div className="p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedItem.nombre}</h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${getInfraCategoryColor(selectedItem.categoria, selectedItem.tipo)}20`, color: getInfraCategoryColor(selectedItem.categoria, selectedItem.tipo) }}>
                          {CATEGORIAS_INFRA[selectedItem.categoria]?.tipos.find(t => t.value === selectedItem.tipo)?.label ?? selectedItem.tipo}
                        </span>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ESTADO_INFRA_CONFIG[selectedItem.estado]?.bgColor)}>
                          {ESTADO_INFRA_CONFIG[selectedItem.estado]?.label}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-slate-800 text-slate-400 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.superficie != null && (
                      <div className="p-2.5 bg-slate-800/60 rounded-xl">
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Superficie</p>
                        <p className="text-sm font-bold text-white mt-0.5">{selectedItem.superficie.toLocaleString()} m²</p>
                      </div>
                    )}
                    {selectedItem.longitudM != null && (
                      <div className="p-2.5 bg-slate-800/60 rounded-xl">
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Longitud</p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {selectedItem.longitudM >= 1000
                            ? `${(selectedItem.longitudM / 1000).toFixed(2)} km`
                            : `${selectedItem.longitudM} m`}
                        </p>
                      </div>
                    )}
                    <div className="p-2.5 bg-slate-800/60 rounded-xl">
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Avance</p>
                      <p className="text-sm font-bold text-white mt-0.5">{selectedItem.porcentajeAvance}%</p>
                      <div className="w-full h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${selectedItem.porcentajeAvance}%` }} />
                      </div>
                    </div>
                    {selectedItem.fechaEstimadaFin && (
                      <div className="p-2.5 bg-slate-800/60 rounded-xl">
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Finalización</p>
                        <p className="text-xs font-bold text-white mt-0.5">
                          {new Date(selectedItem.fechaEstimadaFin).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedItem.descripcion && (
                    <p className="text-xs text-slate-400 leading-relaxed">{selectedItem.descripcion}</p>
                  )}

                  {canMutate && (
                    <>
                      {/* Estado selector */}
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cambiar estado</p>
                        <div className="flex flex-wrap gap-1">
                          {(Object.keys(ESTADO_INFRA_CONFIG) as InfraestructuraEstado[]).map((est) => (
                            <button
                              key={est}
                              onClick={async () => {
                                const res = await fetch(`/api/infraestructura/${selectedItem.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ estado: est }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setItems((prev) => prev.map((it) => (it.id === selectedItem.id ? data.item : it)));
                                  toast.success("Estado actualizado");
                                }
                              }}
                              className={cn(
                                "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                                selectedItem.estado === est
                                  ? "text-white"
                                  : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600"
                              )}
                              style={selectedItem.estado === est
                                ? { backgroundColor: `${ESTADO_INFRA_CONFIG[est].color}30`, borderColor: ESTADO_INFRA_CONFIG[est].color, color: ESTADO_INFRA_CONFIG[est].color }
                                : {}}
                            >
                              {ESTADO_INFRA_CONFIG[est].label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(selectedItem)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => toggleVisibility(selectedItem)}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                        >
                          {selectedItem.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(selectedItem.id)}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition-colors border border-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── Items list ─── */}
              {!showForm && !drawingMode && !selectedItem && (
                <div className="p-3 space-y-3">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs py-4 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cargando...
                    </div>
                  )}

                  {!isLoading && items.length === 0 && (
                    <div className="text-center py-8">
                      <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-xs text-slate-500">No hay infraestructura aún.</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Hacé clic en <strong>Agregar</strong> para dibujar el primer elemento.
                      </p>
                    </div>
                  )}

                  {/* Category toggles */}
                  {items.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Capas</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(Object.keys(CATEGORIAS_INFRA) as InfraestructuraCategoria[]).filter(
                          cat => items.some(it => it.categoria === cat)
                        ).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => toggleCategoryVisibility(cat)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                              visibleCategories.has(cat)
                                ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                                : "bg-slate-800 border-slate-700 text-slate-500"
                            )}
                          >
                            {CATEGORIAS_INFRA[cat].icon}
                            {CATEGORIAS_INFRA[cat].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items grouped by category */}
                  {(Object.keys(CATEGORIAS_INFRA) as InfraestructuraCategoria[]).map((cat) => {
                    const catItems = items.filter((it) => it.categoria === cat);
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                          {CATEGORIAS_INFRA[cat].icon} {CATEGORIAS_INFRA[cat].label}
                          <span className="text-slate-700">({catItems.length})</span>
                        </p>
                        <div className="space-y-1">
                          {catItems.map((item) => {
                            const color = item.colorPersonalizado || getInfraCategoryColor(item.categoria, item.tipo);
                            const estadoCfg = ESTADO_INFRA_CONFIG[item.estado];
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 cursor-pointer group transition-colors border border-transparent hover:border-slate-700"
                                onClick={() => { setSelectedId(item.id); }}
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">{item.nombre}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-slate-500">
                                      {CATEGORIAS_INFRA[item.categoria]?.tipos.find(t => t.value === item.tipo)?.label ?? item.tipo}
                                    </span>
                                    <span className="text-[9px]" style={{ color: estadoCfg?.color }}>
                                      · {estadoCfg?.label}
                                    </span>
                                  </div>
                                </div>
                                {canMutate && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleVisibility(item); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded-lg text-slate-400 transition-all"
                                  >
                                    {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
