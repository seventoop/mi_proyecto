"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
    Filter, ZoomIn, ZoomOut, Crosshair,
    Layers as LayersIcon, Map as MapIcon,
    Globe, Share2, Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useMasterplanStore,
    useFilteredUnits,
    MasterplanUnit
} from "@/lib/masterplan-store";
import { motion, AnimatePresence } from "framer-motion";
import MasterplanSidePanel from "./masterplan-side-panel";
import MasterplanFilters from "./masterplan-filters";
import PolygonEditorModal from "./PolygonEditorModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateProjectMapConfig, updateProyectoOverlayBounds } from "@/lib/actions/masterplan-actions";

if (typeof window !== "undefined") {
    (window as any).updateProjectMapConfig = updateProjectMapConfig;
}

const ESTADO_COLORS: Record<string, { fill: string; stroke: string }> = {
    DISPONIBLE: { fill: "#22c55e", stroke: "#16a34a" },
    RESERVADO: { fill: "#f97316", stroke: "#ea580c" },
    VENDIDO: { fill: "#ef4444", stroke: "#dc2626" },
    BLOQUEADO: { fill: "#94a3b8", stroke: "#64748b" },
};

type CornerKey = "nw" | "ne" | "se" | "sw";
interface OverlayBounds {
    nw: { lat: number; lng: number };
    ne: { lat: number; lng: number };
    se: { lat: number; lng: number };
    sw: { lat: number; lng: number };
}

interface MasterplanMapProps {
    proyectoId: string;
    modo: "admin" | "public" | "inversor";
    centerLat?: number;
    centerLng?: number;
    initialUnits?: MasterplanUnit[];
    initialOverlayBounds?: OverlayBounds | null;
}

