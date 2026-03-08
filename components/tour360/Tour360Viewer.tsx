"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Eye, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTourScenes } from "@/lib/actions/tour-scenes";
import dynamic from "next/dynamic";
import type { PannellumScene } from "./PannellumViewer";

const PannellumViewer = dynamic(() => import("./PannellumViewer"), {
    ssr: false,
    loading: () => (
        <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl">
            <span className="text-slate-400 animate-pulse">Cargando Tour 360°...</span>
        </div>
    ),
});

const TourAdmin = dynamic(() => import("./TourAdmin"), { ssr: false });

interface Tour360ViewerUnit {
    id: string;
    numero: string;
    estado: string;
}

interface Tour360ViewerProps {
    proyectoId: string;
    tourId?: string;
    isAdmin: boolean;
    unidades?: Tour360ViewerUnit[];
    onLoteClick?: (unidad: Tour360ViewerUnit) => void;
}

type AdminTab = "preview" | "admin";

export default function Tour360Viewer({
    proyectoId, tourId, isAdmin, unidades = [], onLoteClick
}: Tour360ViewerProps) {
    const [scenes, setScenes] = useState<PannellumScene[]>([]);
    const [loading, setLoading] = useState(!!tourId);
    const [adminTab, setAdminTab] = useState<AdminTab>("preview");

    const fetchScenes = useCallback(async () => {
        if (!tourId) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await getTourScenes(tourId);
            if (res.success && res.data) setScenes(res.data as PannellumScene[]);
        } catch { toast.error("Error al cargar escenas"); }
        finally { setLoading(false); }
    }, [tourId]);

    useEffect(() => { fetchScenes(); }, [fetchScenes]);

    const unidadesForAdmin = unidades.map(u => ({ id: u.id, numero: u.numero }));

    // ─── No tourId: show placeholder ──────────────────────────────────────────

    if (!tourId) {
        return (
            <div className="h-[600px] flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-700 gap-4">
                <Camera className="w-16 h-16 text-slate-600" />
                <div className="text-center">
                    <h3 className="text-white font-bold text-lg mb-2">Sin Tour 360° configurado</h3>
                    <p className="text-slate-400 text-sm">Creá un tour desde el menú de Proyectos para habilitar esta sección</p>
                </div>
            </div>
        );
    }

    // ─── Loading ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl">
                <span className="text-slate-400 animate-pulse">Cargando escenas...</span>
            </div>
        );
    }

    // ─── No scenes: show placeholder or admin upload ───────────────────────────

    if (scenes.length === 0) {
        return (
            <div className="space-y-4">
                <div className="h-[500px] flex flex-col items-center justify-center bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700">
                    <Camera className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">Sin fotos 360° cargadas</h3>
                    <p className="text-slate-400 text-sm mb-6 text-center max-w-xs">
                        Subí tus fotos equirectangulares para crear el tour virtual interactivo
                    </p>
                    {isAdmin && (
                        <button
                            onClick={() => setAdminTab("admin")}
                            className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold hover:bg-brand-orangeDark transition-colors"
                        >
                            Subir primera foto 360°
                        </button>
                    )}
                </div>
                {isAdmin && (
                    <TourAdmin
                        tourId={tourId}
                        proyectoId={proyectoId}
                        scenes={[]}
                        unidades={unidadesForAdmin}
                        onUpdate={fetchScenes}
                    />
                )}
            </div>
        );
    }

    // ─── Has scenes ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Admin tab switcher */}
            {isAdmin && (
                <div className="flex gap-1 bg-slate-900/50 border border-white/5 rounded-xl p-1 w-fit">
                    <button
                        onClick={() => setAdminTab("preview")}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            adminTab === "preview" ? "bg-brand-orange text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Eye className="w-3.5 h-3.5" /> Vista Previa
                    </button>
                    <button
                        onClick={() => setAdminTab("admin")}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            adminTab === "admin" ? "bg-brand-orange text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Settings className="w-3.5 h-3.5" /> Administrar
                    </button>
                </div>
            )}

            {/* Content */}
            {(!isAdmin || adminTab === "preview") && (
                <PannellumViewer
                    scenes={scenes}
                    isAdmin={isAdmin}
                    onLoteClick={(unidadId) => {
                        const u = unidades.find(u => u.id === unidadId);
                        if (u) onLoteClick?.(u);
                    }}
                />
            )}

            {isAdmin && adminTab === "admin" && (
                <TourAdmin
                    tourId={tourId}
                    proyectoId={proyectoId}
                    scenes={scenes}
                    unidades={unidadesForAdmin}
                    onUpdate={fetchScenes}
                />
            )}
        </div>
    );
}
