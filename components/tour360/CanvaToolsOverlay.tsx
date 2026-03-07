"use client";

import { useState, useRef, useCallback } from "react";
import { Type, ArrowRight, Image as ImageIcon, MapPin, X, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CanvaAnchor {
    id: string;
    type: "text" | "arrow" | "icon" | "hotspot";
    x: number;
    y: number;
    content: string;
    scale: number;
    opacity: number;
    color?: string;
}

interface CanvaToolsOverlayProps {
    anchors: CanvaAnchor[];
    onChange: (anchors: CanvaAnchor[]) => void;
    onSave: () => void;
}

const TOOLS = [
    { type: "text" as const,    icon: Type,       label: "Texto" },
    { type: "arrow" as const,   icon: ArrowRight,  label: "Flecha" },
    { type: "icon" as const,    icon: MapPin,      label: "Ícono" },
    { type: "hotspot" as const, icon: MapPin,      label: "Lote" },
];

function uid() {
    return Math.random().toString(36).slice(2);
}

export default function CanvaToolsOverlay({ anchors, onChange, onSave }: CanvaToolsOverlayProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<CanvaAnchor["type"] | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedAnchor = anchors.find(a => a.id === selectedId);

    const addAnchor = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!activeTool || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const newAnchor: CanvaAnchor = {
            id: uid(),
            type: activeTool,
            x,
            y,
            content: activeTool === "text" ? "Nuevo texto" : activeTool === "arrow" ? "→" : activeTool === "icon" ? "📍" : "",
            scale: 1,
            opacity: 1,
            color: "#ffffff",
        };
        onChange([...anchors, newAnchor]);
        setSelectedId(newAnchor.id);
        setActiveTool(null);
    };

    const updateAnchor = (id: string, patch: Partial<CanvaAnchor>) => {
        onChange(anchors.map(a => a.id === id ? { ...a, ...patch } : a));
    };

    const deleteAnchor = (id: string) => {
        onChange(anchors.filter(a => a.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const duplicateAnchor = (a: CanvaAnchor) => {
        const copy = { ...a, id: uid(), x: a.x + 2, y: a.y + 2 };
        onChange([...anchors, copy]);
        setSelectedId(copy.id);
    };

    // Drag anchor
    const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

    const onAnchorMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedId(id);
        const a = anchors.find(x => x.id === id);
        if (!a) return;
        dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: a.x, origY: a.y };
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        const d = dragRef.current;
        if (!d || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - d.startX) / rect.width) * 100;
        const dy = ((e.clientY - d.startY) / rect.height) * 100;
        updateAnchor(d.id, { x: Math.max(0, Math.min(100, d.origX + dx)), y: Math.max(0, Math.min(100, d.origY + dy)) });
    }, [anchors]);

    const onMouseUp = () => { dragRef.current = null; };

    return (
        <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ cursor: activeTool ? "crosshair" : "default" }}
            onClick={addAnchor}
            onMouseMove={(e) => onMouseMove(e.nativeEvent)}
            onMouseUp={onMouseUp}
        >
            {/* Anchors */}
            {anchors.map(a => (
                <div
                    key={a.id}
                    style={{
                        position: "absolute",
                        left: `${a.x}%`,
                        top: `${a.y}%`,
                        transform: `translate(-50%, -50%) scale(${a.scale})`,
                        opacity: a.opacity,
                        cursor: "move",
                        pointerEvents: "auto",
                        userSelect: "none",
                        zIndex: selectedId === a.id ? 20 : 10,
                    }}
                    onMouseDown={(e) => onAnchorMouseDown(e, a.id)}
                >
                    <div className={cn(
                        "px-2 py-1 rounded text-sm font-bold whitespace-nowrap shadow-lg",
                        selectedId === a.id ? "outline outline-2 outline-blue-400 outline-offset-1" : ""
                    )} style={{ color: a.color || "#fff", background: "rgba(0,0,0,0.55)" }}>
                        {a.content || (a.type === "arrow" ? "→" : a.type === "icon" ? "📍" : a.type)}
                    </div>
                </div>
            ))}

            {/* Left toolbar */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30" onClick={e => e.stopPropagation()}>
                {TOOLS.map(t => (
                    <button
                        key={t.type}
                        title={t.label}
                        onClick={() => setActiveTool(activeTool === t.type ? null : t.type)}
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shadow text-sm transition-colors",
                            activeTool === t.type ? "bg-blue-500 text-white" : "bg-black/60 text-white hover:bg-black/80"
                        )}
                    >
                        <t.icon className="w-4 h-4" />
                    </button>
                ))}
            </div>

            {/* Right panel for selected */}
            {selectedAnchor && (
                <div
                    className="absolute right-3 top-3 z-30 bg-black/80 rounded-xl p-3 w-48 space-y-2 text-xs text-white"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="font-bold text-slate-300 mb-1 uppercase tracking-wider">Propiedades</div>

                    {selectedAnchor.type === "text" && (
                        <input
                            className="w-full bg-white/10 rounded px-2 py-1 text-white text-xs"
                            value={selectedAnchor.content}
                            onChange={e => updateAnchor(selectedAnchor.id, { content: e.target.value })}
                            onClick={e => e.stopPropagation()}
                        />
                    )}
                    <div>
                        <label className="text-slate-400">Escala</label>
                        <input type="range" min="0.5" max="3" step="0.1" value={selectedAnchor.scale}
                            onChange={e => updateAnchor(selectedAnchor.id, { scale: parseFloat(e.target.value) })}
                            className="w-full" />
                    </div>
                    <div>
                        <label className="text-slate-400">Opacidad</label>
                        <input type="range" min="0.1" max="1" step="0.05" value={selectedAnchor.opacity}
                            onChange={e => updateAnchor(selectedAnchor.id, { opacity: parseFloat(e.target.value) })}
                            className="w-full" />
                    </div>
                    <div>
                        <label className="text-slate-400">Color</label>
                        <input type="color" value={selectedAnchor.color || "#ffffff"}
                            onChange={e => updateAnchor(selectedAnchor.id, { color: e.target.value })}
                            className="w-full h-7 rounded cursor-pointer" />
                    </div>
                    <div className="flex gap-1 pt-1">
                        <button onClick={() => duplicateAnchor(selectedAnchor)} className="flex-1 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white" title="Duplicar">
                            <Copy className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => deleteAnchor(selectedAnchor.id)} className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white" title="Eliminar">
                            <Trash2 className="w-3 h-3 mx-auto" />
                        </button>
                        <button onClick={() => setSelectedId(null)} className="flex-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white" title="Cerrar">
                            <X className="w-3 h-3 mx-auto" />
                        </button>
                    </div>
                </div>
            )}

            {/* Save */}
            <button
                onClick={(e) => { e.stopPropagation(); onSave(); }}
                className="absolute bottom-3 right-3 z-30 px-3 py-1.5 bg-brand-orange text-white text-xs font-bold rounded-lg shadow hover:bg-brand-orangeDark transition-colors"
            >
                Guardar anotaciones
            </button>
        </div>
    );
}
