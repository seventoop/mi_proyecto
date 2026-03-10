"use client";

import { memo, useCallback, useRef, useState, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "framer-motion";
import {
    ZoomIn, ZoomOut, Maximize, Filter, Layers as LayersIcon,
    GitCompare, X, FileSpreadsheet, Download
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
function ZoomButtonWiring() {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    useEffect(() => {
        const ziBtn = document.getElementById("zoom-in-btn");
        const zoBtn = document.getElementById("zoom-out-btn");
        const zrBtn = document.getElementById("zoom-reset-btn");
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
    }, [zoomIn, zoomOut, resetTransform]);
    return null;
}

// ─── Status colors ───
const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDA: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDA: "Suspendida",
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
    unit, isFiltered, isSelected, isHovered, isComparing, showLabels,
    onMouseEnter, onMouseLeave, onClick, onCompareToggle,
}: {
    unit: MasterplanUnit;
    isFiltered: boolean;
    isSelected: boolean;
    isHovered: boolean;
    isComparing: boolean;
    showLabels: boolean;
    onMouseEnter: (e: React.MouseEvent, unit: MasterplanUnit) => void;
    onMouseLeave: () => void;
    onClick: () => void;
    onCompareToggle: (e: React.MouseEvent) => void;
}) {
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

    // Per-polygon font size: ~25% of the polygon's shortest dimension
    let fontSize = 6.5;
    const pathNums = path.match(/-?[\d.]+(?:e[+-]?\d+)?/g);
    if (pathNums && pathNums.length >= 4) {
        let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
        for (let i = 0; i + 1 < pathNums.length; i += 2) {
            const px = parseFloat(pathNums[i]), py = parseFloat(pathNums[i + 1]);
            if (!isNaN(px) && !isNaN(py)) {
                if (px < pMinX) pMinX = px;
                if (px > pMaxX) pMaxX = px;
                if (py < pMinY) pMinY = py;
                if (py > pMaxY) pMaxY = py;
            }
        }
        if (pMinX !== Infinity) {
            fontSize = Math.max(Math.min(pMaxX - pMinX, pMaxY - pMinY) * 0.25, 1.5);
        }
    }

    const fillColor = STATUS_COLORS[unit.estado] || "#94a3b8";
    const opacity = isFiltered ? (isHovered ? 0.85 : 0.55) : 0.12;
    const strokeWidth = isSelected ? 2.5 : isComparing ? 2 : isHovered ? 1.5 : 0.5;
    const strokeColor = isSelected ? "#fff" : isComparing ? "#6366f1" : isHovered ? "#fff" : `${fillColor}80`;
    const labelText = internalId != null ? String(internalId) : (unit.numero.split("-")[1] || unit.numero);

    return (
        <g
            className="cursor-pointer"
            onMouseEnter={(e) => onMouseEnter(e, unit)}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            onContextMenu={(e) => { e.preventDefault(); onCompareToggle(e); }}
        >
            <path
                d={path}
                fill={fillColor}
                fillOpacity={opacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                style={{ transition: "fill-opacity 0.2s, stroke 0.2s, stroke-width 0.15s, fill 0.3s" }}
            />
            {isFiltered && showLabels && cx !== undefined && cy !== undefined && (
                <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight={isSelected || isHovered ? 700 : 500}
                    fill={isHovered || isSelected ? "#fff" : fillColor}
                    className="pointer-events-none select-none"
                    style={{ transition: "fill 0.2s" }}
                >
                    {labelText}
                </text>
            )}
            {isComparing && cx !== undefined && cy !== undefined && (
                <circle cx={cx + fontSize * 2} cy={cy - fontSize * 1.8} r={fontSize * 0.75} fill="#6366f1" stroke="#fff" strokeWidth={fontSize * 0.15} />
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
    const filteredIds = new Set(filteredUnits.map((u) => u.id));

    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [showLayers, setShowLayers] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Show labels only when reasonably zoomed in — avoids illegible label soup at overview
    const showLabels = zoom >= 0.75;

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
            <div className="w-full h-[600px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl animate-pulse">
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
            </div>

            {/* Zoom controls  */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-1">
                <button id="zoom-in-btn" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button id="zoom-out-btn" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button id="zoom-reset-btn" className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all backdrop-blur-sm">
                    <Maximize className="w-4 h-4" />
                </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2">
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
                <ZoomButtonWiring />
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <svg viewBox={svgViewBox} className="w-full h-full" style={{ minWidth: 1000, minHeight: 800 }}>
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
                                onMouseEnter={handleUnitHover}
                                onMouseLeave={handleUnitLeave}
                                onClick={() => setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id)}
                                onCompareToggle={(e) => { e.stopPropagation(); toggleComparison(unit.id); }}
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
        </div>
    );
}
