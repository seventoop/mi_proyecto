"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { X, Save, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateUnitPolygon } from "@/lib/actions/masterplan-actions";

interface Unidad {
    id: string;
    numero: string;
    estado: string;
    polygon?: any;
}

interface PolygonEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    proyecto: {
        id: string;
        nombre: string;
        lat?: number;
        lng?: number;
        zoom?: number;
    };
    unidades: Unidad[];
    onSave: () => void;
}

export default function PolygonEditorModal({
    isOpen,
    onClose,
    proyecto,
    unidades,
    onSave
}: PolygonEditorModalProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string>("");
    const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);
    const [existingPolygons, setExistingPolygons] = useState<Map<string, google.maps.Polygon>>(new Map());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const loader = new Loader({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
            version: "weekly",
        });

        const init = async () => {
            try {
                const [{ Map }, { DrawingManager }] = await Promise.all([
                    loader.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
                    loader.importLibrary("drawing") as Promise<google.maps.DrawingLibrary>
                ]);

                if (!mapRef.current) return;

                const googleMap = new Map(mapRef.current, {
                    center: {
                        lat: proyecto.lat ?? -31.4167,
                        lng: proyecto.lng ?? -64.1833
                    },
                    zoom: proyecto.zoom ?? 16,
                    mapTypeId: "satellite",
                    tilt: 0,
                });

                const dm = new DrawingManager({
                    drawingMode: null,
                    drawingControl: true,
                    drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
                    },
                    polygonOptions: {
                        fillColor: "#22c55e",
                        fillOpacity: 0.5,
                        strokeWeight: 2,
                        clickable: true,
                        editable: true,
                        zIndex: 1,
                    },
                });

                dm.setMap(googleMap);

                google.maps.event.addListener(dm, "polygoncomplete", (polygon: google.maps.Polygon) => {
                    if (currentPolygon) {
                        currentPolygon.setMap(null);
                    }
                    setCurrentPolygon(polygon);
                    dm.setDrawingMode(null);
                });

                const polyMap = new window.Map<string, google.maps.Polygon>();
                unidades.forEach(u => {
                    if (u.polygon && Array.isArray(u.polygon)) {
                        const poly = new google.maps.Polygon({
                            paths: u.polygon,
                            strokeColor: "#ffffff",
                            strokeOpacity: 0.8,
                            strokeWeight: 1,
                            fillColor: "#94a3b8",
                            fillOpacity: 0.3,
                            map: googleMap
                        });
                        polyMap.set(u.id, poly);
                    }
                });
                setExistingPolygons(polyMap);
                setMap(googleMap);
                setDrawingManager(dm);
            } catch (error) {
                console.error("Error loading Google Maps Drawing:", error);
            }
        };

        init();

        return () => {
            if (currentPolygon) currentPolygon.setMap(null);
            existingPolygons.forEach(p => p.setMap(null));
        };
    }, [isOpen, proyecto]);

    const handleSave = async () => {
        if (!selectedUnitId) {
            toast.error("Selecciona una unidad primero");
            return;
        }
        if (!currentPolygon) {
            toast.error("Dibuja un polígono primero");
            return;
        }

        setIsSaving(true);
        try {
            const path = currentPolygon.getPath();
            const coordinates: { lat: number; lng: number }[] = [];
            path.forEach((latLng) => {
                coordinates.push({ lat: latLng.lat(), lng: latLng.lng() });
            });

            const res = await updateUnitPolygon(selectedUnitId, coordinates);
            if (res.success) {
                toast.success("Polígono guardado correctamente");
                onSave();
                // Clear current
                currentPolygon.setMap(null);
                setCurrentPolygon(null);
                setSelectedUnitId("");
            } else {
                toast.error(res.error || "Error al guardar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsSaving(false);
        }
    };

    const clearCurrent = () => {
        if (currentPolygon) {
            currentPolygon.setMap(null);
            setCurrentPolygon(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-brand-500" />
                        Editor de Polígonos - {proyecto.nombre}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 relative flex">
                    {/* Sidebar Control */}
                    <div className="w-80 p-6 border-r border-slate-200 dark:border-slate-800 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-2">
                            <label className="text-sm font-bold">1. Seleccionar Unidad</label>
                            <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Buscar unidad..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {unidades.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            Lote {u.numero} ({u.estado})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <label className="text-sm font-bold">2. Dibujar en Mapa</label>
                            <p className="text-xs text-slate-500">
                                Usa la herramienta de polígono arriba del mapa para marcar los límites del lote.
                                Puedes mover los puntos después de terminar.
                            </p>

                            {currentPolygon && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2 text-rose-500"
                                    onClick={clearCurrent}
                                >
                                    <Trash2 className="w-4 h-4" /> Descartar dibujo
                                </Button>
                            )}
                        </div>

                        <div className="pt-6 space-y-3">
                            <Button
                                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold"
                                disabled={!currentPolygon || !selectedUnitId || isSaving}
                                onClick={handleSave}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? "Guardando..." : "Guardar Polígono"}
                            </Button>
                            <Button variant="ghost" className="w-full" onClick={onClose}>
                                Cerrar
                            </Button>
                        </div>
                    </div>

                    {/* Map Container */}
                    <div ref={mapRef} className="flex-1 bg-slate-100 dark:bg-slate-950" />
                </div>
            </DialogContent>
        </Dialog>
    );
}
