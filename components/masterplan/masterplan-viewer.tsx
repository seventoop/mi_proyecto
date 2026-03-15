"use client";

import React, { memo, useCallback, useRef, useState, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "framer-motion";
import {
    ZoomIn, ZoomOut, Maximize, Maximize2, Minimize2, Filter, Layers as LayersIcon,
    GitCompare, X, FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useMasterplanStore,
    useFilteredUnits,
    MasterplanUnit,
    selectUnits,
} from "@/lib/masterplan-store";
import MasterplanSidePanel from "./masterplan-side-panel";
import MasterplanFilters from "./masterplan-filters";
import MasterplanComparator from "./masterplan-comparator";
import { getProjectBlueprintData } from "@/lib/actions/unidades";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher";

// ─── Zoom wiring component (must live inside TransformWrapper to use useControls) ───
function ZoomButtonWiring({
    zoomInRef,
    zoomOutRef,
    zoomResetRef,
}: {
    zoomInRef: React.RefObject<HTMLButtonElement>;
    zoomOutRef: React.RefObject<HTMLButtonElement>;
    zoomResetRef: React.RefObject<HTMLButtonElement>;
}) {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    useEffect(() => {
        const ziBtn = zoomInRef.current;
        const zoBtn = zoomOutRef.current;
        const zrBtn = zoomResetRef.current;
        const hZi = () => zoomIn(0.5);
        const hZo = () => zoomOut(0.5);
        const hZr = () => resetTransform();
        ziBtn?.addEventListener("click", hZi);
        zoBtn?.addEventListener("click", hZo);
        zrBtn?.addEventListener("click", hZr);
        return () => {
            ziBtn?.removeEventListener("click", hZi);
            zoBtn?.removeEventListener("click", hZo);
            zrBtn?.removeEventListener("click", hZr);
        };
    }, [zoomIn, zoomOut, resetTransform, zoomInRef, zoomOutRef, zoomResetRef]);
    return null;
}

// ─── Status colors ───
const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDO: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDO: "Suspendido",
};

// ─── Tooltip component ───
interface TooltipData {
    x: number;
    y: number;
    unit: MasterplanUnit;
}

const Tooltip = memo(function Tooltip({ data }: { data: TooltipData | null }) {
    if (!data) return null;
    const { unit } = data;
    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 pointer-events-none"
            style={{ left: data.x + 16, top: data.y - 10 }}
        >
            <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-700/50 min-w-[160px]">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Lote {unit.numero}</span>
                    <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: `${STATUS_COLORS[unit.estado]}20`, color: STATUS_COLORS[unit.estado] }}
                    >
                        {STATUS_LABELS[unit.estado]}
                    </span>
                </div>
                <div className="space-y-0.5 text-xs text-slate-300">
                    {unit.superficie && <p>Superficie: <span className="text-white font-medium">{unit.superficie} m²</span></p>}
                    {unit.precio && (
                        <p>Precio: <span className="text-white font-medium">${unit.precio.toLocaleString()} {unit.moneda}</span></p>
                    )}
                    {unit.esEsquina && <p className="text-amber-400 font-medium">★ Esquina</p>}
                </div>
            </div>
        </motion.div>
    );
});

