"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Plus, Save, ChevronUp, ChevronDown, Loader2, Camera, MapPin, Info, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    createTourScene, deleteTourScene, updateTourSceneHotspots,
    reorderTourScenes, uploadTourSceneImage, type PannellumHotspot
} from "@/lib/actions/tour-scenes";
import type { PannellumScene } from "./PannellumViewer";

interface TourAdminProps {
    tourId: string;
    proyectoId: string;
    scenes: PannellumScene[];
    unidades?: Array<{ id: string; numero: string }>;
    onUpdate: () => void;
}

const generateId = () => Math.random().toString(36).slice(2);

const HOTSPOT_TYPES: Array<{ value: PannellumHotspot["type"]; label: string; icon: any; color: string }> = [
    { value: "info",  label: "Info",     icon: Info,   color: "text-emerald-400" },
    { value: "scene", label: "Ir a escena", icon: Route, color: "text-blue-400" },
    { value: "unit",  label: "Lote",     icon: MapPin, color: "text-amber-400" },
];

export default function TourAdmin({ tourId, proyectoId, scenes, unidades = [], onUpdate }: TourAdminProps) {
    const [uploading, setUploading] = useState(false);
    const [selectedScene, setSelectedScene] = useState<PannellumScene | null>(scenes[0] || null);
    const [hotspots, setHotspots] = useState<PannellumHotspot[]>(
        selectedScene?.pannellumHotspots || []
    );
    const [savingHotspots, setSavingHotspots] = useState(false);
    const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadProgress = useRef(0);

    // ── Scene selection ────────────────────────────────────────────────────────

    const selectScene = (scene: PannellumScene) => {
        setSelectedScene(scene);
        setHotspots(scene.pannellumHotspots || []);
        setSelectedHotspot(null);
    };

    // ── Upload photo ───────────────────────────────────────────────────────────

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadRes = await uploadTourSceneImage(formData, tourId);
            if (!uploadRes.success || !uploadRes.url) {
                toast.error(uploadRes.error || "Error al subir imagen");
                return;
            }

            // Create thumbnail: draw 320x160 canvas from the image
            let thumbUrl: string | undefined;
            try {
                thumbUrl = await createThumbnail(file);
                if (thumbUrl) {
                    const thumbBlob = await (await fetch(thumbUrl)).blob();
                    const thumbForm = new FormData();
                    thumbForm.append("file", new File([thumbBlob], `thumb_${file.name}`, { type: "image/jpeg" }));
                    const thumbRes = await uploadTourSceneImage(thumbForm, tourId);
                    if (thumbRes.success) thumbUrl = thumbRes.url;
                    else thumbUrl = undefined;
                }
            } catch { thumbUrl = undefined; }

            const createRes = await createTourScene(tourId, {
                title: file.name.replace(/\.[^.]+$/, ""),
                imageUrl: uploadRes.url,
                thumbnailUrl: thumbUrl,
                orden: scenes.length,
            });

            if (createRes.success) {
                toast.success("Escena creada");
                onUpdate();
            } else {
                toast.error((createRes as any).error || "Error al crear escena");
            }
        } catch (err) {
            toast.error("Error inesperado");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    // ── Delete scene ───────────────────────────────────────────────────────────

    const handleDeleteScene = async (sceneId: string) => {
        if (!confirm("¿Eliminar esta escena?")) return;
        const res = await deleteTourScene(sceneId);
        if (res.success) {
            toast.success("Escena eliminada");
            if (selectedScene?.id === sceneId) setSelectedScene(null);
            onUpdate();
        } else {
            toast.error((res as any).error || "Error");
        }
    };

    // ── Reorder scenes ─────────────────────────────────────────────────────────

    const handleReorder = async (sceneId: string, dir: "up" | "down") => {
        const idx = scenes.findIndex(s => s.id === sceneId);
        if (idx < 0) return;
        const newOrder = [...scenes];
        const swapIdx = dir === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= newOrder.length) return;
        [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
        await reorderTourScenes(newOrder.map(s => s.id));
        onUpdate();
    };

    // ── Hotspot editor ─────────────────────────────────────────────────────────

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!imgRef.current) return;
        const rect = imgRef.current.getBoundingClientRect();
        const xRatio = (e.clientX - rect.left) / rect.width;
        const yRatio = (e.clientY - rect.top) / rect.height;
        const yaw = (xRatio - 0.5) * 360;
        const pitch = (0.5 - yRatio) * 180;

        const newHotspot: PannellumHotspot = {
            id: generateId(),
            pitch: parseFloat(pitch.toFixed(2)),
            yaw: parseFloat(yaw.toFixed(2)),
            type: "info",
            text: "Nuevo hotspot",
        };
        setHotspots(hs => [...hs, newHotspot]);
        setSelectedHotspot(newHotspot.id);
    };

    const updateHotspot = (id: string, patch: Partial<PannellumHotspot>) => {
        setHotspots(hs => hs.map(h => h.id === id ? { ...h, ...patch } : h));
    };

    const removeHotspot = (id: string) => {
        setHotspots(hs => hs.filter(h => h.id !== id));
        if (selectedHotspot === id) setSelectedHotspot(null);
    };

    const handleSaveHotspots = async () => {
        if (!selectedScene) return;
        setSavingHotspots(true);
        const res = await updateTourSceneHotspots(selectedScene.id, hotspots);
        setSavingHotspots(false);
        if (res.success) { toast.success("Hotspots guardados"); onUpdate(); }
        else toast.error(res.error || "Error");
    };

    const selHotspot = hotspots.find(h => h.id === selectedHotspot);

    return (
        <div className="space-y-6">
            {/* ── Upload section ── */}
            <div className="glass-card p-5">
                <h3 className="font-bold text-sm text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-brand-orange" /> Subir foto 360°
                </h3>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 hover:border-brand-orange hover:text-brand-orange transition-all w-full justify-center"
                >
                    {uploading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                        : <><Upload className="w-4 h-4" /> Seleccionar imagen equirectangular</>
                    }
                </button>
                <p className="text-xs text-slate-400 mt-2 text-center">JPG/PNG · Relación 2:1 recomendada (ej: 4096×2048px)</p>
            </div>

            {/* ── Scenes list ── */}
            {scenes.length > 0 && (
                <div className="glass-card p-5">
                    <h3 className="font-bold text-sm text-slate-700 dark:text-white mb-3">Escenas ({scenes.length})</h3>
                    <div className="space-y-2">
                        {scenes.map((scene, i) => (
                            <div
                                key={scene.id}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all",
                                    selectedScene?.id === scene.id
                                        ? "border-brand-orange bg-brand-orange/5"
                                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                                )}
                                onClick={() => selectScene(scene)}
                            >
                                <div className="w-12 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                                    {scene.thumbnailUrl
                                        ? <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">{i + 1}</div>
                                    }
                                </div>
                                <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{scene.title}</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleReorder(scene.id, "up"); }} disabled={i === 0} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleReorder(scene.id, "down"); }} disabled={i === scenes.length - 1} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteScene(scene.id); }} className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Hotspot editor ── */}
            {selectedScene && (
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-sm text-slate-700 dark:text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-amber-400" />
                            Hotspots — {selectedScene.title}
                        </h3>
                        <button
                            onClick={handleSaveHotspots}
                            disabled={savingHotspots}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                            {savingHotspots ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Guardar
                        </button>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">Click sobre la imagen para agregar un hotspot</p>

                    {/* Equirectangular preview */}
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-4" style={{ aspectRatio: "2/1" }}>
                        <img
                            ref={imgRef}
                            src={selectedScene.imageUrl}
                            alt={selectedScene.title}
                            className="w-full h-full object-cover cursor-crosshair"
                            onClick={handleImageClick}
                            draggable={false}
                        />
                        {/* Hotspot markers */}
                        {hotspots.map(h => {
                            const xPct = (h.yaw / 360 + 0.5) * 100;
                            const yPct = (0.5 - h.pitch / 180) * 100;
                            const typeInfo = HOTSPOT_TYPES.find(t => t.value === h.type);
                            return (
                                <div
                                    key={h.id}
                                    style={{ position: "absolute", left: `${xPct}%`, top: `${yPct}%`, transform: "translate(-50%,-50%)" }}
                                    className={cn(
                                        "w-5 h-5 rounded-full cursor-pointer border-2 border-white shadow-lg transition-transform hover:scale-125",
                                        h.type === "info" ? "bg-emerald-500" : h.type === "scene" ? "bg-blue-500" : "bg-amber-500",
                                        selectedHotspot === h.id && "ring-2 ring-white scale-125"
                                    )}
                                    onClick={(e) => { e.stopPropagation(); setSelectedHotspot(h.id === selectedHotspot ? null : h.id); }}
                                    title={h.text || h.type}
                                />
                            );
                        })}
                    </div>

                    {/* Selected hotspot editor */}
                    {selHotspot && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Editar hotspot</span>
                                <button onClick={() => removeHotspot(selHotspot.id)} className="text-xs text-rose-400 hover:text-rose-600 flex items-center gap-1">
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                            </div>
                            <div className="flex gap-2">
                                {HOTSPOT_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => updateHotspot(selHotspot.id, { type: t.value })}
                                        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                                            selHotspot.type === t.value
                                                ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                                                : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400"
                                        )}
                                    >
                                        <t.icon className={cn("w-3 h-3", t.color)} /> {t.label}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Texto</label>
                                <input
                                    type="text"
                                    value={selHotspot.text || ""}
                                    onChange={e => updateHotspot(selHotspot.id, { text: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                                />
                            </div>
                            {selHotspot.type === "scene" && (
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Escena destino</label>
                                    <select
                                        value={selHotspot.targetSceneId || ""}
                                        onChange={e => updateHotspot(selHotspot.id, { targetSceneId: e.target.value })}
                                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                                    >
                                        <option value="">Seleccionar escena...</option>
                                        {scenes.filter(s => s.id !== selectedScene.id).map(s => (
                                            <option key={s.id} value={s.id}>{s.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {selHotspot.type === "unit" && unidades.length > 0 && (
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Lote</label>
                                    <select
                                        value={selHotspot.unidadId || ""}
                                        onChange={e => {
                                            const u = unidades.find(u => u.id === e.target.value);
                                            updateHotspot(selHotspot.id, { unidadId: e.target.value, unidadNumero: u?.numero });
                                        }}
                                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                                    >
                                        <option value="">Seleccionar lote...</option>
                                        {unidades.map(u => (
                                            <option key={u.id} value={u.id}>#{u.numero}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <p className="text-[10px] text-slate-400">
                                pitch={selHotspot.pitch.toFixed(1)}° yaw={selHotspot.yaw.toFixed(1)}°
                            </p>
                        </div>
                    )}

                    {hotspots.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">Click sobre la imagen para agregar hotspots</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Canvas thumbnail helper ──────────────────────────────────────────────────

async function createThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 160;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, 320, 160);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
        img.src = url;
    });
}
