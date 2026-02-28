"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Map as MapIcon, Layers as LayersIcon, Filter, ZoomIn, ZoomOut, Maximize,
    Eye, EyeOff, Crosshair, X, ChevronRight, Image as ImageIcon, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useMasterplanStore,
    useFilteredUnits,
    MasterplanUnit,
} from "@/lib/masterplan-store";
import MasterplanSidePanel from "./masterplan-side-panel";
import MasterplanFilters from "./masterplan-filters";
import MasterplanComparator from "./masterplan-comparator";
import OverlayEditor, { OverlayConfig } from "./overlay-editor";
import Tour360Viewer from "./tour360-viewer";

// ─── Status colors ───
const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#f59e0b",
    RESERVADO: "#f97316",
    VENDIDO: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADO: "Reservado",
    VENDIDO: "Vendido",
};

// ─── Demo lot data with geographic coordinates ───
// Based on the "Ria" project near -33.094, -60.547
function generateGeoUnits(): MasterplanUnit[] {
    const etapas = [
        { id: "e1", nombre: "Etapa 1" },
        { id: "e2", nombre: "Etapa 2" },
    ];
    const manzanas = [
        { id: "m1", nombre: "Mza A", etapaId: "e1" },
        { id: "m2", nombre: "Mza B", etapaId: "e1" },
        { id: "m3", nombre: "Mza C", etapaId: "e1" },
        { id: "m4", nombre: "Mza D", etapaId: "e2" },
        { id: "m5", nombre: "Mza E", etapaId: "e2" },
    ];

    const units: MasterplanUnit[] = [];
    const estados: MasterplanUnit["estado"][] = [
        "DISPONIBLE", "DISPONIBLE", "DISPONIBLE", "RESERVADO", "VENDIDO", "BLOQUEADO",
    ];
    let idx = 0;

    // Generate lots in a grid pattern within geographic bounds
    const baseLat = -33.0935;
    const baseLng = -60.5480;
    const lotLatSize = 0.00025;
    const lotLngSize = 0.00035;
    const gapLat = 0.00003;
    const gapLng = 0.00004;

    manzanas.forEach((mz, mi) => {
        const etapa = etapas.find((e) => e.id === mz.etapaId)!;
        const cols = 5;
        const rows = mi < 3 ? 4 : 3;
        const offsetLat = mi < 3 ? 0 : -(rows * (lotLatSize + gapLat) + 0.0006);
        const offsetLng = (mi % 3) * (cols * (lotLngSize + gapLng) + 0.0006);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const lat = baseLat + offsetLat - r * (lotLatSize + gapLat);
                const lng = baseLng + offsetLng + c * (lotLngSize + gapLng);

                const num = `${mz.nombre.replace("Mza ", "")}-${String(idx % 20 + 1).padStart(2, "0")}`;
                const estado = estados[idx % estados.length];
                const esEsquina = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
                const superficie = 400 + Math.floor(Math.random() * 300);
                const precio = 35000 + Math.floor(Math.random() * 40000);

                // Store lat/lng bounds in path as JSON (we'll parse later)
                const bounds = JSON.stringify([
                    [lat, lng],
                    [lat - lotLatSize, lng],
                    [lat - lotLatSize, lng + lotLngSize],
                    [lat, lng + lotLngSize],
                ]);

                units.push({
                    id: `unit-${idx}`,
                    numero: num,
                    tipo: "LOTE",
                    superficie,
                    frente: 12 + Math.floor(Math.random() * 10),
                    fondo: 25 + Math.floor(Math.random() * 15),
                    esEsquina,
                    orientacion: ["N", "S", "E", "O", "NE", "SE"][idx % 6],
                    precio,
                    moneda: "USD",
                    estado,
                    etapaId: etapa.id,
                    etapaNombre: etapa.nombre,
                    manzanaId: mz.id,
                    manzanaNombre: mz.nombre,
                    tour360Url: estado === "DISPONIBLE" ? "/dashboard/tour360" : null,
                    imagenes: [],
                    responsable: estado === "VENDIDO" ? "Juan Pérez" : estado === "RESERVADO" ? "María López" : null,
                    path: bounds,
                    cx: lat - lotLatSize / 2,
                    cy: lng + lotLngSize / 2,
                });
                idx++;
            }
        }
    });

    return units;
}

interface MasterplanMapProps {
    proyectoId: string;
    modo: "admin" | "public";
    initialUnits?: MasterplanUnit[];
    overlayImageUrl?: string;
    centerLat?: number;
    centerLng?: number;
}