// ─── Single Unit polygon ───
const UnitPolygon = memo(function UnitPolygon({
    unit, isFiltered, isSelected, isHovered, isComparing, showLabels, globalFontSize,
    onMouseEnter, onMouseLeave, onClick, onCompareToggle, onTouchLongPress,
}: {
    unit: MasterplanUnit;
    isFiltered: boolean;
    isSelected: boolean;
    isHovered: boolean;
    isComparing: boolean;
    showLabels: boolean;
    globalFontSize: number;
    onMouseEnter: (e: React.MouseEvent, unit: MasterplanUnit) => void;
    onMouseLeave: () => void;
    onClick: () => void;
    onCompareToggle: (e: React.MouseEvent) => void;
    onTouchLongPress: () => void;
}) {
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleTouchStart = useCallback(() => {
        longPressTimer.current = setTimeout(() => {
            onTouchLongPress();
        }, 500);
    }, [onTouchLongPress]);
    const cancelLongPress = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);
    // Determine geometry from coordenadasMasterplan string
    let path = unit.path;
    let cx = unit.cx;
    let cy = unit.cy;
    let internalId: number | undefined;
    let lotLabel: string | undefined;

    if (!path && (unit as any).coordenadasMasterplan) {
        try {
            const coords = JSON.parse((unit as any).coordenadasMasterplan);
            path = coords.path;
            cx = coords.center?.x;
            cy = coords.center?.y;
            internalId = coords.internalId;
            lotLabel = coords.lotLabel ?? undefined;
        } catch (e) {
            return null;
        }
    }

    if (!path) return null;

    // Parse M/L vertices once: compute BOTH centroid and polygon dimensions for font sizing.
    // Using only uppercase M and L (absolute coords) avoids arc/bezier parameters inflating the box.
    let fontSize = globalFontSize * 0.7; // safe fallback
    let computedCx: number | undefined = cx;
    let computedCy: number | undefined = cy;
    {
        const verts: [number, number][] = [];
        const segments = path.split(/(?=[A-Za-z])/).filter(Boolean);
        for (const seg of segments) {
            const cmd = seg[0];
            if (cmd !== "M" && cmd !== "L") continue;
            const nums = seg.slice(1).match(/-?[\d.]+(?:e[+-]?\d+)?/g);
            if (!nums) continue;
            for (let i = 0; i + 1 < nums.length; i += 2) {
                const px = parseFloat(nums[i]), py = parseFloat(nums[i + 1]);
                if (!isNaN(px) && !isNaN(py)) verts.push([px, py]);
            }
        }
        if (verts.length > 0) {
            const xs = verts.map(v => v[0]);
            const ys = verts.map(v => v[1]);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            // Bounding box center: keeps label at consistent visual height across a row of irregular lots
            computedCx = (minX + maxX) / 2;
            computedCy = (minY + maxY) / 2;
            const pW = maxX - minX;
            const pH = maxY - minY;
            // Use blueprint-utils-style formula — larger coefficients so numbers are readable at default zoom
            fontSize = Math.min(pW * 0.42, pH * 0.54, globalFontSize);
            fontSize = Math.max(fontSize, globalFontSize * 0.20); // floor: always legible
        }
    }

    const fillColor = STATUS_COLORS[unit.estado] || "#94a3b8";
    const opacity = isFiltered ? (isHovered ? 0.85 : 0.55) : 0.12;
    // strokeWidth is in SVG user units; vectorEffect="non-scaling-stroke" keeps
    // the rendered width constant in screen pixels at any zoom level.
    const strokeWidth = isSelected ? 1.5 : isComparing ? 1.2 : isHovered ? 1.0 : 0.5;
    const strokeColor = isSelected ? "#fff" : isComparing ? "#6366f1" : isHovered ? "#fff" : "rgba(255,255,255,0.35)";
    const labelText = internalId != null ? String(internalId) : (unit.numero.split("-")[1] || unit.numero);
    // Sanitize unit.id for use as an XML ID (UUIDs contain hyphens — replace with underscores)
    const clipId = `lp_${unit.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

    return (
        <g
            className="cursor-pointer"
            onMouseEnter={(e) => onMouseEnter(e, unit)}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            onContextMenu={(e) => { e.preventDefault(); onCompareToggle(e); }}
            onTouchStart={handleTouchStart}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
        >
            <defs>
                <clipPath id={clipId}>
                    <path d={path} />
                </clipPath>
            </defs>
            <path
                d={path}
                fill={fillColor}
                fillOpacity={opacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
                style={{ transition: "fill-opacity 0.2s, stroke 0.2s, fill 0.3s" }}
            />
            {isFiltered && (showLabels || isSelected || isHovered) && computedCx !== undefined && computedCy !== undefined && (
                <text
                    x={computedCx}
                    y={computedCy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight="700"
                    fill="#fff"
                    fillOpacity={1}
                    stroke="rgba(0,0,0,0.65)"
                    strokeWidth={fontSize * 0.05}
                    paintOrder="stroke"
                    clipPath={`url(#${clipId})`}
                    className="pointer-events-none select-none"
                >
                    {labelText}
                </text>
            )}
            {isComparing && computedCx !== undefined && computedCy !== undefined && (
                <circle cx={computedCx! + fontSize * 2} cy={computedCy! - fontSize * 1.8} r={fontSize * 0.75} fill="#6366f1" stroke="#fff" strokeWidth={fontSize * 0.15} />
            )}
        </g>
    );
});

interface MasterplanViewerProps {
    proyectoId: string;
    modo: "admin" | "public";
}

