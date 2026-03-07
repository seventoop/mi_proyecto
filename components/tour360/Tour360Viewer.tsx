"use client";

import { useState, useEffect } from "react";
import { Maximize, Link2, ExternalLink, Palette, MapPin, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveTour360Anchors, updateProyectoTour360Url } from "@/lib/actions/tour360";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CanvaToolsOverlay, { CanvaAnchor } from "./CanvaToolsOverlay";

interface Tour360ViewerUnit {
    id: string;
    numero: string;
    estado: string;
    coordenadasTour?: { x: number; y: number } | null;
}

interface Tour360ViewerProps {
    proyectoId: string;
    tour360Url?: string | null;
    unidades: Tour360ViewerUnit[];
    isAdmin: boolean;
    tours?: Array<{ id: string; anchors?: any }>;
}

export default function Tour360Viewer({ proyectoId, tour360Url: initialUrl, unidades, isAdmin, tours = [] }: Tour360ViewerProps) {
    const router = useRouter();
    const [url, setUrl] = useState(initialUrl || "");
    const [urlInput, setUrlInput] = useState(initialUrl || "");
    const [showCanvaTools, setShowCanvaTools] = useState(false);
    const [showHotspots, setShowHotspots] = useState(true);
    const [anchors, setAnchors] = useState<CanvaAnchor[]>([]);
    const [savingUrl, setSavingUrl] = useState(false);
    const [savingAnchors, setSavingAnchors] = useState(false);

    // Hydrate anchors from first tour if available
    useEffect(() => {
        const firstTour = tours[0];
        if (!firstTour) return;
        const raw = firstTour.anchors;
        if (!raw) return;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) setAnchors(parsed);
    }, [tours]);

    const handleSaveUrl = async () => {
        if (!urlInput.trim()) return;
        setSavingUrl(true);
        const res = await updateProyectoTour360Url(proyectoId, urlInput.trim());
        setSavingUrl(false);
        if (res.success) {
            setUrl(urlInput.trim());
            toast.success("URL del tour guardada");
            router.refresh();
        } else {
            toast.error(res.error || "Error al guardar URL");
        }
    };

    const handleSaveAnchors = async () => {
        const tourId = tours[0]?.id;
        if (!tourId) { toast.error("No hay tour asociado"); return; }
        setSavingAnchors(true);
        const res = await saveTour360Anchors(tourId, anchors);
        setSavingAnchors(false);
        if (res.success) toast.success("Anotaciones guardadas");
        else toast.error(res.error || "Error");
    };

    const handleUnitClick = (u: Tour360ViewerUnit) => {
        // Dispatch custom event to parent if they want to handle lote click
        window.dispatchEvent(new CustomEvent("tour360:loteClick", { detail: u }));
    };

    // ─── No URL: show placeholder ────────────────────────────────────────────

    if (!url) {
        return (
            <div className="glass-card p-8 flex flex-col items-center justify-center gap-6 min-h-[400px]">
                <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center">
                    <ExternalLink className="w-8 h-8 text-brand-orange" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Tour 360° no configurado</h3>
                    <p className="text-sm text-slate-400">Pegá la URL del tour para habilitar la experiencia inmersiva</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2 w-full max-w-md">
                        <input
                            type="url"
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder="https://laesfera360.com.ar/tours/..."
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                        />
                        <button
                            onClick={handleSaveUrl}
                            disabled={savingUrl}
                            className="px-4 py-2 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orangeDark disabled:opacity-50 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ─── Has URL: show iframe ────────────────────────────────────────────────

    const hotspotsWithCoords = unidades.filter(u => u.coordenadasTour);

    return (
        <div className="space-y-3">
            <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl" style={{ height: 600 }}>
                <iframe
                    src={url}
                    className="w-full h-full"
                    allowFullScreen
                    style={{ border: "none" }}
                    title="Tour 360°"
                />

                {/* Hotspot pins overlay */}
                {showHotspots && hotspotsWithCoords.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                        {hotspotsWithCoords.map(u => {
                            const coords = u.coordenadasTour!;
                            const ESTADO_BG: Record<string, string> = { DISPONIBLE: "#22c55e", RESERVADO: "#f59e0b", RESERVADA: "#f59e0b", VENDIDO: "#ef4444", VENDIDA: "#ef4444" };
                            return (
                                <div
                                    key={u.id}
                                    style={{ position: "absolute", left: `${coords.x}%`, top: `${coords.y}%`, transform: "translate(-50%,-100%)", pointerEvents: "auto", cursor: "pointer", zIndex: 10 }}
                                    onClick={() => handleUnitClick(u)}
                                    title={`Lote #${u.numero}`}
                                >
                                    <div style={{ background: ESTADO_BG[u.estado] || "#f97316", color: "#fff", fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 9999, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
                                        #{u.numero}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Canva overlay (admin only) */}
                {isAdmin && showCanvaTools && (
                    <CanvaToolsOverlay
                        anchors={anchors}
                        onChange={setAnchors}
                        onSave={handleSaveAnchors}
                    />
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
                <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Nueva pestaña
                </a>
                <button
                    onClick={() => document.querySelector("iframe")?.requestFullscreen()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                    <Maximize className="w-3.5 h-3.5" /> Pantalla completa
                </button>
                <button
                    onClick={() => { navigator.clipboard.writeText(url); toast.success("URL copiada"); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                    <Link2 className="w-3.5 h-3.5" /> Compartir
                </button>

                {isAdmin && (
                    <>
                        <button
                            onClick={() => { setShowCanvaTools(s => !s); }}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                                showCanvaTools ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200")}
                        >
                            <Palette className="w-3.5 h-3.5" /> Herramientas
                        </button>
                        <button
                            onClick={() => setShowHotspots(s => !s)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                                showHotspots ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200")}
                        >
                            <MapPin className="w-3.5 h-3.5" /> Hotspots
                            {hotspotsWithCoords.length > 0 && <span className="ml-1 bg-white/20 rounded-full px-1.5">{hotspotsWithCoords.length}</span>}
                        </button>
                        {/* Change URL */}
                        <div className="ml-auto flex gap-2">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                placeholder="Cambiar URL del tour..."
                                className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-64 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                            />
                            <button onClick={handleSaveUrl} disabled={savingUrl || urlInput === url} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-orange text-white disabled:opacity-50 hover:bg-brand-orangeDark transition-colors">
                                {savingUrl ? "Guardando..." : "Actualizar"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
