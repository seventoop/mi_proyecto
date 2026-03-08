"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import {
    Upload, FileCode, Layers, RefreshCw,
    Trash2, FileText, ZoomIn, ZoomOut, Maximize2, Minimize2,
    RotateCcw, ScanSearch, Map, Ruler, Download,
    Search, X, Check, LayoutList, HelpCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMasterplanStore } from "@/lib/masterplan-store";
import { parseBlueprintSVG, parseBlueprintDXF, ExtractedPath } from "@/lib/blueprint-utils";

interface BlueprintEngineProps { proyectoId: string; }

type LotEstado = "DISPONIBLE" | "RESERVADO" | "VENDIDO" | "BLOQUEADO";

interface LotRecord {
    pathId: string;
    lotNumber: string;
    areaSqm: number;
    frente: string;
    fondo: string;
    estado: LotEstado;
    precio: string;
    observaciones: string;
}

const ESTADO_CONFIG: Record<LotEstado, { label: string; color: string; bg: string }> = {
    DISPONIBLE: { label: "Disponible", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    RESERVADO:  { label: "Reservado",  color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30"   },
    VENDIDO:    { label: "Vendido",    color: "text-red-600 dark:text-red-400",        bg: "bg-red-500/10 border-red-500/30"       },
    BLOQUEADO:  { label: "Bloqueado",  color: "text-slate-500",                        bg: "bg-slate-500/10 border-slate-500/30"   },
};

const ESTADO_FILL: Record<LotEstado, string> = {
    DISPONIBLE: "rgba(16,185,129,0.18)",
    RESERVADO:  "rgba(245,158,11,0.22)",
    VENDIDO:    "rgba(239,68,68,0.22)",
    BLOQUEADO:  "rgba(100,116,139,0.18)",
};

const ESTADO_CYCLE: LotEstado[] = ["DISPONIBLE", "RESERVADO", "VENDIDO", "BLOQUEADO"];

// ─── Zoom controls (inside TransformWrapper) ─────────────────────────────────
function ZoomControls({ onFullscreen, isFullscreen }: { onFullscreen: () => void; isFullscreen: boolean }) {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    const btn = "w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors";
    return (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
            <button onClick={() => zoomIn()} title="Acercar" className={btn}><ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
            <button onClick={() => zoomOut()} title="Alejar" className={btn}><ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
            <button onClick={() => resetTransform()} title="Restablecer" className={btn}><RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
            <button onClick={onFullscreen} title={isFullscreen ? "Salir pantalla completa" : "Pantalla completa"} className={btn}>
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" /> : <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </button>
        </div>
    );
}

export default function BlueprintEngine({ proyectoId }: BlueprintEngineProps) {
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [stats, setStats] = useState<{ pathsFound: number; labeled: number } | null>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [extractedPaths, setExtractedPaths] = useState<ExtractedPath[]>([]);
    const [isDXF, setIsDXF] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [viewMode, setViewMode] = useState<"analysis" | "blueprint">("analysis");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tooltip, setTooltip] = useState({ visible: false, lot: "", area: "", x: 0, y: 0 });

    // Lot management state
    const [lotRecords, setLotRecords] = useState<LotRecord[]>([]);
    const [activeLotNumber, setActiveLotNumber] = useState<string | null>(null);
    const [tableSearch, setTableSearch] = useState("");
    const [tableFilter, setTableFilter] = useState<LotEstado | "ALL">("ALL");
    const [showTable, setShowTable] = useState(false);
    const [scaleMeters, setScaleMeters] = useState<string>("1");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeRowRef = useRef<HTMLTableRowElement>(null);
    const units = useMasterplanStore((s) => s.units);

    // Scroll active row into view
    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [activeLotNumber]);

    // ─── Build lot records from extracted paths ───────────────────────────────
    const initLotRecords = (paths: ExtractedPath[]) => {
        const records: LotRecord[] = paths
            .filter(p => p.lotNumber)
            .sort((a, b) => {
                const n1 = parseInt(a.lotNumber!), n2 = parseInt(b.lotNumber!);
                return isNaN(n1) || isNaN(n2) ? (a.lotNumber!).localeCompare(b.lotNumber!) : n1 - n2;
            })
            .map(p => ({
                pathId: p.id,
                lotNumber: p.lotNumber!,
                areaSqm: p.areaSqm ?? 0,
                frente: "", fondo: "", estado: "DISPONIBLE" as LotEstado,
                precio: "", observaciones: "",
            }));
        setLotRecords(records);
    };

    const updateLot = (pathId: string, field: keyof LotRecord, value: string) => {
        setLotRecords(prev => prev.map(r => r.pathId === pathId ? { ...r, [field]: value } : r));
    };

    const cycleEstado = (pathId: string, current: LotEstado) => {
        const next = ESTADO_CYCLE[(ESTADO_CYCLE.indexOf(current) + 1) % ESTADO_CYCLE.length];
        updateLot(pathId, "estado", next);
    };

    // ─── Export CSV ───────────────────────────────────────────────────────────
    const exportCSV = () => {
        const s = parseFloat(scaleMeters) || 1;
        const areaHeader = s === 1 ? "Superficie (u²)" : "Superficie (m²)";
        const headers = ["N° Lote", areaHeader, "Frente (m)", "Fondo (m)", "Estado", "Precio", "Observaciones"];
        const rows = lotRecords.map(r => {
            const area = s === 1 ? r.areaSqm.toFixed(2) : (r.areaSqm * s * s).toFixed(0);
            return [r.lotNumber, area, r.frente, r.fondo, r.estado, r.precio, r.observaciones];
        });
        const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `lotes-${file?.name?.replace(".dxf", "") ?? "plano"}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ─── File upload ──────────────────────────────────────────────────────────
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        handleFileUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;
        setFile(uploadedFile); setProcessing(true); setSvgContent(null);
        setStats(null); setExtractedPaths([]); setLotRecords([]);
        setActiveLotNumber(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const isSvg = content.trim().toLowerCase().startsWith("<svg") || content.includes("<svg");
            const isBin = /[\x00-\x08\x0E-\x1F\x80-\xFF]/.test(content.slice(0, 1000));
            if (isBin && !isSvg) {
                alert("El archivo parece binario (.DWG). Exportalo a DXF ASCII o SVG.");
                setProcessing(false); return;
            }
            if (isSvg) {
                setIsDXF(false); setSvgContent(content);
                setTimeout(() => {
                    const paths = parseBlueprintSVG(content);
                    setExtractedPaths(paths); initLotRecords(paths);
                    setStats({ pathsFound: paths.length, labeled: paths.filter(p => p.lotNumber).length });
                    setProcessing(false);
                }, 800);
            } else {
                setIsDXF(true);
                setTimeout(() => {
                    try {
                        const result = parseBlueprintDXF(content);
                        setSvgContent(result.svg); setExtractedPaths(result.paths);
                        initLotRecords(result.paths);
                        setStats({ pathsFound: result.paths.length, labeled: result.paths.filter(p => p.lotNumber).length });
                        if (result.paths.filter(p => p.lotNumber).length > 0) setShowTable(true);
                    } catch (err: any) {
                        alert(`Error al procesar DXF: ${err.message ?? "Formato no reconocido"}.\nExportá como "DXF ASCII" desde AutoCAD.`);
                    }
                    setProcessing(false);
                }, 800);
            }
        };
        reader.readAsText(uploadedFile);
    };

    const handleClear = () => {
        setFile(null); setSvgContent(null); setStats(null); setExtractedPaths([]);
        setLotRecords([]); setIsDXF(false); setViewMode("analysis");
        setActiveLotNumber(null); setShowTable(false);
        setTooltip({ visible: false, lot: "", area: "", x: 0, y: 0 });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSync = async () => {
        if (!svgContent || extractedPaths.length === 0) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/blueprint/sync`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ svgContent, units: extractedPaths.map(p => ({ id: units.find(u => u.numero === p.id.replace("path-", ""))?.id || p.id, pathData: p.pathData, center: p.center })) })
            });
            if (res.ok) alert("Plano sincronizado con éxito.");
            else throw new Error();
        } catch { alert("Error al sincronizar."); }
        finally { setProcessing(false); }
    };

    const handleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) { containerRef.current.requestFullscreen(); setIsFullscreen(true); }
        else { document.exitFullscreen(); setIsFullscreen(false); }
    }, []);

    // ─── SVG mouse events ─────────────────────────────────────────────────────
    const handleMouseOver = (e: React.MouseEvent) => {
        const t = e.target as Element;
        const lot = t.getAttribute?.("data-lot"), area = t.getAttribute?.("data-area");
        if (lot) {
            setTooltip({ visible: true, lot, area: area || "", x: e.clientX, y: e.clientY });
        } else {
            if (tooltip.visible) setTooltip(prev => ({ ...prev, visible: false }));
        }
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (tooltip.visible) setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }));
    };
    const handleMouseLeave = () => setTooltip(t => ({ ...t, visible: false }));
    const handleSvgClick = (e: React.MouseEvent) => {
        const t = e.target as Element;
        const lot = t.getAttribute?.("data-lot");
        if (lot) {
            setActiveLotNumber(lot);
            if (!showTable) setShowTable(true);
        }
    };

    // ─── Filtered lot list ────────────────────────────────────────────────────
    const filteredLots = lotRecords.filter(r => {
        const matchSearch = r.lotNumber.toLowerCase().includes(tableSearch.toLowerCase()) ||
            r.observaciones.toLowerCase().includes(tableSearch.toLowerCase());
        const matchFilter = tableFilter === "ALL" || r.estado === tableFilter;
        return matchSearch && matchFilter;
    });

    // ─── Area formatter with scale factor ────────────────────────────────────
    const formatArea = (u2: number): string => {
        const s = parseFloat(scaleMeters) || 1;
        const m2 = u2 * s * s;
        return s === 1 ? `${u2.toFixed(2)} u²` : `${m2.toFixed(0)} m²`;
    };

    // ─── Dynamic SVG status colors ────────────────────────────────────────────
    const dynamicStyles = lotRecords.map(r =>
        `.blueprint-render path[data-lot="${r.lotNumber}"] { fill: ${ESTADO_FILL[r.estado]} !important; }`
    ).join("\n");

    const activeStyle = activeLotNumber
        ? `.blueprint-render path[data-lot="${activeLotNumber}"] { fill: rgba(249,115,22,0.4) !important; stroke: #f97316 !important; stroke-width: 2 !important; }`
        : "";

    // ─── Status count map ─────────────────────────────────────────────────────
    const statusCounts = (Object.keys(ESTADO_CONFIG) as LotEstado[]).reduce((acc, key) => {
        acc[key] = lotRecords.filter(r => r.estado === key).length;
        return acc;
    }, {} as Record<LotEstado, number>);

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg shrink-0"><FileCode className="w-4 h-4 text-brand-500" /></div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm leading-none">Procesador de Planos AI</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tight mt-0.5">Análisis DXF/SVG</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <input ref={fileInputRef} type="file" className="hidden" accept=".svg,.dxf" onChange={handleFileUpload} />

                    {/* View mode toggle */}
                    {svgContent && (
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                            {(["analysis", "blueprint"] as const).map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)}
                                    className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                                        viewMode === mode ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                                    {mode === "analysis" ? <><ScanSearch className="w-3 h-3" />Análisis</> : <><Map className="w-3 h-3" />Plano</>}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* File name badge */}
                    {file && (
                        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{file.name}</span>
                        </div>
                    )}

                    {/* Upload / Clear */}
                    {svgContent ? (
                        <button onClick={handleClear} className="cursor-pointer bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                            <Trash2 className="w-3 h-3" />Eliminar
                        </button>
                    ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="cursor-pointer bg-brand-500 hover:bg-brand-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5">
                            <Upload className="w-3 h-3" />Subir DXF/SVG
                        </button>
                    )}

                    {/* Scale factor */}
                    {svgContent && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <Ruler className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[10px] text-slate-500">1u =</span>
                            <input
                                type="number" min="0.01" step="0.1"
                                value={scaleMeters}
                                onChange={e => setScaleMeters(e.target.value)}
                                className="w-12 text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 font-semibold"
                            />
                            <span className="text-[10px] text-slate-500">m</span>
                        </div>
                    )}

                    {/* Lot management toggle */}
                    {lotRecords.length > 0 && (
                        <button onClick={() => setShowTable(v => !v)}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                                showTable
                                    ? "bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-500/40")}>
                            <LayoutList className="w-3 h-3" />
                            Gestión
                            {showTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    )}

                    {/* Help */}
                    <div className="relative group">
                        <button className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                            <HelpCircle className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-9 w-64 bg-slate-900 text-white text-[10px] rounded-xl p-3 shadow-2xl border border-slate-700 leading-relaxed z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                            <p className="font-bold mb-1 text-slate-200">Formatos soportados</p>
                            <p className="text-slate-400 mb-2">DXF (AutoCAD, QGIS, Civil 3D) y SVG · Máx 50 MB</p>
                            <p className="font-bold mb-1 text-slate-200">El sistema detecta</p>
                            <p className="text-slate-400 mb-2">LWPOLYLINE, LINE, ARC, CIRCLE, TEXT y MTEXT</p>
                            <p className="font-bold mb-1 text-slate-200">Factor de escala</p>
                            <p className="text-slate-400">Ajustá "1u = X m" para ver las áreas en m² reales.</p>
                        </div>
                    </div>

                    {/* Sync */}
                    {stats && (
                        <button onClick={handleSync} disabled={processing} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5">
                            <RefreshCw className={cn("w-3 h-3", processing && "animate-spin")} />Sincronizar
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main workspace: viewer + summary panel ──────────────────── */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* ── SVG Viewer ──────────────────────────────────────────── */}
                <div
                    className={cn("flex-1 relative overflow-hidden min-h-0 transition-colors duration-200",
                        !svgContent && (isDragging ? "bg-brand-500/10 border-2 border-dashed border-brand-500 cursor-copy" : "bg-slate-100 dark:bg-slate-950 cursor-pointer"),
                        svgContent && (viewMode === "blueprint" ? "bg-white" : "bg-slate-900 dark:bg-slate-950"))}
                    onClick={() => !svgContent && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleDrop}
                >
                    {svgContent && viewMode === "analysis" && (
                        <style dangerouslySetInnerHTML={{ __html: dynamicStyles + "\n" + activeStyle }} />
                    )}

                    {!svgContent ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none">
                            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center shadow-sm transition-colors", isDragging ? "bg-brand-500/20" : "bg-white dark:bg-slate-900")}>
                                <Upload className={cn("w-9 h-9 transition-colors", isDragging ? "text-brand-500" : "text-slate-300")} />
                            </div>
                            <p className={cn("text-base font-semibold", isDragging ? "text-brand-500" : "text-slate-400")}>
                                {isDragging ? "Soltá para cargar el plano" : "Hacé clic o arrastrá tu plano aquí"}
                            </p>
                            <p className="text-xs text-slate-400">Formatos: DXF, SVG · Máximo 50 MB</p>
                        </div>
                    ) : (
                        <TransformWrapper initialScale={1} minScale={0.05} maxScale={30} centerOnInit wheel={{ step: 0.1 }}>
                            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                                <div
                                    className={cn("blueprint-render", viewMode === "blueprint" && "blueprint-mode-raw")}
                                    dangerouslySetInnerHTML={{ __html: svgContent }}
                                    onMouseOver={handleMouseOver}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                    onClick={handleSvgClick}
                                />
                            </TransformComponent>

                            {/* Top-left badges */}
                            <div className="absolute top-3 left-3 z-10 flex gap-2 pointer-events-none">
                                <div className="text-[9px] font-mono text-slate-400 bg-black/40 backdrop-blur-sm px-2 py-1 rounded border border-white/10 flex items-center gap-1">
                                    <Layers className="w-2.5 h-2.5" />{isDXF ? "DXF Processed" : "SVG Mapping"}
                                </div>
                                {isDXF && <div className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 backdrop-blur-sm px-2 py-1 rounded border border-emerald-500/20">ASCII DXF</div>}
                                {stats && <div className="text-[9px] font-mono text-blue-400 bg-blue-500/10 backdrop-blur-sm px-2 py-1 rounded border border-blue-500/20">{stats.pathsFound} polígonos · {stats.labeled} lotes</div>}
                            </div>

                            {/* Status legend */}
                            {viewMode === "analysis" && lotRecords.length > 0 && (
                                <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-xl p-2.5 border border-white/10 flex flex-col gap-1">
                                    {(Object.entries(ESTADO_CONFIG) as [LotEstado, typeof ESTADO_CONFIG[LotEstado]][]).map(([key, cfg]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <div className={cn("w-3 h-3 rounded-sm border", cfg.bg)} />
                                            <span className={cn("text-[9px] font-medium", cfg.color)}>{cfg.label} ({statusCounts[key]})</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <ZoomControls onFullscreen={handleFullscreen} isFullscreen={isFullscreen} />
                        </TransformWrapper>
                    )}

                    {processing && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/70 backdrop-blur-sm z-30 flex items-center justify-center">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                <div className="text-center">
                                    <p className="font-bold text-sm">Escaneando Geometrías...</p>
                                    <p className="text-[10px] text-slate-500">Leyendo lotes, etiquetas y calculando áreas</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Summary Sidebar ──────────────────────────────────────── */}
                <div className="w-56 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen</p>
                    </div>

                    <div className="p-3 flex flex-col gap-3 flex-1">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[9px] text-slate-500 mb-0.5">Polígonos</p>
                                <p className="text-xl font-bold">{stats?.pathsFound || 0}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[9px] text-slate-500 mb-0.5">Lotes ID</p>
                                <p className="text-xl font-bold text-emerald-500">{stats?.labeled || 0}</p>
                            </div>
                        </div>

                        {/* Status counts */}
                        {lotRecords.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Por Estado</p>
                                {(Object.entries(ESTADO_CONFIG) as [LotEstado, typeof ESTADO_CONFIG[LotEstado]][]).map(([key, cfg]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn("w-2.5 h-2.5 rounded-sm border", cfg.bg)} />
                                            <span className="text-[10px] text-slate-600 dark:text-slate-300">{cfg.label}</span>
                                        </div>
                                        <span className={cn("text-[10px] font-bold", cfg.color)}>{statusCounts[key]}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Hint */}
                        {svgContent && (
                            <div className={cn("p-2.5 rounded-xl border text-[10px] leading-relaxed mt-auto",
                                viewMode === "analysis"
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500")}>
                                {viewMode === "analysis"
                                    ? "Clic en un lote para seleccionarlo. Los colores reflejan el estado comercial."
                                    : "Vista técnica. Cambiá a Análisis para interactuar con los lotes."}
                            </div>
                        )}

                        {!svgContent && (
                            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <FileCode className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    Cargá un plano DXF o SVG para ver el análisis aquí.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Lot Management Table (collapsible, full-width) ──────────── */}
            {lotRecords.length > 0 && showTable && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex flex-col" style={{ height: "260px" }}>
                    {/* Table toolbar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <LayoutList className="w-3.5 h-3.5 text-brand-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Gestión de Lotes</span>
                        <span className="text-[10px] text-slate-400 ml-1">{filteredLots.length} de {lotRecords.length}</span>

                        <div className="ml-auto flex items-center gap-2">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                <input
                                    value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                                    placeholder="Buscar lote..."
                                    className="pl-6 pr-6 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 w-36"
                                />
                                {tableSearch && (
                                    <button onClick={() => setTableSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                                        <X className="w-3 h-3 text-slate-400" />
                                    </button>
                                )}
                            </div>

                            {/* Filter */}
                            <select value={tableFilter} onChange={e => setTableFilter(e.target.value as any)}
                                className="py-1 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500">
                                <option value="ALL">Todos los estados</option>
                                {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
                                    <option key={key} value={key}>{cfg.label}</option>
                                ))}
                            </select>

                            <button onClick={exportCSV}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors">
                                <Download className="w-3 h-3" />CSV
                            </button>

                            <button onClick={() => setShowTable(false)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-xs min-w-[700px]">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                                <tr>
                                    {["N° Lote", "Superficie", "Frente (m)", "Fondo (m)", "Estado", "Precio (USD)", "Observaciones"].map(h => (
                                        <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLots.map((lot) => {
                                    const isActive = activeLotNumber === lot.lotNumber;
                                    const cfg = ESTADO_CONFIG[lot.estado];
                                    return (
                                        <tr
                                            key={lot.pathId}
                                            ref={isActive ? activeRowRef : undefined}
                                            onClick={() => setActiveLotNumber(lot.lotNumber)}
                                            className={cn("border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-colors",
                                                isActive
                                                    ? "bg-orange-50 dark:bg-orange-500/5"
                                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40")}
                                        >
                                            {/* N° Lote */}
                                            <td className="px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 mr-1.5 align-middle" />}
                                                {lot.lotNumber}
                                            </td>

                                            {/* Superficie */}
                                            <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">
                                                {formatArea(lot.areaSqm)}
                                            </td>

                                            {/* Frente */}
                                            <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={lot.frente}
                                                    onChange={e => updateLot(lot.pathId, "frente", e.target.value)}
                                                    placeholder="—"
                                                    className="w-16 px-1.5 py-0.5 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-brand-500 hover:border-slate-400"
                                                />
                                            </td>

                                            {/* Fondo */}
                                            <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={lot.fondo}
                                                    onChange={e => updateLot(lot.pathId, "fondo", e.target.value)}
                                                    placeholder="—"
                                                    className="w-16 px-1.5 py-0.5 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-brand-500 hover:border-slate-400"
                                                />
                                            </td>

                                            {/* Estado */}
                                            <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => cycleEstado(lot.pathId, lot.estado)}
                                                    className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all hover:opacity-80", cfg.bg, cfg.color)}>
                                                    {cfg.label}
                                                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                                                </button>
                                            </td>

                                            {/* Precio */}
                                            <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="number" min="0"
                                                    value={lot.precio}
                                                    onChange={e => updateLot(lot.pathId, "precio", e.target.value)}
                                                    placeholder="—"
                                                    className="w-24 px-1.5 py-0.5 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-brand-500 hover:border-slate-400"
                                                />
                                            </td>

                                            {/* Observaciones */}
                                            <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={lot.observaciones}
                                                    onChange={e => updateLot(lot.pathId, "observaciones", e.target.value)}
                                                    placeholder="—"
                                                    className="w-full min-w-[120px] px-1.5 py-0.5 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-brand-500 hover:border-slate-400"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Tooltip ─────────────────────────────────────────────────── */}
            {tooltip.visible && tooltip.lot && (
                <div className="fixed z-[9999] pointer-events-none" style={{ left: tooltip.x + 14, top: tooltip.y - 56 }}>
                    <div className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 shadow-2xl min-w-[130px]">
                        <p className="text-xs font-bold text-emerald-400">Lote {tooltip.lot}</p>
                        {tooltip.area && (
                            <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                                <Ruler className="w-2.5 h-2.5" />{formatArea(parseFloat(tooltip.area))}
                            </p>
                        )}
                        <p className="text-[9px] text-slate-500 mt-1">Clic para seleccionar</p>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .blueprint-render {
                    display: flex; align-items: center; justify-content: center;
                    min-width: 600px; min-height: 400px; padding: 32px;
                }
                .blueprint-render svg { width: 100%; height: auto; display: block; }

                /* Hide original DXF text labels in analysis mode */
                .blueprint-render:not(.blueprint-mode-raw) .dxf-text { display: none; }

                /* Lot polygons: hover + transition */
                .blueprint-render:not(.blueprint-mode-raw) path[data-lot] {
                    cursor: pointer;
                    transition: opacity 0.15s ease, stroke 0.15s ease;
                }
                .blueprint-render:not(.blueprint-mode-raw) path[data-lot]:hover { opacity: 0.75; }

                /* Lot labels: hide in blueprint mode */
                .blueprint-render.blueprint-mode-raw .lot-label { display: none; }

                /* Blueprint mode: clean technical drawing */
                .blueprint-render.blueprint-mode-raw svg { background: white; }
                .blueprint-render.blueprint-mode-raw path,
                .blueprint-render.blueprint-mode-raw polygon { fill: none !important; stroke: #1e293b !important; }
                .blueprint-render.blueprint-mode-raw text { fill: #334155 !important; }
            `}</style>
        </div>
    );
}