export default function MasterplanViewer({ proyectoId, modo }: MasterplanViewerProps) {
    const {
        setUnits,
        updateUnitState,
        selectedUnitId, setSelectedUnitId,
        hoveredUnitId, setHoveredUnitId,
        comparisonIds, toggleComparison, clearComparison,
        showComparator, setShowComparator,
        showFilters, setShowFilters,
        layers, toggleLayer,
        zoom, setZoom,
    } = useMasterplanStore();

    const units = useMasterplanStore(selectUnits);
    const filteredUnits = useFilteredUnits();
    const filteredIds = useMemo(() => new Set(filteredUnits.map((u) => u.id)), [filteredUnits]);

    // Only show lot-number labels when zoomed in enough (avoids wall-of-numbers at overview zoom)
    const showLabels = zoom >= 0.8;

    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [showLayers, setShowLayers] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomInRef = useRef<HTMLButtonElement>(null);
    const zoomOutRef = useRef<HTMLButtonElement>(null);
    const zoomResetRef = useRef<HTMLButtonElement>(null);

    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch { /* fullscreen not supported */ }
    }, []);

    useEffect(() => {
        const onFSChange = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
        };
        document.addEventListener("fullscreenchange", onFSChange);
        return () => document.removeEventListener("fullscreenchange", onFSChange);
    }, []);

    // Reset zoom to 1 on mount — prevents stale zoom state from a previous session triggering labels at load
    useEffect(() => {
        setZoom(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 1. Fetch real-world business data from DB
    useEffect(() => {
        const fetchProjectUnits = async () => {
            setLoading(true);
            const res = await getProjectBlueprintData(proyectoId);
            if (res.success && res.data) {
                setUnits(res.data as any);
            }
            setLoading(false);
        };
        fetchProjectUnits();
    }, [proyectoId, setUnits]);

    // 2. Implementation of Real-time sync via Pusher
    useEffect(() => {
        const pusher = getPusherClient();
        const channel = pusher.subscribe(CHANNELS.UNIDADES);

        channel.bind(EVENTS.UNIDAD_STATUS_CHANGED, (data: { id: string; estado: MasterplanUnit["estado"]; proyectoId?: string }) => {
            // Only update if it belongs to this project
            if (!data.proyectoId || data.proyectoId === proyectoId) {
                updateUnitState(data.id, { estado: data.estado });
            }
        });

        return () => {
            pusher.unsubscribe(CHANNELS.UNIDADES);
        };
    }, [proyectoId, updateUnitState]);

    const handleUnitHover = useCallback((e: React.MouseEvent, unit: MasterplanUnit) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                unit,
            });
        }
        setHoveredUnitId(unit.id);
    }, [setHoveredUnitId]);

    const handleUnitLeave = useCallback(() => {
        setTooltip(null);
        setHoveredUnitId(null);
    }, [setHoveredUnitId]);

    const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

    // ─── Dynamic viewBox: computed from actual unit geometry ─────────────────
    const svgViewBox = useMemo(() => {
        if (units.length === 0) return "0 0 1000 800";
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const u of units) {
            let path = u.path;
            if (!path && (u as any).coordenadasMasterplan) {
                try {
                    const c = JSON.parse((u as any).coordenadasMasterplan);
                    path = c.path;
                } catch {}
            }
            if (!path) continue;
            const nums = path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
            if (!nums) continue;
            for (let i = 0; i + 1 < nums.length; i += 2) {
                const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
                if (isNaN(x) || isNaN(y)) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        if (minX === Infinity) return "0 0 1000 800";
        const w = maxX - minX || 1000;
        const h = maxY - minY || 800;
        const pad = Math.max(w, h) * 0.06;
        return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
    }, [units]);

    // Parse viewBox for use in grid rect
    const vbParts = svgViewBox.split(" ").map(parseFloat);
    const [vbX, vbY, vbW, vbH] = vbParts;
    const globalFontSize = Math.min(vbW, vbH) / 80;

    const handleExportExcel = async () => {
        const { utils, writeFile } = await import("xlsx");
        const exportData = units.map(u => ({
            Lote: u.numero,
            Estado: u.estado,
            Superficie: u.superficie,
            Precio: u.precio,
            Moneda: u.moneda,
            Tipo: u.tipo,
            Esquina: u.esEsquina ? "SI" : "NO",
            Orientacion: u.orientacion || "N/A",
            Manzana: (u as any).manzana?.nombre || "N/A",
            Etapa: (u as any).manzana?.etapa?.nombre || "N/A"
        }));

        const wb = utils.book_new();
        const ws = utils.json_to_sheet(exportData);
        utils.book_append_sheet(wb, ws, "Inventario");
        writeFile(wb, `Inventario-${proyectoId}.xlsx`);
    };

    if (loading) {
        return (
            <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500">Sincronizando Masterplan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-b-2xl" ref={containerRef}>
            {/* Top controls */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                        showFilters
                            ? "bg-brand-500 text-white"
                            : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                    )}
                >
                    <Filter className="w-3.5 h-3.5" />Filtros
                </button>
                <button
                    onClick={() => setShowLayers(!showLayers)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm transition-all",
                        showLayers
                            ? "bg-brand-500 text-white"
                            : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                    )}
                >
                    <LayersIcon className="w-3.5 h-3.5" />Capas
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

                <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5" />Exportar Excel
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                <button ref={zoomInRef} title="Acercar" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button ref={zoomOutRef} title="Alejar" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button ref={zoomResetRef} title="Restablecer zoom" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <Maximize className="w-4 h-4" />
                </button>

                {/* Fullscreen — moved here so it doesn't overlap the side panel close button */}
                <button
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2">
                <div className="flex items-center gap-3">
                    {Object.entries(STATUS_COLORS).map(([key, color]) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 uppercase">{STATUS_LABELS[key]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* SVG Canvas with Zoom/Pan */}
            <TransformWrapper
                initialScale={1}
                minScale={0.3}
                maxScale={5}
                wheel={{ step: 0.08 }}
                panning={{ velocityDisabled: true }}
                onZoomStop={(ref) => setZoom(ref.state.scale)}
            >
                <ZoomButtonWiring zoomInRef={zoomInRef} zoomOutRef={zoomOutRef} zoomResetRef={zoomResetRef} />
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <svg viewBox={svgViewBox} className="w-full h-full" style={{ minWidth: "min(100%, 600px)", minHeight: "min(100%, 400px)" }}>
                        <defs>
                            <pattern id="mp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-slate-300 dark:text-slate-700" />
                            </pattern>
                        </defs>
                        {/* Grid covers the full computed viewBox — not a fixed 1000×800 */}
                        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#mp-grid)" />

                        {units.map((unit) => (
                            <UnitPolygon
                                key={unit.id}
                                unit={unit}
                                isFiltered={filteredIds.has(unit.id)}
                                isSelected={selectedUnitId === unit.id}
                                isHovered={hoveredUnitId === unit.id}
                                isComparing={comparisonIds.includes(unit.id)}
                                showLabels={showLabels}
                                globalFontSize={globalFontSize}
                                onMouseEnter={handleUnitHover}
                                onMouseLeave={handleUnitLeave}
                                onClick={() => setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id)}
                                onCompareToggle={(e) => { e.stopPropagation(); toggleComparison(unit.id); }}
                                onTouchLongPress={() => toggleComparison(unit.id)}
                            />
                        ))}
                    </svg>
                </TransformComponent>
            </TransformWrapper>

            {/* Tooltip */}
            <AnimatePresence>
                {tooltip && <Tooltip data={tooltip} />}
            </AnimatePresence>

            {/* Side Panel */}
            <AnimatePresence>
                {selectedUnit && (
                    <MasterplanSidePanel
                        unit={selectedUnit}
                        modo={modo}
                        onClose={() => setSelectedUnitId(null)}
                    />
                )}
            </AnimatePresence>

            {/* Filters sidebar */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute top-14 left-4 bottom-4 z-20 w-[260px]"
                    >
                        <MasterplanFilters onClose={() => setShowFilters(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Layers panel */}
            <AnimatePresence>
                {showLayers && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={cn(
                            "absolute top-14 bottom-4 z-20 w-[180px]",
                            showFilters ? "left-[280px]" : "left-4"
                        )}
                    >
                        <div className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Capas</h4>
                                <button onClick={() => setShowLayers(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-3 space-y-1.5">
                                {layers.map((layer) => (
                                    <label key={layer.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={layer.visible}
                                            onChange={() => toggleLayer(layer.id)}
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                        />
                                        <span className="text-sm mr-1">{layer.icon}</span>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{layer.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compare bar — appears when units are selected for comparison */}
            <AnimatePresence>
                {comparisonIds.length > 0 && (
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 60, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50"
                    >
                        <span className="text-xs text-slate-300 font-medium">
                            {comparisonIds.length} unidad{comparisonIds.length > 1 ? "es" : ""} seleccionada{comparisonIds.length > 1 ? "s" : ""}
                        </span>
                        <button
                            onClick={() => setShowComparator(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all shadow-lg"
                        >
                            <GitCompare className="w-3.5 h-3.5" />
                            Comparar
                        </button>
                        <button
                            onClick={clearComparison}
                            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                            title="Cancelar comparación"
                        >
                            <X className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comparator modal */}
            <AnimatePresence>
                {showComparator && comparisonIds.length > 0 && (
                    <MasterplanComparator
                        units={units.filter((u) => comparisonIds.includes(u.id))}
                        onClose={() => { clearComparison(); setShowComparator(false); }}
                        onRemove={(id) => toggleComparison(id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
