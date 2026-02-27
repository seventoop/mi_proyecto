"use client";

import { memo, useCallback, useRef, useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "framer-motion";
import {
    ZoomIn, ZoomOut, Maximize, Filter, Layers as LayersIcon,
    GitCompare, X, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useMasterplanStore,
    useFilteredUnits,
    MasterplanUnit,
} from "@/lib/masterplan-store";
import MasterplanSidePanel from "./masterplan-side-panel";
import MasterplanFilters from "./masterplan-filters";
import MasterplanComparator from "./masterplan-comparator";

// ─── Status colors ───
const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#f59e0b",
    RESERVADO: "#f97316",
    VENDIDO: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADO: "Reservado",
    VENDIDO: "Vendido",
};

// ─── Demo units generator ───
function generateDemoUnits(): MasterplanUnit[] {
    const etapas = [
        { id: "e1", nombre: "Etapa 1" },
        { id: "e2", nombre: "Etapa 2" },
    ];
    const manzanas = [
        { id: "m1", nombre: "Mza A", etapaId: "e1" },
        { id: "m2", nombre: "Mza B", etapaId: "e1" },
        { id: "m3", nombre: "Mza C", etapaId: "e1" },
        { id: "m4", nombre: "Mza D", etapaId: "e2" },
        { id: "m5", nombre: "Mza E", etapaId: "e2" },
    ];

    const units: MasterplanUnit[] = [];
    const estados: MasterplanUnit["estado"][] = ["DISPONIBLE", "DISPONIBLE", "DISPONIBLE", "RESERVADO", "VENDIDO", "BLOQUEADO"];
    let idx = 0;

    manzanas.forEach((mz, mi) => {
        const etapa = etapas.find((e) => e.id === mz.etapaId)!;
        const cols = 5;
        const rows = mi < 3 ? 4 : 3;
        const startX = 40 + (mi % 3) * 220;
        const startY = mi < 3 ? 40 : 320;
        const lotW = 38;
        const lotH = 32;
        const gap = 4;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * (lotW + gap);
                const y = startY + r * (lotH + gap);
                const num = `${mz.nombre.replace("Mza ", "")}-${String(idx % 20 + 1).padStart(2, "0")}`;
                const estado = estados[idx % estados.length];
                const esEsquina = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
                const superficie = 400 + Math.floor(Math.random() * 300);
                const precio = 35000 + Math.floor(Math.random() * 40000);

                units.push({
                    id: `unit-${idx}`,
                    numero: num,
                    tipo: "LOTE",
                    superficie,
                    frente: 12 + Math.floor(Math.random() * 10),
                    fondo: 25 + Math.floor(Math.random() * 15),
                    esEsquina,
                    orientacion: ["N", "S", "E", "O", "NE", "SE"][idx % 6],
                    precio,
                    moneda: "USD",
                    estado,
                    etapaId: etapa.id,
                    etapaNombre: etapa.nombre,
                    manzanaId: mz.id,
                    manzanaNombre: mz.nombre,
                    tour360Url: estado === "DISPONIBLE" ? "https://tour360.example.com" : null,
                    imagenes: [],
                    responsable: estado === "VENDIDO" ? "Juan Pérez" : estado === "RESERVADO" ? "María López" : null,
                    path: `M${x},${y} L${x + lotW},${y} L${x + lotW},${y + lotH} L${x},${y + lotH} Z`,
                    cx: x + lotW / 2,
                    cy: y + lotH / 2,
                });
                idx++;
            }
        }
    });

    return units;
}

