"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Map as MapIcon, Layers as LayersIcon, Filter, ZoomIn, ZoomOut, Maximize,
    Eye, EyeOff, Crosshair, X, ChevronRight, Image as ImageIcon, Globe,
    Search, MapPin, Check,
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

interface MasterplanMapProps {
    proyectoId: string;
    modo: "admin" | "public";
    initialUnits?: MasterplanUnit[];
    overlayImageUrl?: string;
    centerLat?: number;
    centerLng?: number;
    mapZoom?: number;
}

export default function MasterplanMap({
    proyectoId,
    modo,
    initialUnits = [],
    overlayImageUrl,
    centerLat = -34.6037,
    centerLng = -58.3816,
    mapZoom = 15,
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
    const svgBlobUrlRef = useRef<string | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);

    // Tour 360 state
    const [activeTour, setActiveTour] = useState<{ url: string; title: string } | null>(null);

    // Location search state
    const [showLocationPanel, setShowLocationPanel] = useState(false);
    const [locationQuery, setLocationQuery] = useState("");
    const [locationResults, setLocationResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
    const [manualLat, setManualLat] = useState<string>("");
    const [manualLng, setManualLng] = useState<string>("");
    const [isSavingLocation, setIsSavingLocation] = useState(false);
    const [locationSaved, setLocationSaved] = useState(false);
    const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset selection state when entering Paso 4 (prevent bleedover from Paso 3)
    useEffect(() => {
        setSelectedUnitId(null);
        setHoveredUnitId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize units from prop only — no demo data
    useEffect(() => {
        if (initialUnits && initialUnits.length > 0) {
            setUnits(initialUnits);
        }
    }, [initialUnits, setUnits]);

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

            const L = (await import("leaflet")).default;

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
                    zoom: mapZoom,
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
                // Invalidate size after layout stabilizes (needed in flex containers)
                setTimeout(() => map.invalidateSize(), 50);
                setIsMapReady(true);
            } catch (error) {
                console.warn("Map initialization error:", error);
            }
        };

        initMap();

        return () => {
            isCanceled = true;
            if (svgBlobUrlRef.current) {
                URL.revokeObjectURL(svgBlobUrlRef.current);
                svgBlobUrlRef.current = null;
            }
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
                setIsMapReady(false);
            }
        };
    }, [centerLat, centerLng, mapZoom]);

    // Render saved overlay image on map (read-only mode)
    useEffect(() => {
        if (!isMapReady || !leafletMapRef.current || isEditingOverlay) return;

        const renderOverlay = async () => {
            const L = (await import("leaflet")).default;
            const map = leafletMapRef.current!;

            // Remove old overlay
            if (overlayLayerRef.current) {
                map.removeLayer(overlayLayerRef.current);
                overlayLayerRef.current = null;
            }

            if (overlayConfig && overlayConfig.imageUrl && overlayConfig.bounds && showOverlay) {
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
            const L = (await import("leaflet")).default;
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

    // Load masterplan SVG from paso 3 as overlay image
    const handleLoadPlanOverlay = useCallback(async () => {
        if (!leafletMapRef.current) return;
        setIsLoadingPlan(true);
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/blueprint`);
            if (res.ok) {
                const data = await res.json();
                if (data.masterplanSVG) {
                    if (svgBlobUrlRef.current) URL.revokeObjectURL(svgBlobUrlRef.current);
                    const blob = new Blob([data.masterplanSVG], { type: "image/svg+xml;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    svgBlobUrlRef.current = url;
                    // Preserve existing bounds/rotation/opacity when reloading
                    setOverlayConfig(prev => ({
                        imageUrl: url,
                        bounds: prev?.bounds ?? null,
                        rotation: prev?.rotation ?? 0,
                        opacity: prev?.opacity ?? 0.75,
                    }));
                    setIsEditingOverlay(true);
                }
            }
        } catch (e) {
            console.error("Error cargando blueprint como overlay:", e);
        } finally {
            setIsLoadingPlan(false);
        }
    }, [proyectoId]);

    // ─── Location search (Nominatim) ─────────────────────────────────────────
    const searchLocation = useCallback((query: string) => {
        if (!query.trim() || query.length < 3) { setLocationResults([]); return; }
        if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
        locationTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                    { headers: { "Accept-Language": "es,en" } }
                );
                if (res.ok) setLocationResults(await res.json());
            } catch { /* silent */ }
        }, 500);
    }, []);

    const flyToLocation = useCallback((lat: number, lng: number, zoom = 16) => {
        if (!leafletMapRef.current) return;
        leafletMapRef.current.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        setLocationResults([]);
        setLocationQuery("");
    }, []);

    const saveMapLocation = useCallback(async () => {
        if (!leafletMapRef.current) return;
        setIsSavingLocation(true);
        try {
            const center = leafletMapRef.current.getCenter();
            const zoom = leafletMapRef.current.getZoom();
            const res = await fetch(`/api/proyectos/${proyectoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mapCenterLat: center.lat, mapCenterLng: center.lng, mapZoom: zoom }),
            });
            if (res.ok) {
                setLocationSaved(true);
                setTimeout(() => setLocationSaved(false), 3000);
            }
        } catch { /* silent */ } finally {
            setIsSavingLocation(false);
        }
    }, [proyectoId]);

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
    const handleResetView = () => leafletMapRef.current?.setView([centerLat, centerLng], mapZoom);

    const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

    return (
        <div className="flex flex-col w-full h-full min-h-[400px] bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-2xl overflow-hidden">
            {/* Leaflet CSS */}
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

            {/* ── Admin toolbar (OUTSIDE the map, no overlap) ── */}
            {modo === "admin" && (
                <div className="flex-shrink-0 bg-slate-950/90 border-b border-slate-700/50 px-3 py-2 pr-12">
                    <div className="flex items-center gap-2 flex-wrap min-h-[36px]">

                        {/* SECTION 1: Ubicación */}
                        <div className="relative flex items-center gap-1.5">
                            {!showLocationPanel ? (
                                <button
                                    onClick={() => setShowLocationPanel(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all whitespace-nowrap"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-brand-400" />
                                    Ubicación del proyecto
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Search input with dropdown */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar dirección..."
                                            value={locationQuery}
                                            onChange={(e) => { setLocationQuery(e.target.value); searchLocation(e.target.value); }}
                                            className="text-xs pl-7 pr-2 py-1.5 w-52 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                                        />
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                        {locationResults.length > 0 && (
                                            <div className="absolute top-full left-0 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-[2000]">
                                                {locationResults.map((r, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => flyToLocation(parseFloat(r.lat), parseFloat(r.lon))}
                                                        className="w-full text-left text-[11px] px-3 py-2 hover:bg-brand-500/20 text-slate-300 border-b border-slate-800 last:border-0 transition-colors leading-tight"
                                                    >
                                                        {r.display_name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Lat input */}
                                    <input
                                        type="number"
                                        placeholder="Lat"
                                        value={manualLat}
                                        onChange={(e) => setManualLat(e.target.value)}
                                        step="0.000001"
                                        className="text-xs px-2 py-1.5 w-28 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                                    />
                                    {/* Lng input */}
                                    <input
                                        type="number"
                                        placeholder="Lng"
                                        value={manualLng}
                                        onChange={(e) => setManualLng(e.target.value)}
                                        step="0.000001"
                                        className="text-xs px-2 py-1.5 w-28 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
                                    />
                                    {/* Go to coords */}
                                    <button
                                        onClick={() => {
                                            const lat = parseFloat(manualLat);
                                            const lng = parseFloat(manualLng);
                                            if (!isNaN(lat) && !isNaN(lng)) flyToLocation(lat, lng);
                                        }}
                                        title="Ir a coordenadas"
                                        className="p-1.5 bg-slate-700 hover:bg-brand-500 text-slate-300 hover:text-white rounded-lg transition-colors flex-shrink-0"
                                    >
                                        <Crosshair className="w-3.5 h-3.5" />
                                    </button>
                                    {/* Save location */}
                                    <button
                                        onClick={saveMapLocation}
                                        disabled={isSavingLocation}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                                    >
                                        {isSavingLocation ? (
                                            <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : locationSaved ? (
                                            <><Check className="w-3 h-3" />Guardado</>
                                        ) : (
                                            <><MapIcon className="w-3 h-3" />Guardar</>
                                        )}
                                    </button>
                                    {/* Close */}
                                    <button
                                        onClick={() => { setShowLocationPanel(false); setLocationResults([]); setLocationQuery(""); }}
                                        className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Separator */}
                        {!showLocationPanel && <div className="h-5 w-px bg-slate-700/60 flex-shrink-0" />}

                        {/* SECTION 2: Plan overlay controls */}
                        <div className="flex items-center gap-1.5">
                            {/* "Cargar Plano" — always visible in admin mode */}
                            <button
                                onClick={handleLoadPlanOverlay}
                                disabled={isLoadingPlan || isLoadingOverlay || !isMapReady}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap disabled:opacity-50",
                                    overlayConfig
                                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-md"
                                )}
                            >
                                {isLoadingPlan ? (
                                    <><div className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" />Cargando...</>
                                ) : (
                                    <><ImageIcon className="w-3.5 h-3.5" />{overlayConfig ? "Recargar Plano" : "Cargar Plano del Proyecto"}</>
                                )}
                            </button>

                            {/* Only shown when overlay exists */}
                            {overlayConfig && (
                                <>
                                    <button
                                        onClick={handleToggleOverlay}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                            showOverlay
                                                ? "bg-brand-500 text-white border-transparent"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                        )}
                                    >
                                        {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        Plano
                                    </button>
                                    <button
                                        onClick={() => setIsEditingOverlay(true)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                            isEditingOverlay
                                                ? "bg-indigo-500 text-white border-transparent"
                                                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                                        )}
                                    >
                                        <LayersIcon className="w-3.5 h-3.5" />
                                        Ajustar Plano
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Map area (flex-1 takes remaining height) ── */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
                {/* Leaflet container */}
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

                {/* Map top-left floating controls */}
                <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
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

                {/* Zoom controls — top-right, inside map area (no overlap with ResizableContainer fullscreen btn) */}
                <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
                    <button onClick={handleZoomIn} className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button onClick={handleZoomOut} className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={handleResetView} className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm" title="Centrar vista">
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
                                <button onClick={() => setShowComparator(true)} className="text-sm font-semibold hover:underline">
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
                            className="absolute top-14 left-3 bottom-4 z-[1000] w-[260px]"
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
                            onCancel={() => {
                                if (!overlayConfig?.bounds) setOverlayConfig(null);
                                setIsEditingOverlay(false);
                            }}
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
            </div>

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
