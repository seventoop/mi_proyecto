"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Layers, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlueprintUnit } from "./BlueprintEngine";
import type { LoteInfo } from "./LoteDetailModal";

const BlueprintEngine = dynamic(() => import("./BlueprintEngine"), { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center bg-slate-900 rounded-2xl text-slate-400">Cargando motor...</div> });
const LoteDetailModal = dynamic(() => import("./LoteDetailModal"), { ssr: false });

interface PlanosTabProps {
    unidades: BlueprintUnit[];
    proyectoId: string;
    tour360Url?: string | null;
    centerLat?: number;
    centerLng?: number;
}

export default function PlanosTab({ unidades, proyectoId, tour360Url, centerLat, centerLng }: PlanosTabProps) {
    const [mode, setMode] = useState<"2d" | "3d">("2d");
    const [selectedLote, setSelectedLote] = useState<LoteInfo | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Motor de Planos AI</h2>
                    <p className="text-slate-400 text-sm">Gestioná la geometría y mapeo de lotes</p>
                </div>
                <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700">
                    <button
                        onClick={() => setMode("2d")}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                            mode === "2d" ? "bg-brand-orange text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <Square className="w-3.5 h-3.5" /> Vista 2D
                    </button>
                    <button
                        onClick={() => setMode("3d")}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                            mode === "3d" ? "bg-brand-orange text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" /> Vista 3D
                    </button>
                </div>
            </div>

            <BlueprintEngine
                unidades={unidades}
                proyectoId={proyectoId}
                onLoteClick={(u) => setSelectedLote(u as LoteInfo)}
                mode={mode}
                centerLat={centerLat}
                centerLng={centerLng}
            />

            {selectedLote && (
                <LoteDetailModal
                    unidad={selectedLote}
                    onClose={() => setSelectedLote(null)}
                    onReservar={() => setSelectedLote(null)}
                    tour360Url={tour360Url || undefined}
                />
            )}
        </div>
    );
}