// ─── Layer overlay SVGs ───
const LAYER_OVERLAYS: Record<string, JSX.Element> = {
    servicios: (
        <g className="pointer-events-none" opacity={0.5}>
            <line x1="30" y1="25" x2="700" y2="25" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="30" y1="300" x2="700" y2="300" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8,4" />
            <text x="705" y="28" fill="#3b82f6" fontSize="8" fontWeight="600">Red eléctrica</text>
            <text x="705" y="303" fill="#3b82f6" fontSize="8" fontWeight="600">Red de gas</text>
            <line x1="25" y1="30" x2="25" y2="580" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6,3" />
            <text x="10" y="590" fill="#06b6d4" fontSize="8" fontWeight="600">Agua</text>
        </g>
    ),
    amenities: (
        <g className="pointer-events-none" opacity={0.6}>
            <rect x="310" y="210" width="60" height="40" rx="6" fill="#8b5cf6" fillOpacity={0.15} stroke="#8b5cf6" strokeWidth="1.5" />
            <text x="340" y="234" fill="#8b5cf6" fontSize="8" fontWeight="700" textAnchor="middle">PLAZA</text>
            <rect x="580" y="100" width="70" height="50" rx="6" fill="#8b5cf6" fillOpacity={0.15} stroke="#8b5cf6" strokeWidth="1.5" />
            <text x="615" y="129" fill="#8b5cf6" fontSize="8" fontWeight="700" textAnchor="middle">CLUB</text>
        </g>
    ),
    accesos: (
        <g className="pointer-events-none" opacity={0.5}>
            <path d="M0,260 L30,260" stroke="#f59e0b" strokeWidth="3" />
            <polygon points="28,255 38,260 28,265" fill="#f59e0b" />
            <text x="2" y="275" fill="#f59e0b" fontSize="8" fontWeight="600">Acceso principal</text>
            <path d="M730,400 L700,400" stroke="#f59e0b" strokeWidth="3" />
            <polygon points="702,395 692,400 702,405" fill="#f59e0b" />
            <text x="700" y="415" fill="#f59e0b" fontSize="8" fontWeight="600" textAnchor="end">Acceso 2</text>
        </g>
    ),
    reglamento: (
        <g className="pointer-events-none" opacity={0.3}>
            <rect x="35" y="35" width="640" height="540" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4" />
            <text x="355" y="565" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle">Perímetro de construcción permitido</text>
        </g>
    ),
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
                    <span className="font-bold text-sm">{unit.numero}</span>
                    <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
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
    unit, isFiltered, isSelected, isHovered, isComparing,
    onMouseEnter, onMouseLeave, onClick, onCompareToggle,
}: {
    unit: MasterplanUnit;
    isFiltered: boolean;
    isSelected: boolean;
    isHovered: boolean;
    isComparing: boolean;
    onMouseEnter: (e: React.MouseEvent, unit: MasterplanUnit) => void;
    onMouseLeave: () => void;
    onClick: () => void;
    onCompareToggle: (e: React.MouseEvent) => void;
}) {
    const fillColor = STATUS_COLORS[unit.estado] || "#94a3b8";
    const opacity = isFiltered ? (isHovered ? 0.85 : 0.55) : 0.12;
    const strokeWidth = isSelected ? 2.5 : isComparing ? 2 : isHovered ? 1.5 : 0.5;
    const strokeColor = isSelected ? "#fff" : isComparing ? "#6366f1" : isHovered ? "#fff" : `${fillColor}80`;

    return (
        <g
            className="cursor-pointer"
            onMouseEnter={(e) => onMouseEnter(e, unit)}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            onContextMenu={(e) => { e.preventDefault(); onCompareToggle(e); }}
        >
            <path
                d={unit.path}
                fill={fillColor}
                fillOpacity={opacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                style={{ transition: "fill-opacity 0.2s, stroke-width 0.15s" }}
            />
            {isFiltered && (
                <text
                    x={unit.cx}
                    y={unit.cy + 3}
                    textAnchor="middle"
                    fontSize="6.5"
                    fontWeight={isSelected || isHovered ? 700 : 500}
                    fill={isHovered || isSelected ? "#fff" : fillColor}
                    className="pointer-events-none select-none"
                    style={{ transition: "fill 0.2s" }}
                >
                    {unit.numero.split("-")[1] || unit.numero}
                </text>
            )}
            {isComparing && (
                <circle cx={unit.cx + 14} cy={unit.cy - 12} r={5} fill="#6366f1" stroke="#fff" strokeWidth={1} />
            )}
        </g>
    );
});

interface MasterplanViewerProps {
    proyectoId: string;
    modo: "admin" | "public";
    initialUnits?: MasterplanUnit[];
}

