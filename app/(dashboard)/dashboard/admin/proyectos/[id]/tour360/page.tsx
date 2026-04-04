"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import TourCreator, { Scene } from "@/components/tour360/tour-creator";
import { Loader2, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { normalizeTourMediaCategory } from "@/lib/tour-media";

interface Tour {
    id: string;
    nombre: string;
    scenes?: any[];
}

function dbScenestoCreatorScenes(tour: Tour): Scene[] {
    if (tour.scenes && tour.scenes.length > 0) {
        return tour.scenes.map((s: any) => ({
            id: s.id, title: s.title, imageUrl: s.imageUrl, isDefault: s.isDefault,
            category: normalizeTourMediaCategory(s),
            hotspots: (s.hotspots || []).map((h: any) => ({
                id: h.id, type: h.type?.toLowerCase() || 'info', pitch: h.pitch, yaw: h.yaw,
                text: h.text || '', unidadId: h.unidadId || '', targetSceneId: h.targetSceneId,
            })),
            polygons: [], floatingLabels: [],
        }));
    }
    return [];
}

export default function TourPage() {
    const params = useParams();
    const router = useRouter();
    const [tours, setTours] = useState<Tour[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTourName, setNewTourName] = useState("");

    useEffect(() => {
        fetchTours();
    }, [params.id]);

    const fetchTours = async () => {
        try {
            const { getProjectTours } = await import("@/lib/actions/tours");
            const res = await getProjectTours(params.id as string);
            if (res.success && res.data) {
                setTours(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch tours", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTour = async () => {
        if (!newTourName.trim()) return;

        try {
            const res = await fetch("/api/tours", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    proyectoId: params.id,
                    nombre: newTourName,
                    scenes: [],
                }),
            });
            const newTour = await res.json();
            setTours([newTour, ...tours]);
            setSelectedTour(newTour);
            setIsCreating(false);
            setNewTourName("");
        } catch (error) {
            console.error("Failed to create tour", error);
        }
    };

    const handleSaveScenes = async (scenes: Scene[]) => {
        if (!selectedTour) return false;

        try {
            const res = await fetch(`/api/tours/${selectedTour.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scenes: scenes,
                }),
            });
            const updatedTour = await res.json();
            if (!res.ok) throw new Error(updatedTour?.error || "Error al guardar la galería");
            setTours(tours.map(t => t.id === updatedTour.id ? updatedTour : t));
            alert("Galería guardada correctamente");
            return true;
        } catch (error) {
            console.error("Failed to save tour", error);
            alert("Error al guardar la galería");
            return false;
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
    }

    if (selectedTour) {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => setSelectedTour(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Editando: {selectedTour.nombre}</h1>
                </div>
                <TourCreator
                    proyectoId={params.id as string}
                    tourId={selectedTour.id}
                    initialScenes={dbScenestoCreatorScenes(selectedTour)}
                    onSave={handleSaveScenes}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Galería de Imágenes</h1>
                    <p className="text-slate-500 mt-1">Organizá el Tour 360 y el resto del material visual del proyecto en un solo lugar.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
                >
                    <Plus className="w-4 h-4" /> Nueva Galería
                </button>
            </div>

            {isCreating && (
                <div className="glass-card p-4 animate-slide-up bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-3">Crear Nueva Galería</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Nombre de la galería (ej. Recorrido Principal)"
                            value={newTourName}
                            onChange={(e) => setNewTourName(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        />
                        <button
                            onClick={handleCreateTour}
                            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl"
                        >
                            Crear
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tours.map(tour => (
                    <div
                        key={tour.id}
                        onClick={() => setSelectedTour(tour)}
                        className="group relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-brand-500/50 transition-all hover:shadow-xl"
                    >
                        {(() => {
                            const scenes = dbScenestoCreatorScenes(tour);
                            return scenes.length > 0 ? (
                                <img
                                    src={scenes[0].imageUrl}
                                    alt={tour.nombre}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900">
                                    <span className="text-sm">Sin escenas</span>
                                </div>
                            );
                        })()}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                            <h3 className="text-white font-bold text-lg">{tour.nombre}</h3>
                            <p className="text-white/60 text-xs">{(tour.scenes || []).length} escenas</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
