"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
    Map as MapIcon, Layers as LayersIcon, Filter, ZoomIn, ZoomOut,
    Crosshair, X, Search, MapPin, Check, Save, Camera,
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
import { getProjectBlueprintData } from "@/lib/actions/unidades";

const InfraestructuraTool = dynamic(() => import("./infraestructura-tool"), { ssr: false });
const ImagenesMapaTool = dynamic(() => import("./imagenes-mapa-tool"), { ssr: false });

// ─── Status colors ───
const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDO: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDO: "Suspendido",
};

export interface Tour360Marker {
    tourId: string;
    nombre: string;
    unidadId: string;
    thumbnail?: string;
    sceneCount?: number;
    defaultSceneUrl?: string;
    defaultSceneId?: string;
    defaultSceneOverlay?: Record<string, number> | null;
}

interface MasterplanMapProps {
    proyectoId: string;
    modo: "admin" | "public";
    initialUnits?: MasterplanUnit[];
    overlayImageUrl?: string;
    centerLat?: number;
    centerLng?: number;
    mapZoom?: number;
    tours360?: Tour360Marker[];
}

export default function MasterplanMap({
    proyectoId,
    modo,
    initialUnits = [],
    overlayImageUrl,
    centerLat = -34.6037,
    centerLng = -58.3816,
    mapZoom = 15,
    tours360 = [],
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
    const filteredIds = useMemo(() => new Set(filteredUnits.map((u) => u.id)), [filteredUnits]);

    const [blueprintLoaded, setBlueprintLoaded] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<any>(null);
    const polygonsRef = useRef<Map<string, any>>(new Map());
    const prevUnitsRef = useRef<MasterplanUnit[]>([]);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const persistentImageOverlayRef = useRef<any>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapView, setMapView] = useState<"satellite" | "street">("satellite");
    const [tooltip, setTooltip] = useState<{ x: number; y: number; unit: MasterplanUnit } | null>(null);

    // Overlay editor state (bounds only — no image overlay)
    const [overlayConfig, setOverlayConfig] = useState<OverlayConfig | null>(null);
    const [isEditingOverlay, setIsEditingOverlay] = useState(false);
    const [isLoadingOverlay, setIsLoadingOverlay] = useState(false);

    // Tour 360 state
    const [activeTour, setActiveTour] = useState<{ url: string; title: string; sceneId?: string; initialOverlay?: Record<string, number> | null } | null>(null);

    // Location search state
    const [showLocationPanel, setShowLocationPanel] = useState(false);
    const [locationQuery, setLocationQuery] = useState("");
    const [locationResults, setLocationResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
    const [manualLat, setManualLat] = useState<string>("");
    const [manualLng, setManualLng] = useState<string>("");
    const [isSavingLocation, setIsSavingLocation] = useState(false);
    const [locationSaved, setLocationSaved] = useState(false);
    const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Save plan position state
    const [isSavingPlan, setIsSavingPlan] = useState(false);
    const [planSaved, setPlanSaved] = useState(false);

    // Active tool panel (mutually exclusive)
    const [activePanel, setActivePanel] = useState<"infraestructura" | "imagenes" | null>(null);

    // Tour 360° preview card state
    const [tourPreview, setTourPreview] = useState<{
        tour: Tour360Marker;
        screenX: number;
        screenY: number;
    } | null>(null);

    // Camera marker layers ref
    const cameraMarkersRef = useRef<Map<string, any>>(new Map());

    const svgBlobUrlRef = useRef<string | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);

    // Reset selection state when entering Paso 4 (prevent bleedover from Paso 3)
    useEffect(() => {
        setSelectedUnitId(null);
        setHoveredUnitId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch blueprint data (units with SVG paths) — same source as Paso 3
    useEffect(() => {
        const fetchBlueprint = async () => {
            // Fast-path: if caller already provided units, use them
            if (initialUnits && initialUnits.length > 0) {
                setUnits(initialUnits);
                setBlueprintLoaded(true);
                return;
            }
            const res = await getProjectBlueprintData(proyectoId);
            if (res.success && res.data) {
                setUnits(res.data as any);
            }
            setBlueprintLoaded(true);
        };
        fetchBlueprint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proyectoId, setUnits]);

    // Load saved overlay config from API
    useEffect(() => {
        const loadOverlay = async () => {
            setIsLoadingOverlay(true);
            try {
                const res = await fetch(`/api/proyectos/${proyectoId}/overlay`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        // Blob URLs expire between sessions — strip them (bounds are kept for polygon geo-transform)
                        const cfg = data.config;
                        const imageUrl = cfg.imageUrl && !cfg.imageUrl.startsWith("blob:") ? cfg.imageUrl : null;
                        setOverlayConfig({ ...cfg, imageUrl });
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

    // Note: the overlay IMAGE is not auto-loaded on mount.
    // overlayConfig.bounds is used for polygon geo-transformation only.
    // The overlay image is only shown when admin explicitly loads it via "Cargar Plano".

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
                setIsMapReady(true);

                // Toggle label-marker visibility on zoom — labels only readable when zoomed in
                const MIN_LABEL_ZOOM = 17;
                map.on("zoomend", () => {
                    const z = map.getZoom();
                    polygonsRef.current.forEach((layer, key) => {
                        if (key.startsWith("label-")) {
                            layer.setOpacity(z >= MIN_LABEL_ZOOM ? 1 : 0);
                        }
                    });
                });

                // Invalidate size via ResizeObserver — fires whenever the container actually resizes
                if (mapRef.current) {
                    const ro = new ResizeObserver(() => {
                        leafletMapRef.current?.invalidateSize();
                    });
                    ro.observe(mapRef.current);
                    resizeObserverRef.current = ro;
                }
                // Also fire once immediately after layout settles
                setTimeout(() => map.invalidateSize(), 150);
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
            resizeObserverRef.current?.disconnect();
            resizeObserverRef.current = null;
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
                setIsMapReady(false);
            }
        };
    }, [centerLat, centerLng, mapZoom]);

    // No image overlay is ever rendered — the polygon layer is the sole visual representation.

    // ─── SVG viewBox computed from unit paths (needed for SVG→Geo transform) ──
    const svgViewBox = useMemo(() => {
        if (units.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const u of units) {
            let path = u.path;
            if (!path && (u as any).coordenadasMasterplan) {
                try { const c = JSON.parse((u as any).coordenadasMasterplan); path = c.path; } catch {}
            }
            if (!path) continue;
            const nums = path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
            if (!nums) continue;
            for (let i = 0; i + 1 < nums.length; i += 2) {
                const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
                if (!isNaN(x) && !isNaN(y)) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        if (minX === Infinity) return null;
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }, [units]);

    // Draw lot polygons on map
    useEffect(() => {
        if (!isMapReady || !leafletMapRef.current || units.length === 0) return;

        // Fast path: if only unit estados changed (no structural/coord changes), patch styles directly.
        // This avoids the full removeLayer/addLayer cycle that causes visible flicker.
        const prev = prevUnitsRef.current;
        const onlyEstadoChanged =
            prev.length === units.length &&
            polygonsRef.current.size > 0 &&
            units.every((u, i) => prev[i]?.id === u.id);

        if (onlyEstadoChanged) {
            let anyEstadoChanged = false;
            units.forEach((unit) => {
                const prevUnit = prev.find((p) => p.id === unit.id);
                if (!prevUnit || prevUnit.estado === unit.estado) return;
                anyEstadoChanged = true;
                const polygon = polygonsRef.current.get(unit.id);
                if (!polygon) return;
                const color = STATUS_COLORS[unit.estado] || "#94a3b8";
                const isSelected = selectedUnitId === unit.id;
                polygon.setStyle({
                    color: isSelected ? "#ffffff" : color,
                    fillColor: color,
                });
            });
            prevUnitsRef.current = units;
            if (anyEstadoChanged) return; // styles patched — skip full redraw
        }

        prevUnitsRef.current = units;

        const drawPolygons = async () => {
            const L = (await import("leaflet")).default;
            const map = leafletMapRef.current!;

            // Clear old polygons
            polygonsRef.current.forEach((poly) => map.removeLayer(poly));
            polygonsRef.current.clear();

            units.forEach((unit) => {
                let coords: [number, number][] | null = null;

                // Option 1: native geoJSON (explicit lat/lng array stored in DB)
                if (unit.geoJSON) {
                    try { coords = JSON.parse(unit.geoJSON); } catch {}
                }

                // Option 2: SVG path → geo via overlay bounds + computed viewBox
                if (!coords && svgViewBox && overlayConfig?.bounds) {
                    let svgPath = unit.path;
                    if (!svgPath && (unit as any).coordenadasMasterplan) {
                        try {
                            const c = JSON.parse((unit as any).coordenadasMasterplan);
                            svgPath = c.path;
                        } catch {}
                    }
                    if (svgPath) {
                        const nums = svgPath.match(/-?[\d.]+(?:e[+-]?\d+)?/g);
                        if (nums && nums.length >= 4) {
                            const [[swLat, swLng], [neLat, neLng]] = overlayConfig.bounds;
                            const cLat = (swLat + neLat) / 2, cLng = (swLng + neLng) / 2;
                            const rotation = overlayConfig.rotation ?? 0;
                            const rotRad = (rotation * Math.PI) / 180;
                            const pts: [number, number][] = [];
                            for (let i = 0; i + 1 < nums.length; i += 2) {
                                const sx = parseFloat(nums[i]), sy = parseFloat(nums[i + 1]);
                                if (isNaN(sx) || isNaN(sy)) continue;
                                const nx = svgViewBox.w > 0 ? (sx - svgViewBox.x) / svgViewBox.w : 0;
                                const ny = svgViewBox.h > 0 ? (sy - svgViewBox.y) / svgViewBox.h : 0;
                                const rawLat = neLat - ny * (neLat - swLat);
                                const rawLng = swLng + nx * (neLng - swLng);
                                if (rotation !== 0) {
                                    const dLat = rawLat - cLat, dLng = rawLng - cLng;
                                    pts.push([
                                        cLat + dLat * Math.cos(rotRad) - dLng * Math.sin(rotRad),
                                        cLng + dLat * Math.sin(rotRad) + dLng * Math.cos(rotRad),
                                    ]);
                                } else {
                                    pts.push([rawLat, rawLng]);
                                }
                            }
                            if (pts.length >= 3) coords = pts;
                        }
                    }
                }

                if (!coords || coords.length < 3) return;

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
                            ${STATUS_LABELS[unit.estado] ?? unit.estado}
                        </div>
                    </div>`,
                    { sticky: true, direction: "top", className: "lot-tooltip" }
                );

                // Click handler
                polygon.on("click", () => {
                    setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id);
                    setActivePanel(null);
                });

                // Context menu for comparison
                polygon.on("contextmenu", (e: any) => {
                    e.originalEvent.preventDefault();
                    toggleComparison(unit.id);
                });

                polygon.addTo(map);
                polygonsRef.current.set(unit.id, polygon);

                // Add label — centered exactly on the polygon
                if (isFiltered) {
                    // Prefer internalId (clean number), then numeric-only extraction
                    let labelText = unit.numero;
                    if ((unit as any).coordenadasMasterplan) {
                        try {
                            const c = JSON.parse((unit as any).coordenadasMasterplan);
                            if (c.internalId != null) labelText = String(c.internalId);
                        } catch {}
                    }
                    if (!/^\d+$/.test(labelText)) {
                        const numMatch = labelText.match(/\d+/);
                        if (numMatch) labelText = numMatch[0];
                    }

                    // Bbox center: consistent visual position across irregular polygons
                    const cLats = coords.map(c => c[0]), cLngs = coords.map(c => c[1]);
                    const centroid: [number, number] = [
                        (Math.min(...cLats) + Math.max(...cLats)) / 2,
                        (Math.min(...cLngs) + Math.max(...cLngs)) / 2,
                    ];
                    const label = L.marker(centroid, {
                        icon: L.divIcon({
                            className: "",
                            // iconSize [0,0] + iconAnchor [0,0]: marker point is the origin
                            // translate(-50%,-50%) perfectly centers the text regardless of its width
                            html: `<div style="
                                transform: translate(-50%, -50%);
                                font-size: 10px;
                                font-weight: 700;
                                color: white;
                                text-shadow: 0 1px 3px rgba(0,0,0,0.9);
                                pointer-events: none;
                                white-space: nowrap;
                                text-align: center;
                                line-height: 1;
                            ">${labelText}</div>`,
                            iconSize: [0, 0],
                            iconAnchor: [0, 0],
                        }),
                        interactive: false,
                    });
                    label.addTo(map);
                    // Hide label at low zoom — only show when individual lots are readable
                    label.setOpacity(map.getZoom() >= 17 ? 1 : 0);
                    polygonsRef.current.set(`label-${unit.id}`, label);
                }
            });
        };

        drawPolygons();
    // overlayConfig y svgViewBox son parte del cálculo de coordenadas
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMapReady, units, filteredIds, selectedUnitId, overlayConfig, svgViewBox, tours360]);

    // ─── Camera markers for Tour 360° — drawn separately after polygons ──────
    useEffect(() => {
        if (!isMapReady || !leafletMapRef.current || tours360.length === 0) return;

        let canceled = false;
        const addMarkers = async () => {
            // Small delay to let drawPolygons complete
            await new Promise((r) => setTimeout(r, 100));
            if (canceled || !leafletMapRef.current) return;

            const L = (await import("leaflet")).default;
            const map = leafletMapRef.current;

            cameraMarkersRef.current.forEach((m) => { try { map.removeLayer(m); } catch {} });
            cameraMarkersRef.current.clear();

            for (const tour of tours360) {
                const polygon = polygonsRef.current.get(tour.unidadId);
                if (!polygon) continue;
                let centroid: [number, number];
                try {
                    const bounds = polygon.getBounds();
                    centroid = [
                        (bounds.getSouth() + bounds.getNorth()) / 2,
                        (bounds.getWest() + bounds.getEast()) / 2,
                    ];
                } catch { continue; }

                const marker = L.marker(centroid as any, {
                    icon: L.divIcon({
                        className: "",
                        html: `<div style="width:26px;height:26px;background:rgba(139,92,246,0.9);border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;transform:translate(-50%,-50%)">📷</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                    }),
                    zIndexOffset: 500,
                });

                const captured = { ...tour, centroid };
                marker.on("click", (e: any) => {
                    e.originalEvent?.stopPropagation();
                    const cp = map.latLngToContainerPoint(captured.centroid as any);
                    setTourPreview({ tour: captured, screenX: cp.x, screenY: cp.y });
                });

                if (!canceled) {
                    marker.addTo(map);
                    cameraMarkersRef.current.set(tour.tourId, marker);
                }
            }
        };

        addMarkers();
        return () => {
            canceled = true;
            cameraMarkersRef.current.forEach((m) => { try { leafletMapRef.current?.removeLayer(m); } catch {} });
            cameraMarkersRef.current.clear();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMapReady, tours360, units, overlayConfig, svgViewBox]);

    // ── Persistent overlay layers (visible when editor is closed) ────────────────
    // The OverlayEditor manages its own Leaflet layers while open and removes them
    // on unmount. This effect keeps the image + bounds polygon visible at all times.
    useEffect(() => {
        if (!isMapReady || !leafletMapRef.current) return;
        const map = leafletMapRef.current;

        // Track both a polygon outline and an optional image overlay
        let imageLayer: any = null;
        let polygonLayer: any = null;

        const cleanup = () => {
            if (imageLayer)   { try { map.removeLayer(imageLayer);   } catch {} imageLayer   = null; }
            if (polygonLayer) { try { map.removeLayer(polygonLayer); } catch {} polygonLayer = null; }
            persistentImageOverlayRef.current = null;
        };

        // While the editor is open it owns the layers — remove our copies to avoid conflicts.
        if (isEditingOverlay) {
            cleanup();
            return cleanup;
        }

        const bounds   = overlayConfig?.bounds;
        const imageUrl = overlayConfig?.imageUrl;
        const rotation = overlayConfig?.rotation ?? 0;

        if (!bounds) {
            cleanup();
            return cleanup;
        }

        const setup = async () => {
            const L = (await import("leaflet")).default;

            // 1. Dashed bounding-box polygon so the user always sees where the plan is
            const [[swLat, swLng], [neLat, neLng]] = bounds;
            const cLat = (swLat + neLat) / 2;
            const cLng = (swLng + neLng) / 2;
            const rad  = (rotation * Math.PI) / 180;
            const corners: [number, number][] = ([[swLat, swLng], [swLat, neLng], [neLat, neLng], [neLat, swLng]] as [number, number][])
                .map(([lat, lng]) => {
                    const dLat = lat - cLat, dLng = lng - cLng;
                    return [
                        cLat + dLat * Math.cos(rad) - dLng * Math.sin(rad),
                        cLng + dLat * Math.sin(rad) + dLng * Math.cos(rad),
                    ] as [number, number];
                });
            polygonLayer = (L.polygon as any)(corners, {
                color: "#f97316", weight: 1.5, fillColor: "#f97316",
                fillOpacity: 0.04, dashArray: "6 4", interactive: false,
            }).addTo(map);

            // 2. Image overlay – blob URLs are valid during the session, so show them too
            if (imageUrl) {
                imageLayer = L.imageOverlay(imageUrl, bounds, { opacity: 0.75, interactive: false });
                imageLayer.addTo(map);
                imageLayer.on("load", () => {
                    const img = imageLayer.getElement();
                    if (img && rotation !== 0) {
                        img.style.transformOrigin = "center center";
                        img.style.transform = (img.style.transform || "").replace(/ rotate\([^)]*\)/g, "") + ` rotate(${rotation}deg)`;
                    }
                });
                persistentImageOverlayRef.current = imageLayer;
            }
        };

        setup();
        return cleanup;
    }, [isMapReady, isEditingOverlay, overlayConfig?.imageUrl, overlayConfig?.bounds, overlayConfig?.rotation]);

    // Real-time preview: update existing Leaflet polygon positions without full redraw
    const updatePolygonPositionsLive = useCallback((
        newBounds: [[number, number], [number, number]],
        rotation = 0,
    ) => {
        if (!svgViewBox) return;
        const [[swLat, swLng], [neLat, neLng]] = newBounds;
        const cLat = (swLat + neLat) / 2, cLng = (swLng + neLng) / 2;
        const rotRad = (rotation * Math.PI) / 180;

        units.forEach(unit => {
            const polygon = polygonsRef.current.get(unit.id);
            if (!polygon) return;

            let svgPath: string | undefined = unit.path;
            if (!svgPath && (unit as any).coordenadasMasterplan) {
                try { const c = JSON.parse((unit as any).coordenadasMasterplan); svgPath = c.path; } catch {}
            }
            if (!svgPath) return;

            const nums = svgPath.match(/-?[\d.]+(?:e[+-]?\d+)?/g);
            if (!nums || nums.length < 4) return;

            const pts: [number, number][] = [];
            for (let i = 0; i + 1 < nums.length; i += 2) {
                const sx = parseFloat(nums[i]), sy = parseFloat(nums[i + 1]);
                if (isNaN(sx) || isNaN(sy)) continue;
                const nx = svgViewBox.w > 0 ? (sx - svgViewBox.x) / svgViewBox.w : 0;
                const ny = svgViewBox.h > 0 ? (sy - svgViewBox.y) / svgViewBox.h : 0;
                const rawLat = neLat - ny * (neLat - swLat);
                const rawLng = swLng + nx * (neLng - swLng);
                if (rotation !== 0) {
                    const dLat = rawLat - cLat, dLng = rawLng - cLng;
                    pts.push([
                        cLat + dLat * Math.cos(rotRad) - dLng * Math.sin(rotRad),
                        cLng + dLat * Math.sin(rotRad) + dLng * Math.cos(rotRad),
                    ]);
                } else {
                    pts.push([rawLat, rawLng]);
                }
            }
            if (pts.length >= 3) {
                polygon.setLatLngs(pts);
                // Bbox center for label (consistent across irregular polygons)
                const label = polygonsRef.current.get(`label-${unit.id}`);
                if (label) {
                    const lLats = pts.map(c => c[0]), lLngs = pts.map(c => c[1]);
                    label.setLatLng([
                        (Math.min(...lLats) + Math.max(...lLats)) / 2,
                        (Math.min(...lLngs) + Math.max(...lLngs)) / 2,
                    ]);
                }
            }
        });
    }, [units, svgViewBox]);

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

    // Save current overlay config (bounds + rotation) from the toolbar
    const handleSavePlan = useCallback(async () => {
        if (!overlayConfig?.bounds) return;
        setIsSavingPlan(true);
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/overlay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: overlayConfig.imageUrl,
                    bounds: overlayConfig.bounds,
                    rotation: overlayConfig.rotation ?? 0,
                    mapCenter: leafletMapRef.current ? {
                        lat: leafletMapRef.current.getCenter().lat,
                        lng: leafletMapRef.current.getCenter().lng,
                        zoom: leafletMapRef.current.getZoom(),
                    } : undefined,
                }),
            });
            if (res.ok) {
                setPlanSaved(true);
                setTimeout(() => setPlanSaved(false), 3000);
            }
        } catch { /* silent */ } finally {
            setIsSavingPlan(false);
        }
    }, [proyectoId, overlayConfig]);

    // Load masterplan SVG from paso 3 as overlay image
    const handleLoadPlanOverlay = useCallback(async () => {
        if (!leafletMapRef.current) return;
        
        // If we already have the blob loaded, just open the editor
        if (overlayConfig?.imageUrl && overlayConfig.imageUrl.startsWith("blob:")) {
            setIsEditingOverlay(true);
            return;
        }

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
                } else {
                    // No SVG, but open anyway
                    setIsEditingOverlay(true);
                }
            } else {
                setIsEditingOverlay(true);
            }
        } catch (e) {
            console.error("Error cargando blueprint como overlay:", e);
            setIsEditingOverlay(true);
        } finally {
            setIsLoadingPlan(false);
        }
    }, [proyectoId, overlayConfig?.imageUrl]);

    const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

    return (
        <div className="relative flex flex-col w-full h-full min-h-[400px] bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-2xl overflow-hidden">
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

                        {/* SECTION 2: Polygon positioning */}
                        <button
                            onClick={handleLoadPlanOverlay}
                            disabled={!isMapReady || isLoadingPlan || isLoadingOverlay}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50",
                                isEditingOverlay
                                    ? "bg-indigo-500 text-white border-transparent"
                                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                            )}
                        >
                            {isLoadingPlan ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <LayersIcon className="w-3.5 h-3.5" />
                            )}
                            Ajustar Plano
                        </button>

                        {/* Separator */}
                        <div className="h-5 w-px bg-slate-700/60 flex-shrink-0" />

                        {/* SECTION 3: Map controls — in toolbar so they don't overlap the side panel */}
                        <button onClick={handleZoomIn} title="Acercar" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors flex-shrink-0">
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleZoomOut} title="Alejar" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors flex-shrink-0">
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleResetView} title="Centrar vista" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors flex-shrink-0">
                            <Crosshair className="w-3.5 h-3.5" />
                        </button>

                        {/* Separator */}
                        {overlayConfig?.bounds && <div className="h-5 w-px bg-slate-700/60 flex-shrink-0" />}

                        {/* SECTION 4: Save plan position */}
                        {overlayConfig?.bounds && (
                            <button
                                onClick={handleSavePlan}
                                disabled={isSavingPlan}
                                title="Guardar posición del plano"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 bg-orange-500 hover:bg-orange-600 text-white border-transparent"
                            >
                                {isSavingPlan ? (
                                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : planSaved ? (
                                    <><Check className="w-3 h-3" />Guardado</>
                                ) : (
                                    <><Save className="w-3 h-3" />Guardar</>
                                )}
                            </button>
                        )}

                        {/* Separator */}
                        <div className="h-5 w-px bg-slate-700/60 flex-shrink-0" />

                        {/* SECTION 5: Infraestructura tool — renders its own button + panel */}
                        {isMapReady && leafletMapRef.current && (
                            <InfraestructuraTool
                                proyectoId={proyectoId}
                                map={leafletMapRef.current}
                                isOpen={activePanel === "infraestructura"}
                                onOpenChange={(open) => { setActivePanel(open ? "infraestructura" : null); if (open) setSelectedUnitId(null); }}
                            />
                        )}

                        <div className="h-5 w-px bg-slate-700/60 flex-shrink-0" />

                        {/* SECTION 6: Imagenes del mapa tool */}
                        {isMapReady && leafletMapRef.current && (
                            <ImagenesMapaTool
                                proyectoId={proyectoId}
                                map={leafletMapRef.current}
                                overlayBounds={overlayConfig?.bounds ?? null}
                                overlayRotation={overlayConfig?.rotation ?? 0}
                                svgViewBox={svgViewBox}
                                isOpen={activePanel === "imagenes"}
                                onOpenChange={(open) => { setActivePanel(open ? "imagenes" : null); if (open) setSelectedUnitId(null); }}
                            />
                        )}
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

                {/* Zoom controls — public mode only; admin uses toolbar */}
                {modo !== "admin" && (
                    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
                        <button onClick={handleZoomIn} title="Acercar" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button onClick={handleZoomOut} title="Alejar" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button onClick={handleResetView} title="Centrar vista" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                            <Crosshair className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Hint: no overlay bounds configured yet — lotes can't be positioned */}
                {blueprintLoaded && units.length > 0 && !overlayConfig?.bounds && modo === "admin" && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium border border-slate-700/60 shadow-xl whitespace-nowrap">
                            <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                            Cargá y posicioná el plano para ver los lotes sobre el mapa
                        </div>
                    </div>
                )}

                {/* Legend — bottom-left so the side panel (right) never covers it */}
                <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2">
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
                            onBoundsChange={(bounds, rot) => updatePolygonPositionsLive(bounds, rot)}
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
                            sceneId={activeTour.sceneId}
                            initialOverlay={activeTour.initialOverlay}
                        />
                    )}
                </AnimatePresence>

                {/* Tour 360° Preview Card */}
                <AnimatePresence>
                    {tourPreview && (
                        <motion.div
                            key="tour-preview"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-[1200] w-56"
                            style={{
                                left: Math.min(Math.max(8, tourPreview.screenX - 112), (mapRef.current?.clientWidth ?? 400) - 232),
                                top: Math.max(8, tourPreview.screenY - 220),
                            }}
                        >
                            <div className="bg-slate-900/95 backdrop-blur-sm border border-violet-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                                {tourPreview.tour.thumbnail && (
                                    <div className="h-28 overflow-hidden">
                                        <img
                                            src={tourPreview.tour.thumbnail}
                                            alt={tourPreview.tour.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/80" />
                                    </div>
                                )}
                                {!tourPreview.tour.thumbnail && (
                                    <div className="h-16 bg-violet-500/10 flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-violet-400/50" />
                                    </div>
                                )}
                                <div className="p-3">
                                    <p className="text-xs font-bold text-white mb-0.5">{tourPreview.tour.nombre}</p>
                                    {tourPreview.tour.sceneCount != null && (
                                        <p className="text-[10px] text-slate-400 mb-2.5">
                                            {tourPreview.tour.sceneCount} escena{tourPreview.tour.sceneCount !== 1 ? "s" : ""}
                                        </p>
                                    )}
                                    <div className="flex gap-1.5">
                                        {tourPreview.tour.defaultSceneUrl && (
                                            <button
                                                onClick={() => {
                                                    setActiveTour({ url: tourPreview.tour.defaultSceneUrl!, title: tourPreview.tour.nombre, sceneId: tourPreview.tour.defaultSceneId, initialOverlay: tourPreview.tour.defaultSceneOverlay });
                                                    setTourPreview(null);
                                                }}
                                                className="flex-1 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold rounded-xl transition-colors"
                                            >
                                                Ver en 360°
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setTourPreview(null)}
                                            className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-xl transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
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
                .infra-layer {
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}