export default function MasterplanViewer({ proyectoId, modo, initialUnits = [] }: MasterplanViewerProps) {
    const {
        units, setUnits,
        selectedUnitId, setSelectedUnitId,
        hoveredUnitId, setHoveredUnitId,
        comparisonIds, toggleComparison, clearComparison,
        showComparator, setShowComparator,
        showFilters, setShowFilters,
        layers, toggleLayer,
        zoom, setZoom,
    } = useMasterplanStore();

    const filteredUnits = useFilteredUnits();
    const filteredIds = new Set(filteredUnits.map((u) => u.id));

    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [showLayers, setShowLayers] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize units
    useEffect(() => {
        if (initialUnits && initialUnits.length > 0) {
            setUnits(initialUnits);
        } else if (units.length === 0) {
            setUnits(generateDemoUnits());
        }
    }, [initialUnits, setUnits, units.length]);

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

    return (
        <div className="relative w-full h-[calc(100vh-330px)] min-h-[500px] overflow-hidden bg-slate-100 dark:bg-slate-900/80 border-x border-b border-slate-200 dark:border-slate-800" ref={containerRef}>
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
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{STATUS_LABELS[key]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comparison floating button */}
            <AnimatePresence>
                {comparisonIds.length > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
                    >
                        <div className="flex items-center gap-2 bg-brand-500 text-white rounded-xl shadow-xl px-4 py-2.5">
                            <GitCompare className="w-4 h-4" />
                            <button
                                onClick={() => setShowComparator(true)}
                                className="text-sm font-semibold hover:underline"
                            >
                                Comparar {comparisonIds.length} unidad{comparisonIds.length > 1 ? "es" : ""}
                            </button>
                            <button onClick={clearComparison} className="p-0.5 hover:bg-white/20 rounded">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
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
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        className="absolute top-14 left-[105px] z-20"
                    >
                        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px]">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Capas</h4>
                            <div className="space-y-1.5">
                                {layers.map((layer) => (
                                    <button
                                        key={layer.id}
                                        onClick={() => toggleLayer(layer.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all text-left",
                                            layer.visible
                                                ? "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                                                : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <div className={cn("w-3 h-3 rounded border-2 flex items-center justify-center transition-all",
                                            layer.visible ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-slate-600"
                                        )}>
                                            {layer.visible && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span>{layer.icon}</span>
                                        <span className="font-medium">{layer.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SVG Canvas with Zoom/Pan */}
            <TransformWrapper
                initialScale={1}
                minScale={0.3}
                maxScale={5}
                wheel={{ step: 0.08 }}
                panning={{ velocityDisabled: true }}
                onZoomStop={(ref) => setZoom(ref.state.scale)}
            >
                {({ zoomIn, zoomOut, resetTransform }) => {
                    // Wire up buttons
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

                    return (
                        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                            <svg
                                viewBox="0 0 750 600"
                                className="w-full h-full"
                                style={{ minWidth: 750, minHeight: 600 }}
                            >
                                {/* Background grid */}
                                <defs>
                                    <pattern id="mp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-slate-300 dark:text-slate-700" />
                                    </pattern>
                                </defs>
                                <rect width="750" height="600" fill="url(#mp-grid)" />

                                {/* Manzana labels */}
                                {[
                                    { x: 145, y: 32, label: "Manzana A" },
                                    { x: 355, y: 32, label: "Manzana B" },
                                    { x: 565, y: 32, label: "Manzana C" },
                                    { x: 145, y: 312, label: "Manzana D" },
                                    { x: 355, y: 312, label: "Manzana E" },
                                ].map((m) => (
                                    <text key={m.label} x={m.x} y={m.y} textAnchor="middle" fontSize="9" fontWeight="700"
                                        className="fill-slate-500 dark:fill-slate-400 select-none pointer-events-none">
                                        {m.label}
                                    </text>
                                ))}

                                {/* Layer overlays */}
                                {layers.filter((l) => l.visible).map((l) => (
                                    <g key={l.id}>{LAYER_OVERLAYS[l.id]}</g>
                                ))}

                                {/* Unit polygons */}
                                {units.map((unit) => (
                                    <UnitPolygon
                                        key={unit.id}
                                        unit={unit}
                                        isFiltered={filteredIds.has(unit.id)}
                                        isSelected={selectedUnitId === unit.id}
                                        isHovered={hoveredUnitId === unit.id}
                                        isComparing={comparisonIds.includes(unit.id)}
                                        onMouseEnter={handleUnitHover}
                                        onMouseLeave={handleUnitLeave}
                                        onClick={() => setSelectedUnitId(selectedUnitId === unit.id ? null : unit.id)}
                                        onCompareToggle={(e) => { e.stopPropagation(); toggleComparison(unit.id); }}
                                    />
                                ))}
                            </svg>
                        </TransformComponent>
                    );
                }}
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

            {/* Comparator Modal */}
            <AnimatePresence>
                {showComparator && (
                    <MasterplanComparator
                        units={units.filter((u) => comparisonIds.includes(u.id))}
                        onClose={() => setShowComparator(false)}
                        onRemove={(id) => toggleComparison(id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
