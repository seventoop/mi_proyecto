"use client";

import { useState, useMemo } from "react";
import { Move, Maximize, RotateCw, Layers, Eye, Save, X, ArrowLeftRight, ArrowUpDown } from "lucide-react";
import { MasterplanUnit } from "@/lib/masterplan-store";

export interface OverlayConfig {
    opacity: number;
    scale: number;
    rotateX: number; // Perspective tilt
    rotateZ: number; // Heading rotation
    translateX: number;
    translateY: number;
}

const DEFAULT_CONFIG: OverlayConfig = {
    opacity: 0.6,
    scale: 1,
    rotateX: 45,
    rotateZ: 0,
    translateX: 0,
    translateY: 0,
};

const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDO: "#64748b",
};

interface Tour360OverlayProps {
    units: MasterplanUnit[];
    isVisible: boolean;
    isEditing: boolean;
    initialConfig?: OverlayConfig | null;
    isSaving?: boolean;
    onSave?: (config: OverlayConfig) => void;
    onClose: () => void;
}

function computeViewBox(units: MasterplanUnit[]): string | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    for (const u of units) {
        if (!u.path) continue;
        const nums = u.path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
        if (!nums || nums.length < 2) continue;
        for (let i = 0; i + 1 < nums.length; i += 2) {
            const x = parseFloat(nums[i]);
            const y = parseFloat(nums[i + 1]);
            if (isNaN(x) || isNaN(y)) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            found = true;
        }
    }
    if (!found || !isFinite(minX)) return null;
    const pad = (maxX - minX) * 0.05;
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
}

export default function Tour360Overlay({
    units, isVisible, isEditing, initialConfig, isSaving, onSave, onClose,
}: Tour360OverlayProps) {
    const [config, setConfig] = useState<OverlayConfig>(initialConfig ?? DEFAULT_CONFIG);

    const unitsWithPath = useMemo(() => units.filter((u) => u.path), [units]);
    const viewBox = useMemo(() => computeViewBox(unitsWithPath), [unitsWithPath]);

    if (!isVisible || !viewBox || unitsWithPath.length === 0) return null;

    return (
        <div className="absolute inset-0 z-[2000] pointer-events-none overflow-hidden flex items-center justify-center">

            {/* SVG overlay layer */}
            <div
                className="relative origin-center will-change-transform"
                style={{
                    opacity: config.opacity,
                    transform: `
                        perspective(1000px)
                        translate3d(${config.translateX}px, ${config.translateY}px, 0)
                        scale(${config.scale})
                        rotateX(${config.rotateX}deg)
                        rotateZ(${config.rotateZ}deg)
                    `,
                    pointerEvents: "none",
                }}
            >
                <svg
                    viewBox={viewBox}
                    style={{
                        width: "70vw",
                        height: "70vh",
                        outline: isEditing ? "2px dashed #3b82f6" : "none",
                        outlineOffset: "8px",
                    }}
                >
                    {unitsWithPath.map((unit) => (
                        <path
                            key={unit.id}
                            d={unit.path!}
                            fill={STATUS_COLORS[unit.estado] ?? "#94a3b8"}
                            fillOpacity={0.45}
                            stroke={STATUS_COLORS[unit.estado] ?? "#94a3b8"}
                            strokeWidth="2"
                            strokeOpacity={0.85}
                        />
                    ))}
                </svg>
            </div>

            {/* Edit panel */}
            {isEditing && (
                <div className="absolute bottom-24 right-4 z-[2001] bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white w-64 pointer-events-auto animate-in slide-in-from-right-10">
                    <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-brand-400" />
                            Alinear Lotes
                        </h3>
                        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <label className="w-20 flex-shrink-0">Opacidad</label>
                            <input type="range" min="0.1" max="1" step="0.05"
                                value={config.opacity}
                                onChange={(e) => setConfig((c) => ({ ...c, opacity: parseFloat(e.target.value) }))}
                                className="flex-1 accent-brand-500 h-1.5" />
                        </div>

                        <div className="flex items-center gap-2">
                            <Maximize className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <label className="w-20 flex-shrink-0">Escala</label>
                            <input type="range" min="0.1" max="5" step="0.05"
                                value={config.scale}
                                onChange={(e) => setConfig((c) => ({ ...c, scale: parseFloat(e.target.value) }))}
                                className="flex-1 accent-brand-500 h-1.5" />
                        </div>

                        <div className="flex items-center gap-2">
                            <RotateCw className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <label className="w-20 flex-shrink-0">Rotación</label>
                            <input type="range" min="-180" max="180" step="1"
                                value={config.rotateZ}
                                onChange={(e) => setConfig((c) => ({ ...c, rotateZ: parseFloat(e.target.value) }))}
                                className="flex-1 accent-brand-500 h-1.5" />
                        </div>

                        <div className="flex items-center gap-2">
                            <Move className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <label className="w-20 flex-shrink-0">Perspectiva</label>
                            <input type="range" min="0" max="80" step="1"
                                value={config.rotateX}
                                onChange={(e) => setConfig((c) => ({ ...c, rotateX: parseFloat(e.target.value) }))}
                                className="flex-1 accent-brand-500 h-1.5" />
                        </div>

                        <div className="flex items-center gap-2">
                            <ArrowLeftRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <label className="w-20 flex-shrink-0">Mover H</label>
                            <input type="range" min="-600" max="600" step="5"
                                value={config.translateX}
                                onChange={(e) => setConfig((c) => ({ ...c, translateX: parseFloat(e.target.value) }))}
                                className="flex-1 accent-brand-500 h-1.5" />
                        </div>

                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <label className="w-20 flex-shrink-0">Mover V</label>
                            <input type="range" min="-600" max="600" step="5"
                                value={config.translateY}
                                onChange={(e) => setConfig((c) => ({ ...c, translateY: parseFloat(e.target.value) }))}
                                className="flex-1 accent-brand-500 h-1.5" />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                onClick={() => onSave?.(config)}
                                disabled={isSaving}
                                className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 py-1.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                {isSaving ? (
                                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-3 h-3" />
                                )}
                                {isSaving ? "Guardando..." : "Guardar Alineación"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
