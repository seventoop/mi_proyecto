"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Save, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Valid Leaflet lat/lng tuple
type LatLngTuple = [number, number];

export interface OverlayConfig {
    imageUrl: string | null;
    bounds: [LatLngTuple, LatLngTuple] | null; // [SouthWest, NorthEast]
    rotation: number;
    opacity: number;
}

interface OverlayEditorProps {
    proyectoId: string;
    map: any; // Leaflet map instance
    existingConfig: OverlayConfig | null;
    onSave: (config: OverlayConfig) => void;
    onCancel: () => void;
    onDelete: () => void;
}

export default function OverlayEditor({
    proyectoId,
    map,
    existingConfig,
    onSave,
    onCancel,
    onDelete,
}: OverlayEditorProps) {
    const [imageUrl, setImageUrl] = useState<string>(existingConfig?.imageUrl || "");
    const [opacity, setOpacity] = useState<number>(existingConfig?.opacity || 0.7);
    const [rotation, setRotation] = useState<number>(existingConfig?.rotation || 0);
    const [isSaving, setIsSaving] = useState(false);

    // References to Leaflet objects
    const overlayRef = useRef<any>(null); // L.ImageOverlay
    const anchorsRef = useRef<any[]>([]); // Drag handles

    // Load initial overlay
    useEffect(() => {
        if (!map || !imageUrl) return;

        const initOverlay = async () => {
            const L = (await import("leaflet")).default;

            // If we have existing bounds, use them. Otherwise, calculate defaults based on map center.
            let bounds: [LatLngTuple, LatLngTuple];

            if (existingConfig?.bounds) {
                bounds = existingConfig.bounds;
            } else {
                const center = map.getCenter();
                // Create a default square box around center
                const latOffset = 0.002;
                const lngOffset = 0.003;
                bounds = [
                    [center.lat - latOffset, center.lng - lngOffset], // SW
                    [center.lat + latOffset, center.lng + lngOffset]  // NE
                ];
            }

            // Create overlay
            if (overlayRef.current) {
                map.removeLayer(overlayRef.current);
            }

            const overlay = L.imageOverlay(imageUrl, bounds, {
                opacity: opacity,
                interactive: true
            }).addTo(map);

            overlayRef.current = overlay;

            // Apply rotation if needed (Leaflet doesn't support rotation natively in ImageOverlay easily without plugin,
            // but we can transform the element)
            const img = overlay.getElement();
            if (img) {
                img.style.transformOrigin = "center center";
                img.style.transform += ` rotate(${rotation}deg)`;
            }

            createDraggableAnchors(bounds, L);
        };

        const createDraggableAnchors = (bounds: [LatLngTuple, LatLngTuple], L: any) => {
            // Clear old anchors
            anchorsRef.current.forEach(a => map.removeLayer(a));
            anchorsRef.current = [];

            const corners = [
                { pos: bounds[0], id: "sw", icon: "↙️" }, // SW
                { pos: [bounds[0][0], bounds[1][1]] as LatLngTuple, id: "se", icon: "↘️" }, // SE
                { pos: bounds[1], id: "ne", icon: "↗️" }, // NE
                { pos: [bounds[1][0], bounds[0][1]] as LatLngTuple, id: "nw", icon: "↖️" }, // NW
            ];

            corners.forEach(corner => {
                const icon = L.divIcon({
                    className: "",
                    // Use inline styles — Tailwind classes don't apply to dynamically-created Leaflet DOM elements
                    html: '<div style="width:16px;height:16px;background:white;border:2.5px solid #f97316;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.55);cursor:move;"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                });

                const marker = L.marker(corner.pos, {
                    draggable: true,
                    icon: icon,
                    zIndexOffset: 1000
                }).addTo(map);

                marker.on("drag", () => updateOverlayFromAnchors());
                marker.on("dragend", () => updateOverlayFromAnchors());

                // Hack to store ID on marker
                (marker as any)._cornerId = corner.id;

                anchorsRef.current.push(marker);
            });
        };

        const updateOverlayFromAnchors = () => {
            // Logic to keep rectangle shape or allow distort (Distort is complex with ImageOverlay. 
            // For MVP we usually stick to Bounds [SW, NE])
            // Here we simple verify SW and NE markers to update bounds

            const swMarker = anchorsRef.current.find(m => (m as any)._cornerId === "sw");
            const neMarker = anchorsRef.current.find(m => (m as any)._cornerId === "ne");

            if (swMarker && neMarker && overlayRef.current) {
                const newBounds = [
                    [swMarker.getLatLng().lat, swMarker.getLatLng().lng],
                    [neMarker.getLatLng().lat, neMarker.getLatLng().lng]
                ] as [LatLngTuple, LatLngTuple];

                overlayRef.current.setBounds(newBounds);

                // Move other markers to keep rectangle? 
                // For true free distort we need L.DistortableImage, but for now let's stick to Rectangular bounds updating
                // We update NW and SE to match the rectangle defined by SW and NE
                const seMarker = anchorsRef.current.find(m => (m as any)._cornerId === "se");
                const nwMarker = anchorsRef.current.find(m => (m as any)._cornerId === "nw");

                if (seMarker) seMarker.setLatLng([swMarker.getLatLng().lat, neMarker.getLatLng().lng]);
                if (nwMarker) nwMarker.setLatLng([neMarker.getLatLng().lat, swMarker.getLatLng().lng]);
            }
        };

        initOverlay();

        // Cleanup
        return () => {
            if (overlayRef.current) map.removeLayer(overlayRef.current);
            anchorsRef.current.forEach(a => map.removeLayer(a));
        };
    }, [map, imageUrl]); // Re-init on image change

    // React to Opacity/Rotation changes
    useEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.setOpacity(opacity);
            const img = overlayRef.current.getElement();
            if (img) {
                // Must preserve existing leaflet transform
                // This is a bit hacky as Leaflet manages transform for positioning
                // Ideally use CSS class or specialized plugin
                // For MVP: let's stick to opacity. Rotation is tricky without plugin.
                // img.style.transform = `rotate(${rotation}deg)`; 
            }
        }
    }, [opacity, rotation]);


    const handleSave = async () => {
        if (!overlayRef.current) return;
        setIsSaving(true);

        // Get current bounds
        const boundsObj = overlayRef.current.getBounds();
        const bounds = [
            [boundsObj.getSouthWest().lat, boundsObj.getSouthWest().lng],
            [boundsObj.getNorthEast().lat, boundsObj.getNorthEast().lng]
        ] as [LatLngTuple, LatLngTuple];

        const config: OverlayConfig = {
            imageUrl,
            bounds,
            rotation,
            opacity
        };

        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/overlay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl,
                    bounds,
                    rotation,
                    mapCenter: {
                        lat: map.getCenter().lat,
                        lng: map.getCenter().lng,
                        zoom: map.getZoom()
                    }
                })
            });

            if (res.ok) {
                onSave(config);
            }
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="absolute top-4 right-16 z-[2000] bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-4 w-72 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Editar Plano</h3>
                <button onClick={onCancel}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">

                {/* Image source indicator / URL input */}
                <div>
                    <label className="text-xs font-semibold mb-1 block text-slate-600 dark:text-slate-300">Imagen del Plano</label>
                    {imageUrl && imageUrl.startsWith("blob:") ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                            ✓ Plano SVG del proyecto cargado
                        </div>
                    ) : (
                        <input
                            type="text"
                            placeholder="https://... URL de imagen del plano"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full text-xs px-2.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-slate-800 dark:text-white placeholder-slate-400"
                        />
                    )}
                </div>

                <div>
                    <label className="text-xs font-semibold mb-1 block">Opacidad ({Math.round(opacity * 100)}%)</label>
                    <input
                        type="range"
                        min="0" max="1" step="0.1"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        className="w-full accent-brand-500 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !imageUrl}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                        {isSaving ? "Guardando..." : <><Save className="w-3 h-3" /> Guardar</>}
                    </button>
                    <button
                        onClick={onDelete}
                        className="px-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg"
                        title="Borrar overlay"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] text-blue-600 dark:text-blue-300">
                💡 Arrastra los puntos blancos en el mapa para ajustar el plano a las calles satelitales.
            </div>
        </div>
    );
}