export default function MasterplanMap({
    proyectoId,
    modo,
    centerLat = -31.4532,
    centerLng = -64.4823,
    initialUnits = [],
    initialOverlayBounds = null,
}: MasterplanMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapType, setMapType] = useState<"satellite" | "roadmap">("satellite");
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    // Overlay 4-corner handles
    const [showOverlay, setShowOverlay] = useState(false);
    const [overlayBounds, setOverlayBounds] = useState<OverlayBounds | null>(initialOverlayBounds);
    const handleMarkersRef = useRef<Map<CornerKey, google.maps.Marker>>(new Map());
    const overlayRectRef = useRef<google.maps.Polygon | null>(null);

    const {
        units, setUnits,
        selectedUnitId, setSelectedUnitId,
        showFilters, setShowFilters,
    } = useMasterplanStore();

    const filteredUnits = useFilteredUnits();
    const polygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());

    // Initialize units
    useEffect(() => {
        if (initialUnits.length > 0) {
            setUnits(initialUnits);
        }
    }, [initialUnits, setUnits]);

    // Load Google Maps
    useEffect(() => {
        const initMap = async () => {
            try {
                setOptions({
                    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                });

                const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;

                if (!mapRef.current) return;

                const googleMap = new Map(mapRef.current, {
                    center: { lat: centerLat, lng: centerLng },
                    zoom: 16,
                    mapTypeId: "satellite",
                    tilt: 0,
                    disableDefaultUI: true,
                    zoomControl: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                });

                setMap(googleMap);
                setIsLoaded(true);
            } catch (error) {
                console.error("Error loading Google Maps:", error);
            }
        };

        initMap();
    }, [centerLat, centerLng]);

    // Draw Polygons
    useEffect(() => {
        if (!map || !isLoaded) return;

        // Clear previous
        polygonsRef.current.forEach(p => p.setMap(null));
        polygonsRef.current.clear();

        filteredUnits.forEach(unit => {
            // Normalize polygon: handle string JSON, object, or legacy path
            let paths: any = unit.polygon;
            if (typeof paths === "string") {
                try { paths = JSON.parse(paths); } catch { paths = null; }
            }
            if (!paths && unit.path) {
                try { paths = JSON.parse(unit.path as string); } catch { paths = null; }
            }

            if (!paths || !Array.isArray(paths) || paths.length < 3) return;

            const colors = ESTADO_COLORS[unit.estado] || ESTADO_COLORS.DISPONIBLE;
            const isSelected = selectedUnitId === unit.id;

            const polygon = new google.maps.Polygon({
                paths: paths,
                strokeColor: isSelected ? "#ffffff" : colors.stroke,
                strokeOpacity: 0.9,
                strokeWeight: isSelected ? 3 : 1.5,
                fillColor: colors.fill,
                fillOpacity: isSelected ? 0.7 : 0.4,
                map: map,
                zIndex: isSelected ? 10 : 1,
            });

            polygon.addListener("click", (e: google.maps.MapMouseEvent) => {
                setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id);

                // InfoWindow
                if (infoWindowRef.current) infoWindowRef.current.close();
                const precio = unit.precio ? `$${unit.precio.toLocaleString()} ${unit.moneda || "USD"}` : "Consultar";
                const estadoLabel: Record<string, string> = { DISPONIBLE: "Disponible", RESERVADO: "Reservado", RESERVADA: "Reservado", VENDIDO: "Vendido", VENDIDA: "Vendido", BLOQUEADO: "Bloqueado" };
                const estadoColor: Record<string, string> = { DISPONIBLE: "#22c55e", RESERVADO: "#f59e0b", RESERVADA: "#f59e0b", VENDIDO: "#ef4444", VENDIDA: "#ef4444", BLOQUEADO: "#6b7280" };
                const iw = new google.maps.InfoWindow({
                    content: `<div style="font-family:sans-serif;min-width:160px;padding:4px">
                        <div style="font-weight:700;font-size:14px;margin-bottom:6px">Lote #${unit.numero}</div>
                        <span style="background:${estadoColor[unit.estado] || "#94a3b8"}22;color:${estadoColor[unit.estado] || "#94a3b8"};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">${estadoLabel[unit.estado] || unit.estado}</span>
                        ${unit.superficie ? `<div style="margin-top:6px;font-size:12px;color:#64748b">Superficie: <b>${unit.superficie} m²</b></div>` : ""}
                        <div style="margin-top:4px;font-size:13px;color:#0f172a;font-weight:700">${precio}</div>
                    </div>`,
                    position: e.latLng ?? undefined,
                });
                iw.open(map);
                infoWindowRef.current = iw;
            });

            polygon.addListener("mouseover", () => {
                polygon.setOptions({ fillOpacity: 0.8 });
            });

            polygon.addListener("mouseout", () => {
                polygon.setOptions({ fillOpacity: isSelected ? 0.7 : 0.4 });
            });

            polygonsRef.current.set(unit.id, polygon);
        });
    }, [map, isLoaded, filteredUnits, selectedUnitId, setSelectedUnitId]);

    // Overlay handles effect
    useEffect(() => {
        if (!map || !isLoaded || modo !== "admin") return;

        // Cleanup previous
        handleMarkersRef.current.forEach(m => m.setMap(null));
        handleMarkersRef.current.clear();
        overlayRectRef.current?.setMap(null);
        overlayRectRef.current = null;

        if (!showOverlay) return;

        const bounds: OverlayBounds = overlayBounds ?? {
            nw: { lat: centerLat + 0.001, lng: centerLng - 0.001 },
            ne: { lat: centerLat + 0.001, lng: centerLng + 0.001 },
            se: { lat: centerLat - 0.001, lng: centerLng + 0.001 },
            sw: { lat: centerLat - 0.001, lng: centerLng - 0.001 },
        };

        const currentBounds = { ...bounds };

        const drawRect = () => {
            overlayRectRef.current?.setMap(null);
            overlayRectRef.current = new google.maps.Polygon({
                paths: [currentBounds.nw, currentBounds.ne, currentBounds.se, currentBounds.sw],
                strokeColor: "#f97316",
                strokeWeight: 2,
                fillColor: "#f97316",
                fillOpacity: 0.08,
                map,
                zIndex: 5,
            });
        };

        const corners: CornerKey[] = ["nw", "ne", "se", "sw"];
        const labels: Record<CornerKey, string> = { nw: "NO", ne: "NE", se: "SE", sw: "SO" };

        corners.forEach(corner => {
            const marker = new google.maps.Marker({
                position: currentBounds[corner],
                map,
                draggable: true,
                zIndex: 10,
                label: { text: labels[corner], color: "#fff", fontSize: "10px", fontWeight: "bold" },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#f97316",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                },
                title: `Arrastra para ajustar esquina ${labels[corner]}`,
            });

            marker.addListener("drag", (e: google.maps.MapMouseEvent) => {
                if (e.latLng) {
                    currentBounds[corner] = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                    drawRect();
                }
            });

            marker.addListener("dragend", () => {
                setOverlayBounds({ ...currentBounds });
            });

            handleMarkersRef.current.set(corner, marker);
        });

        drawRect();

        return () => {
            handleMarkersRef.current.forEach(m => m.setMap(null));
            handleMarkersRef.current.clear();
            overlayRectRef.current?.setMap(null);
            overlayRectRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, isLoaded, showOverlay]);

    const toggleMapType = () => {
        const newType = mapType === "satellite" ? "roadmap" : "satellite";
        map?.setMapTypeId(newType);
        setMapType(newType);
    };

    const handleZoomIn = () => map?.setZoom((map.getZoom() || 16) + 1);
    const handleZoomOut = () => map?.setZoom((map.getZoom() || 16) - 1);
    const handleReset = () => map?.setCenter({ lat: centerLat, lng: centerLng });

    const shareUrl = `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`;

    const selectedUnit = units.find(u => u.id === selectedUnitId);

    return (
        <div className="relative w-full h-[calc(100vh-330px)] min-h-[500px] bg-slate-900 overflow-hidden border-x border-b border-slate-200 dark:border-slate-800">
            {/* Map Canvas */}
            <div ref={mapRef} className="w-full h-full" />

            {/* Controls Overlay */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button
                    variant={showFilters ? "default" : "secondary"}
                    size="sm"
                    className="gap-2 shadow-lg"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4" /> Filtros
                </Button>

                <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2 shadow-lg"
                    onClick={toggleMapType}
                >
                    {mapType === "satellite" ? <MapIcon className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    {mapType === "satellite" ? "Mapa" : "Satélite"}
                </Button>

                {modo === "admin" && (
                    <>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2 shadow-lg bg-brand-600 text-white hover:bg-brand-500"
                            onClick={() => setIsEditorOpen(true)}
                        >
                            <LayersIcon className="w-4 h-4" /> Dibujar Polígonos
                        </Button>
                        <Button
                            variant={showOverlay ? "default" : "secondary"}
                            size="sm"
                            className="gap-2 shadow-lg"
                            onClick={() => setShowOverlay(v => !v)}
                            title="4 handles de esquina para definir área de overlay"
                        >
                            <MapIcon className="w-4 h-4" /> {showOverlay ? "Ocultar Handles" : "Overlay Handles"}
                        </Button>
                        {showOverlay && overlayBounds && (
                            <Button
                                variant="secondary"
                                size="sm"
                                className="gap-2 shadow-lg bg-emerald-600 text-white hover:bg-emerald-500"
                                onClick={async () => {
                                    const res = await updateProyectoOverlayBounds(proyectoId, overlayBounds);
                                    if (res.success) toast.success("Bounds del overlay guardados");
                                    else toast.error("Error al guardar");
                                }}
                            >
                                <Save className="w-4 h-4" /> Guardar Overlay
                            </Button>
                        )}
                    </>
                )}
            </div>

            {/* Right Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <div className="flex flex-col rounded-lg overflow-hidden shadow-lg border border-white/10">
                    <button onClick={handleZoomIn} className="w-10 h-10 bg-white/90 dark:bg-slate-800/90 flex items-center justify-center hover:bg-white transition-colors">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button onClick={handleZoomOut} className="w-10 h-10 bg-white/90 dark:bg-slate-800/90 flex items-center justify-center hover:bg-white transition-colors border-t border-slate-200 dark:border-slate-700">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                </div>
                <button
                    onClick={handleReset}
                    className="w-10 h-10 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors border border-white/10"
                >
                    <Crosshair className="w-4 h-4" />
                </button>
                <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors border border-white/10"
                    title="Ver en Google Maps"
                >
                    <Share2 className="w-4 h-4" />
                </a>
            </div>

            {/* Legend — dynamic counts */}
            <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[10px] text-white space-y-1.5">
                {Object.entries(ESTADO_COLORS).map(([key, color]) => {
                    const count = units.filter(u => {
                        const norm = ["RESERVADO", "RESERVADA", "RESERVADA_PENDIENTE"].includes(u.estado) ? "RESERVADO" : ["VENDIDO", "VENDIDA"].includes(u.estado) ? "VENDIDO" : u.estado;
                        return norm === key;
                    }).length;
                    return (
                        <div key={key} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: color.fill }} />
                                <span className="font-medium uppercase tracking-wider">{key}</span>
                            </div>
                            <span className="font-bold text-white/70">{count}</span>
                        </div>
                    );
                })}
                <div className="pt-1 mt-1 border-t border-white/10 text-white/50">
                    {units.filter(u => u.estado === "DISPONIBLE").length} disponibles de {units.length}
                </div>
            </div>

            {/* Admin Config Panel */}
            {modo === "admin" && (
                <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-[200px]">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Configuración Inicial</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
                            <span className="text-[9px] text-slate-500">Zoom: {map?.getZoom()}</span>
                        </div>
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full text-[10px] h-7 bg-brand-600 hover:bg-brand-500"
                            onClick={async () => {
                                const center = map?.getCenter();
                                const zoom = map?.getZoom();
                                if (center && zoom) {
                                    const res = await (window as any).updateProjectMapConfig(proyectoId, {
                                        lat: center.lat(),
                                        lng: center.lng(),
                                        zoom: zoom
                                    });
                                    if (res.success) toast.success("Configuración guardada");
                                    else toast.error("Error al guardar");
                                }
                            }}
                        >
                            <Save className="w-3 h-3 mr-1" /> Guardar Vista Actual
                        </Button>
                    </div>
                </div>
            )}

            {/* Modals & Panels */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        className="absolute top-16 left-4 z-20 w-80"
                    >
                        <MasterplanFilters onClose={() => setShowFilters(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedUnit && (
                    <MasterplanSidePanel
                        unit={selectedUnit}
                        modo={modo}
                        onClose={() => setSelectedUnitId(null)}
                    />
                )}
            </AnimatePresence>

            {isEditorOpen && (
                <PolygonEditorModal
                    isOpen={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    proyecto={{
                        id: proyectoId,
                        nombre: "Proyecto", // Would be better to pass real name
                        lat: centerLat,
                        lng: centerLng,
                        zoom: 16
                    }}
                    unidades={units as any}
                    onSave={() => {
                        // We could re-fetch or just close
                        toast.success("Mapa actualizado");
                    }}
                />
            )}
        </div>
    );
}
