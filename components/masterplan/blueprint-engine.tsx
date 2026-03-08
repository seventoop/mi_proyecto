"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileCode, CheckCircle2, Layers, RefreshCw, Plus, Minus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMasterplanStore } from "@/lib/masterplan-store";
import {
    parseBlueprintSVG, parseBlueprintDXF,
    type ExtractedPath, type DxfParseResult,
} from "@/lib/blueprint-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlueprintEngineProps {
    proyectoId: string;
}

// ─── SVG Builder ─────────────────────────────────────────────────────────────

function buildSVG(data: DxfParseResult, fillLayer: string, visible: Set<string>): string {
    // Sort by bboxArea DESC — large polygons first, small lots render on top
    const sorted = [...data.paths].sort((a, b) => b.bboxArea - a.bboxArea);

    const elements = sorted
        .filter(p => visible.has(p.layer))
        .map(p => {
            const isFill = p.layer === fillLayer && p.pathData.includes("Z");
            const fill = isFill ? "rgba(16,185,129,0.12)" : "none";
            const stroke = isFill ? "#10b981" : "#334155";
            return `<path id="${p.id}" d="${p.pathData}" fill="${fill}" stroke="${stroke}" stroke-width="${data.strokeWidth}" vector-effect="non-scaling-stroke" style="cursor:pointer" />`;
        });

    return `<svg viewBox="${data.viewBox}" xmlns="http://www.w3.org/2000/svg">\n${elements.join("\n")}\n</svg>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlueprintEngine({ proyectoId }: BlueprintEngineProps) {
    const units = useMasterplanStore((s) => s.units);

    // File / DXF state
    const [dxfData, setDxfData] = useState<DxfParseResult | null>(null);
    const [selectedLayer, setSelectedLayer] = useState<string>("");
    const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
    const [selectedPath, setSelectedPath] = useState<ExtractedPath | null>(null);
    const [processing, setProcessing] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Pan / zoom
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Pan / zoom handlers ───────────────────────────────────────────────────

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        isPanning.current = true;
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    };
    const onMouseUp = () => { isPanning.current = false; };
    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.max(0.1, Math.min(10, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };

    // ── File upload ───────────────────────────────────────────────────────────

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setProcessing(true);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            const isBinary = /[\x00-\x08\x0E-\x1F\x80-\xFF]/.test(content.slice(0, 1000));
            const isSvg = content.trim().toLowerCase().startsWith("<svg") || content.includes("<svg");

            if (isBinary && !isSvg) {
                alert("El archivo parece ser binario (posiblemente .DWG). Exportalo como DXF ASCII o SVG.");
                setProcessing(false);
                e.target.value = "";
                return;
            }

            try {
                let result: DxfParseResult;

                if (isSvg) {
                    const paths = parseBlueprintSVG(content);
                    result = {
                        paths,
                        layers: [{ name: "0", count: paths.length }],
                        viewBox: "0 0 1000 1000",
                        strokeWidth: 1,
                    };
                } else {
                    result = parseBlueprintDXF(content);
                }

                setDxfData(result);
                // Auto-select the layer with most polygons
                const autoLayer = result.layers[0]?.name || "0";
                setSelectedLayer(autoLayer);
                setVisibleLayers(new Set(result.layers.map(l => l.name)));
                setPan({ x: 0, y: 0 });
                setZoom(1);
                setSelectedPath(null);
            } catch (err: any) {
                alert(`Error al procesar: ${err.message || "Formato no reconocido"}. Asegurate de exportar como DXF ASCII.`);
            }

            setProcessing(false);
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    // ── Sync ─────────────────────────────────────────────────────────────────

    const handleSync = useCallback(async () => {
        if (!dxfData) return;
        setSyncing(true);
        try {
            // Only send paths from the selected layer
            const layerPaths = dxfData.paths.filter(p => p.layer === selectedLayer);
            const res = await fetch(`/api/proyectos/${proyectoId}/blueprint/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    units: layerPaths.map(p => ({
                        id: p.id,
                        pathData: p.pathData,
                        center: p.center,
                        layer: p.layer,
                    }))
                })
            });
            if (res.ok) {
                alert(`Sincronizado ${layerPaths.length} polígonos de la capa "${selectedLayer}".`);
            } else {
                throw new Error("Sync failed");
            }
        } catch {
            alert("Error al sincronizar el plano.");
        } finally {
            setSyncing(false);
        }
    }, [dxfData, selectedLayer, proyectoId]);

    // ── SVG click handler ─────────────────────────────────────────────────────

    const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as SVGPathElement;
        if (target.tagName !== "path" || !dxfData) return;
        const pathId = target.getAttribute("id");
        const found = dxfData.paths.find(p => p.id === pathId);
        setSelectedPath(found || null);
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    const svgContent = dxfData ? buildSVG(dxfData, selectedLayer, visibleLayers) : null;
    const mappedCount = dxfData ? dxfData.paths.filter(p => p.layer === selectedLayer).length : 0;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg">
                        <FileCode className="w-4 h-4 text-brand-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Motor de Planos</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tight">DXF / SVG → Masterplan</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Upload */}
                    <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                        <Upload className="w-3 h-3" />
                        Cargar DXF/DWG
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".svg,.dxf"
                            onChange={handleFileUpload}
                        />
                    </label>

                    {/* Sync — only visible when SVG loaded */}
                    {svgContent && (
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
                        >
                            <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                            Sincronizar Masterplan
                        </button>
                    )}

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-xl px-1 py-0.5">
                        <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Plus className="w-3 h-3 text-slate-500" />
                        </button>
                        <span className="text-[10px] font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Minus className="w-3 h-3 text-slate-500" />
                        </button>
                        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <RotateCcw className="w-3 h-3 text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main workspace */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* Canvas */}
                <div
                    className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden"
                    style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onWheel={onWheel}
                    onClick={handleSvgClick}
                >
                    {!svgContent ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
                            <Upload className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                            <p className="text-sm font-medium text-slate-400">Cargá un archivo DXF/SVG para comenzar</p>
                            <p className="text-[10px] text-slate-400">Formatos: DXF ASCII, SVG — el canvas estará vacío hasta que subas un plano</p>
                        </div>
                    ) : (
                        <div
                            className="blueprint-canvas w-full h-full"
                            style={{
                                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                                transformOrigin: "center center",
                            }}
                            dangerouslySetInnerHTML={{ __html: svgContent }}
                        />
                    )}

                    {processing && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/70 backdrop-blur-sm z-30 flex items-center justify-center">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                <p className="font-bold text-sm">Procesando geometrías...</p>
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-400">
                        scroll = zoom · drag = pan · click = info
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-5 overflow-y-auto">

                    {/* Stats */}
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resumen</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] text-slate-500 mb-1">Polígonos</p>
                                <p className="text-xl font-bold">{dxfData?.paths.length || 0}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] text-slate-500 mb-1">Mapeados</p>
                                <p className="text-xl font-bold text-emerald-500">{mappedCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Selected path detail */}
                    {selectedPath && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Polígono seleccionado</h4>
                            <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 truncate">{selectedPath.id}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Capa: <span className="text-slate-700 dark:text-slate-300">{selectedPath.layer}</span></p>
                            <p className="text-[10px] text-slate-500">Área bbox: <span className="text-slate-700 dark:text-slate-300">{selectedPath.bboxArea.toFixed(0)} u²</span></p>
                        </div>
                    )}

                    {/* CAPAS panel */}
                    {dxfData && dxfData.layers.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Layers className="w-3 h-3" /> CAPAS
                            </h4>
                            <div className="space-y-1">
                                {dxfData.layers.map(layer => (
                                    <div
                                        key={layer.name}
                                        onClick={() => setSelectedLayer(layer.name)}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                                            selectedLayer === layer.name
                                                ? "bg-emerald-500/10 border border-emerald-500/30"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleLayers.has(layer.name)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setVisibleLayers(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(layer.name)) next.delete(layer.name);
                                                    else next.add(layer.name);
                                                    return next;
                                                });
                                            }}
                                            className="w-3.5 h-3.5 accent-emerald-500 shrink-0"
                                        />
                                        {selectedLayer === layer.name && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                        )}
                                        <span className="text-xs font-mono flex-1 truncate text-slate-700 dark:text-slate-300">{layer.name}</span>
                                        <span className="text-[10px] font-mono text-slate-400">{layer.count}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                                Sincronización usará capa <strong className="text-slate-600 dark:text-slate-300">{selectedLayer}</strong>
                            </p>
                        </div>
                    )}

                    {/* Lotes Detectados */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lotes Detectados</h4>
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
                            {units.slice(0, 10).map(unit => (
                                <div
                                    key={unit.id}
                                    className="group bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-transparent hover:border-emerald-500/30 transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full shrink-0",
                                            unit.estado === "DISPONIBLE" ? "bg-emerald-500" :
                                                unit.estado === "VENDIDO" ? "bg-red-500" : "bg-orange-500"
                                        )} />
                                        <div>
                                            <p className="text-xs font-bold">Lote {unit.numero}</p>
                                            <p className="text-[9px] text-slate-500">{unit.manzanaNombre || "—"}</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-50" />
                                </div>
                            ))}
                            {units.length === 0 && (
                                <p className="text-[10px] text-slate-400 text-center py-4">Sin lotes en el store</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover highlight via CSS */}
            <style jsx global>{`
                .blueprint-canvas svg path:hover {
                    stroke: #f97316 !important;
                    stroke-width: 2px;
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}