export default function MasterplanMap({
    proyectoId,
    modo,
    initialUnits = [],
    overlayImageUrl,
    centerLat = -33.0943,
    centerLng = -60.5475,
}: MasterplanMapProps) {
    const {
        units, setUnits,
        selectedUnitId, setSelectedUnitId,
        hoveredUnitId, setHoveredUnitId,
        comparisonIds, toggleComparison, clearComparison,
        showComparator, setShowComparator,
        showFilters, setShowFilters,
    } = useMasterplanStore();

    const filteredUnits = useFilteredUnits();
    const filteredIds = new Set(filteredUnits.map((u) => u.id));

    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<any>(null);
    const polygonsRef = useRef<Map<string, any>>(new Map());
    const [isMapReady, setIsMapReady] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [mapView, setMapView] = useState<"satellite" | "street">("satellite");
    const [tooltip, setTooltip] = useState<{ x: number; y: number; unit: MasterplanUnit } | null>(null);

    // Overlay editor state
    const [overlayConfig, setOverlayConfig] = useState<OverlayConfig | null>(null);
    const [isEditingOverlay, setIsEditingOverlay] = useState(false);
    const [isLoadingOverlay, setIsLoadingOverlay] = useState(false);
    const overlayLayerRef = useRef<any>(null);

    // Tour 360 state
    const [activeTour, setActiveTour] = useState<{ url: string; title: string } | null>(null);

    // Initialize units
    useEffect(() => {
        if (initialUnits && initialUnits.length > 0) {
            setUnits(initialUnits);
        } else if (units.length === 0) {
            setUnits(generateGeoUnits());
        }
    }, [initialUnits, setUnits, units.length]);

    // Load saved overlay config from API
    useEffect(() => {
        const loadOverlay = async () => {
            setIsLoadingOverlay(true);
            try {
                const res = await fetch(`/api/proyectos/${proyectoId}/overlay`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setOverlayConfig(data.config);
                    }
                }
            } catch (err) {
                console.error("Failed to load overlay config:", err);
            } finally {
                setIsLoadingOverlay(false);
            }
        };
        loadOverlay();
    }, [proyectoId]);

    // Initialize Leaflet map
    useEffect(() => {
        if (!mapRef.current) return;

        let isCanceled = false;

        const initMap = async () => {
            // Check if map is already initialized on this ref
            if (leafletMapRef.current) return;

            // Also check if the DOM element already has a leaflet instance (defensive)
            if ((mapRef.current as any)?._leaflet_id) {
                return;
            }

            // const L = (await import("leaflet")).default;
            const L: any = null;

            if (isCanceled) return;

            // Fix Leaflet default icon issue
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            });

            // Double check before creating
            if (!mapRef.current) return;

            try {
                const map = L.map(mapRef.current, {
                    center: [centerLat, centerLng],
                    zoom: 17,
                    zoomControl: false,
                    attributionControl: false,
                });

                // Google satellite tile layer
                const satellite = L.tileLayer(
                    "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
                    { maxZoom: 21, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
                );

                const streets = L.tileLayer(
                    "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
                    { maxZoom: 21, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
                );

                const hybrid = L.tileLayer(
                    "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
                    { maxZoom: 21, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
                );

                satellite.addTo(map);

                // Store references for layer switching
                (map as any)._tileLayers = { satellite, streets, hybrid };
                (map as any)._currentTile = satellite;

                // Attribution
                L.control.attribution({
                    position: "bottomleft",
                    prefix: "Seventoop | Leaflet"
                }).addTo(map);

                leafletMapRef.current = map;
                setIsMapReady(true);
            } catch (error) {
                console.warn("Map initialization error:", error);
            }
        };

        initMap();

        return () => {
            isCanceled = true;
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
                setIsMapReady(false);
            }
        };
    }, [centerLat, centerLng]);

    // Render saved overlay image on map (read-only mode)
    useEffect(() => {
        if (!isMapReady || !leafletMapRef.current || isEditingOverlay) return;

        const renderOverlay = async () => {
            // const L = (await import("leaflet")).default;
            const L: any = null;
            const map = leafletMapRef.current!;

            // Remove old overlay
            if (overlayLayerRef.current) {
                map.removeLayer(overlayLayerRef.current);
                overlayLayerRef.current = null;
            }

            if (overlayConfig && overlayConfig.imageUrl && showOverlay) {
                const overlay = L.imageOverlay(
                    overlayConfig.imageUrl,
                    overlayConfig.bounds!,
                    {
                        opacity: overlayConfig.opacity ?? 0.6,
                        interactive: false,
                    }
                );
                overlay.addTo(map);

                // Apply rotation (simple transform for MVP)
                if (overlayConfig.rotation) {
                    const el = overlay.getElement();
                    if (el) {
                        el.style.transformOrigin = "center center";
                        // Note: Leaflet transforms for positioning, appending rotation might conflict
                        // without specialized handling/plugin. 
                        // For MVP Phase 1 we rely on bounds.
                    }
                }

                overlayLayerRef.current = overlay;
            }
        };

        renderOverlay();
    }, [isMapReady, overlayConfig, showOverlay, isEditingOverlay]);

    // Draw lot polygons on map
    useEffect(() => {
        if (!isMapReady || !leafletMapRef.current || units.length === 0) return;

        const drawPolygons = async () => {
            // const L = (await import("leaflet")).default;
            const L: any = null;
            const map = leafletMapRef.current!;

            // Clear old polygons
            polygonsRef.current.forEach((poly) => map.removeLayer(poly));
            polygonsRef.current.clear();

            units.forEach((unit) => {
                let coords: [number, number][];
                try {
                    // Try geoJSON first (from Blueprint Engine), then fallback to path (demo/SVG path)
                    const source = (unit.geoJSON || unit.path) as string;
                    coords = JSON.parse(source);
                } catch {
                    return; // Skip units without valid geo coordinates
                }

                const isFiltered = filteredIds.has(unit.id);
                const color = STATUS_COLORS[unit.estado] || "#94a3b8";
                const isSelected = selectedUnitId === unit.id;

                const polygon = L.polygon(coords, {
                    color: isSelected ? "#ffffff" : color,
                    fillColor: color,
                    fillOpacity: isFiltered ? 0.5 : 0.1,
                    weight: isSelected ? 3 : 1,
                    className: "lot-polygon",
                });

                // Tooltip
                polygon.bindTooltip(
                    `<div style="font-family: Inter, sans-serif; padding: 2px 0;">
                        <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">Lote ${unit.numero}</div>
                        <div style="font-size: 11px; color: #94a3b8;">
                            ${unit.superficie ? `${unit.superficie} m²` : ""} 
                            ${unit.precio ? `• $${unit.precio.toLocaleString()}` : ""}
                        </div>
                        <div style="margin-top: 4px; font-size: 10px; font-weight: 600; color: ${color}; text-transform: uppercase;">
                            ${STATUS_LABELS[unit.estado]}
                        </div>
                    </div>`,
                    { sticky: true, direction: "top", className: "lot-tooltip" }
                );

                // Click handler
                polygon.on("click", () => {
                    setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id);
                });

                // Context menu for comparison
                polygon.on("contextmenu", (e: any) => {
                    e.originalEvent.preventDefault();
                    toggleComparison(unit.id);
                });

                polygon.addTo(map);
                polygonsRef.current.set(unit.id, polygon);

                // Add label
                if (isFiltered) {
                    const center = polygon.getBounds().getCenter();
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: "lot-label",
                            html: `<span style="
                                font-size: 10px; 
                                font-weight: 600; 
                                color: white; 
                                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                                pointer-events: none;
                            ">${unit.numero.split("-")[1] || unit.numero}</span>`,
                            iconSize: [24, 14],
                            iconAnchor: [12, 7],
                        }),
                        interactive: false,
                    });
                    label.addTo(map);
                    polygonsRef.current.set(`label-${unit.id}`, label);
                }
            });
        };

        drawPolygons();
    }, [isMapReady, units, filteredIds, selectedUnitId]);

    // Toggle overlay visibility
    const handleToggleOverlay = useCallback(() => {
        setShowOverlay((prev) => !prev);
    }, []);

    // Switch map view
    const handleSwitchView = useCallback((view: "satellite" | "street") => {
        const map = leafletMapRef.current;
        if (!map) return;
        const layers = (map as any)._tileLayers;
        const current = (map as any)._currentTile;
        if (current) map.removeLayer(current);

        const newLayer = view === "satellite" ? layers.satellite : layers.hybrid;
        newLayer.addTo(map);
        (map as any)._currentTile = newLayer;
        setMapView(view);
    }, []);

    // Zoom controls
    const handleZoomIn = () => leafletMapRef.current?.zoomIn();
    const handleZoomOut = () => leafletMapRef.current?.zoomOut();
    const handleResetView = () => leafletMapRef.current?.setView([centerLat, centerLng], 17);

    const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

    return (
        <div className="relative w-full h-[calc(100vh-330px)] min-h-[500px] overflow-hidden bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800">
            {/* Leaflet CSS */}
            <link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
            />

            {/* Map container */}
            <div ref={mapRef} className="w-full h-full z-0" />

            {/* Loading overlay */}
            {!isMapReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-300 font-medium">Cargando mapa interactivo...</span>
                    </div>
                </div>
            )}

            {/* Top controls */}
            <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                        showFilters
                            ? "bg-brand-500 text-white"
                            : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                    )}
                >
                    <Filter className="w-3.5 h-3.5" />Filtros
                </button>

                {/* Overlay toggle (when saved overlay exists) */}
                {overlayConfig && (
                    <button
                        onClick={handleToggleOverlay}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                            showOverlay
                                ? "bg-brand-500 text-white"
                                : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
                        )}
                    >
                        {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        Plano
                    </button>
                )}

                {/* Admin: edit overlay button */}
                {modo === "admin" && overlayConfig && (
                    <button
                        onClick={() => setIsEditingOverlay(true)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                            isEditingOverlay
                                ? "bg-indigo-500 text-white"
                                : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                        )}
                    >
                        <LayersIcon className="w-3.5 h-3.5" />
                        Ajustar Plano
                    </button>
                )}

                {/* Map view toggle */}
                <div className="flex rounded-xl overflow-hidden shadow-lg">
                    <button
                        onClick={() => handleSwitchView("satellite")}
                        className={cn(
                            "px-3 py-2 text-xs font-semibold backdrop-blur-sm transition-all",
                            mapView === "satellite"
                                ? "bg-brand-500 text-white"
                                : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
                        )}
                    >
                        Satélite
                    </button>
                    <button
                        onClick={() => handleSwitchView("street")}
                        className={cn(
                            "px-3 py-2 text-xs font-semibold backdrop-blur-sm transition-all",
                            mapView === "street"
                                ? "bg-brand-500 text-white"
                                : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
                        )}
                    >
                        Híbrido
                    </button>
                </div>
            </div>

            {/* Zoom controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
                <button onClick={handleZoomIn} className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleZoomOut} className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={handleResetView} className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm" title="Resetear Vista">
                    <Crosshair className="w-4 h-4" />
                </button>
            </div>


            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2">
                <div className="flex items-center gap-3">
                    {Object.entries(STATUS_COLORS).map(([key, color]) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{STATUS_LABELS[key]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comparison floating button */}
            <AnimatePresence>
                {comparisonIds.length > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]"
                    >
                        <div className="flex items-center gap-2 bg-brand-500 text-white rounded-xl shadow-xl px-4 py-2.5">
                            <button
                                onClick={() => setShowComparator(true)}
                                className="text-sm font-semibold hover:underline"
                            >
                                Comparar {comparisonIds.length} unidad{comparisonIds.length > 1 ? "es" : ""}
                            </button>
                            <button onClick={clearComparison} className="p-0.5 hover:bg-white/20 rounded">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filters sidebar */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute top-14 left-4 bottom-4 z-[1000] w-[260px]"
                    >
                        <MasterplanFilters onClose={() => setShowFilters(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Side Panel */}
            <AnimatePresence>
                {selectedUnit && (
                    <MasterplanSidePanel
                        unit={selectedUnit}
                        modo={modo}
                        onClose={() => setSelectedUnitId(null)}
                    />
                )}
            </AnimatePresence>

            {/* Comparator Modal */}
            <AnimatePresence>
                {showComparator && (
                    <MasterplanComparator
                        units={units.filter((u) => comparisonIds.includes(u.id))}
                        onClose={() => setShowComparator(false)}
                        onRemove={(id) => toggleComparison(id)}
                    />
                )}
            </AnimatePresence>

            {/* Overlay Editor */}
            <AnimatePresence>
                {isEditingOverlay && isMapReady && leafletMapRef.current && (
                    <OverlayEditor
                        proyectoId={proyectoId}
                        map={leafletMapRef.current}
                        existingConfig={overlayConfig}
                        onSave={(config) => {
                            setOverlayConfig(config);
                            setIsEditingOverlay(false);
                        }}
                        onCancel={() => setIsEditingOverlay(false)}
                        onDelete={() => {
                            setOverlayConfig(null);
                            setIsEditingOverlay(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Tour 360 Viewer Modal */}
            <AnimatePresence>
                {activeTour && (
                    <Tour360Viewer
                        imageUrl={activeTour.url}
                        title={activeTour.title}
                        onClose={() => setActiveTour(null)}
                    />
                )}
            </AnimatePresence>

            {/* Custom styles */}
            <style jsx global>{`
                .lot-tooltip {
                    background: rgba(15, 23, 42, 0.95) !important;
                    border: 1px solid rgba(100, 116, 139, 0.3) !important;
                    border-radius: 12px !important;
                    padding: 8px 12px !important;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
                    color: white !important;
                }
                .lot-tooltip::before {
                    border-top-color: rgba(15, 23, 42, 0.95) !important;
                }
                .lot-label {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .lot-polygon {
                    transition: fill-opacity 0.2s, stroke-width 0.15s;
                    cursor: pointer;
                }
                .lot-polygon:hover {
                    fill-opacity: 0.7 !important;
                    stroke-width: 2 !important;
                }
                .leaflet-container {
                    font-family: Inter, system-ui, sans-serif;
                }
            `}</style>
        </div>
    );
}
