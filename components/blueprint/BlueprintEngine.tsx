"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateUnidadPolygon } from "@/lib/actions/blueprint";
import { parseDXF } from "@/lib/dxf-parser";
import {
    FolderOpen, RefreshCw, Edit3, Undo2, Redo2, Grid, Save,
    Minus, Plus, RotateCcw, Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlueprintUnit {
    id: string;
    numero: string;
    tipo: string;
    superficie?: number | null;
    frente?: number | null;
    fondo?: number | null;
    esEsquina?: boolean | null;
    orientacion?: string | null;
    precio?: number | null;
    moneda?: string | null;
    estado: string;
    polygon?: any;
    bloqueadoHasta?: Date | string | null;
    manzanaNombre?: string | null;
    manzanaId?: string | null;
}

interface BlueprintEngineProps {
    unidades: BlueprintUnit[];
    proyectoId: string;
    onLoteClick: (u: BlueprintUnit) => void;
    mode: "2d" | "3d";
    centerLat?: number;
    centerLng?: number;
}

// ─── Layout Constants ─────────────────────────────────────────────────────────

const LOT_W = 76;
const LOT_H = 138;
const GAP = 3;
const STREET_H = 58;
const MARGIN = 64;

// ─── CAD Colors ───────────────────────────────────────────────────────────────

const COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
    DISPONIBLE:          { fill: "#0a2a2a", stroke: "#00bcd4", text: "#00bcd4" },
    RESERVADO:           { fill: "#2a1a00", stroke: "#f59e0b", text: "#f59e0b" },
    RESERVADA:           { fill: "#2a1a00", stroke: "#f59e0b", text: "#f59e0b" },
    RESERVADA_PENDIENTE: { fill: "#2a1a00", stroke: "#fb923c", text: "#fb923c" },
    VENDIDO:             { fill: "#2a0a0a", stroke: "#ef4444", text: "#ef4444" },
    VENDIDA:             { fill: "#2a0a0a", stroke: "#ef4444", text: "#ef4444" },
    BLOQUEADO:           { fill: "#181818", stroke: "#6b7280", text: "#6b7280" },
};
const DEFAULT_COLOR = { fill: "#0a2a2a", stroke: "#00bcd4", text: "#00bcd4" };

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupByManzana(units: BlueprintUnit[]): Map<string, BlueprintUnit[]> {
    const map = new Map<string, BlueprintUnit[]>();
    for (const u of units) {
        const key = u.manzanaNombre || u.numero.match(/^([A-Za-z]+)/)?.[1] || "A";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(u);
    }
    map.forEach((arr, k) => {
        map.set(k, arr.sort((a, b) => {
            const na = parseInt(a.numero.replace(/\D/g, "")) || 0;
            const nb = parseInt(b.numero.replace(/\D/g, "")) || 0;
            return na - nb;
        }));
    });
    return map;
}

// ─── Layout Types ─────────────────────────────────────────────────────────────

interface LayoutLot { unit: BlueprintUnit; x: number; y: number; w: number; h: number; }
interface LayoutManzana { nombre: string; lots: LayoutLot[]; y: number; totalW: number; }

function computeLayout(groups: Map<string, BlueprintUnit[]>): {
    manzanas: LayoutManzana[]; svgW: number; svgH: number;
} {
    const names = Array.from(groups.keys()).sort();
    let curY = MARGIN + 20;
    const manzanas: LayoutManzana[] = [];
    let maxW = 0;

    names.forEach((nombre, mi) => {
        const units = groups.get(nombre)!;
        const lots: LayoutLot[] = units.map((unit, i) => ({
            unit, x: MARGIN + i * (LOT_W + GAP), y: curY, w: LOT_W, h: LOT_H,
        }));
        const totalW = units.length * (LOT_W + GAP) - GAP;
        maxW = Math.max(maxW, totalW);
        manzanas.push({ nombre, lots, y: curY, totalW });
        curY += LOT_H + (mi < names.length - 1 ? STREET_H : 0);
    });

    return {
        manzanas,
        svgW: maxW + MARGIN * 2 + 40,
        svgH: curY + MARGIN + 40,
    };
}

// ─── Compass Rose ─────────────────────────────────────────────────────────────

function CompassRose({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x},${y})`}>
            <circle r={28} fill="#0d1117" stroke="#1e2a3a" strokeWidth={1} />
            <polygon points="0,-22 5,-8 -5,-8" fill="#00bcd4" />
            <polygon points="0,22 5,8 -5,8" fill="#1e2a3a" />
            <line x1={0} y1={-22} x2={0} y2={22} stroke="#1e2a3a" strokeWidth={0.5} />
            <line x1={-22} y1={0} x2={22} y2={0} stroke="#1e2a3a" strokeWidth={0.5} />
            <text x={0} y={-26} textAnchor="middle" fill="#00bcd4" fontSize={9} fontFamily="monospace" fontWeight="bold">N</text>
            <text x={0} y={36} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="monospace">S</text>
            <text x={30} y={4} textAnchor="start" fill="#475569" fontSize={8} fontFamily="monospace">E</text>
            <text x={-30} y={4} textAnchor="end" fill="#475569" fontSize={8} fontFamily="monospace">O</text>
        </g>
    );
}

// ─── Single Lot ───────────────────────────────────────────────────────────────

function LotRect({ lot, editMode, isSelected, onClick }: {
    lot: LayoutLot; editMode: boolean; isSelected: boolean; onClick: () => void;
}) {
    const c = COLORS[lot.unit.estado] || DEFAULT_COLOR;
    const { x, y, w, h, unit } = lot;
    const numText = unit.numero.replace(/^[A-Za-z]+-?/, "") || unit.numero;
    const sup = unit.superficie ? `${unit.superficie}m²` : "";
    const frente = unit.frente ? `${unit.frente.toFixed(2).replace(".", ",")}` : "10,00";
    const fondo = unit.fondo ? `${unit.fondo.toFixed(2).replace(".", ",")}` : "33,04";

    return (
        <g>
            <rect x={x} y={y} width={w} height={h} fill={c.fill}
                stroke={c.stroke} strokeWidth={isSelected ? 2 : 1}
                style={{ cursor: "pointer" }} onClick={onClick} />

            <text x={x + w / 2} y={y + h / 2 - 8} textAnchor="middle"
                fill={c.text} fontSize={18} fontFamily="monospace" fontWeight="bold"
                style={{ pointerEvents: "none" }}>{numText}</text>

            {sup && <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle"
                fill={c.text} fontSize={9} fontFamily="monospace" opacity={0.8}
                style={{ pointerEvents: "none" }}>{sup}</text>}

            <text x={x + w / 2} y={y + h / 2 + 24} textAnchor="middle"
                fill={c.text} fontSize={8} fontFamily="monospace" opacity={0.6}
                style={{ pointerEvents: "none" }}>{unit.estado.substring(0, 4).toUpperCase()}</text>

            {/* Frente dim (below) */}
            <line x1={x} y1={y + h + 6} x2={x + w} y2={y + h + 6} stroke="#1e2a3a" strokeWidth={0.5} />
            <line x1={x} y1={y + h + 3} x2={x} y2={y + h + 9} stroke="#1e2a3a" strokeWidth={0.5} />
            <line x1={x + w} y1={y + h + 3} x2={x + w} y2={y + h + 9} stroke="#1e2a3a" strokeWidth={0.5} />
            <text x={x + w / 2} y={y + h + 16} textAnchor="middle" fill="#334155" fontSize={7} fontFamily="monospace">{frente}</text>

            {/* Fondo dim (right) */}
            <line x1={x + w + 5} y1={y} x2={x + w + 5} y2={y + h} stroke="#1e2a3a" strokeWidth={0.5} />
            <line x1={x + w + 2} y1={y} x2={x + w + 8} y2={y} stroke="#1e2a3a" strokeWidth={0.5} />
            <line x1={x + w + 2} y1={y + h} x2={x + w + 8} y2={y + h} stroke="#1e2a3a" strokeWidth={0.5} />
            <text x={x + w + 14} y={y + h / 2 + 3} textAnchor="middle" fill="#334155" fontSize={7} fontFamily="monospace"
                transform={`rotate(-90, ${x + w + 14}, ${y + h / 2 + 3})`}>{fondo}</text>

            {/* Edit handles */}
            {editMode && isSelected && [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([hx, hy], i) => (
                <circle key={i} cx={hx} cy={hy} r={5} fill="#00bcd4" stroke="#0d1117" strokeWidth={1.5} style={{ cursor: "crosshair" }} />
            ))}
        </g>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlueprintEngine({
    unidades, proyectoId, onLoteClick, mode, centerLat = -31.4532, centerLng = -64.4823
}: BlueprintEngineProps) {
    const canvasRef = useRef<HTMLDivElement>(null);

    // Pan/zoom
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });

    // UI state
    const [editMode, setEditMode] = useState(false);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [future, setFuture] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [dxfImporting, setDxfImporting] = useState(false);
    const [dxfPreview, setDxfPreview] = useState<{ count: number; lotes: ReturnType<typeof parseDXF> } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const groups = groupByManzana(unidades);
    const { manzanas, svgW, svgH } = computeLayout(groups);

    const stats = {
        disp: unidades.filter(u => u.estado === "DISPONIBLE").length,
        res:  unidades.filter(u => ["RESERVADO","RESERVADA","RESERVADA_PENDIENTE"].includes(u.estado)).length,
        vend: unidades.filter(u => ["VENDIDO","VENDIDA"].includes(u.estado)).length,
    };

    // ── Pan/Zoom handlers ─────────────────────────────────────────────────────

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || editMode) return;
        isPanning.current = true;
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.currentTarget.setAttribute("style", "cursor:grabbing");
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    };
    const onMouseUp = (e: React.MouseEvent) => {
        isPanning.current = false;
        e.currentTarget.setAttribute("style", "cursor:grab");
    };
    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.max(0.15, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };

    // ── DXF ───────────────────────────────────────────────────────────────────

    const handleDXFFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setDxfImporting(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const lotes = parseDXF(ev.target?.result as string);
                if (lotes.length === 0) toast.error("No se detectaron polígonos en el DXF");
                else setDxfPreview({ count: lotes.length, lotes });
            } catch { toast.error("Error al parsear el DXF"); }
            setDxfImporting(false);
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const confirmDXFImport = useCallback(async () => {
        if (!dxfPreview) return;
        setDxfPreview(null);
        setSaving(true);
        const allX = dxfPreview.lotes.flatMap(l => l.points.map(p => p.x));
        const allY = dxfPreview.lotes.flatMap(l => l.points.map(p => p.y));
        const maxX = Math.max(...allX) || 1;
        const maxY = Math.max(...allY) || 1;
        const cosLat = Math.cos((centerLat * Math.PI) / 180);
        const scale = 10 / (maxX / Math.max(dxfPreview.lotes.length, 1)); // ~10m per lot
        let updated = 0;
        for (const lote of dxfPreview.lotes) {
            const unit = unidades.find(u => u.numero.replace(/\D/g, "") === lote.numero);
            if (!unit) continue;
            const polygon = lote.points.map(p => ({
                lat: centerLat + ((-p.y + maxY / 2) * scale) / 111000,
                lng: centerLng + ((p.x - maxX / 2) * scale) / (111000 * cosLat),
            }));
            await updateUnidadPolygon(unit.id, polygon);
            updated++;
        }
        setSaving(false);
        toast.success(`Plano importado: ${updated} lotes actualizados`);
    }, [dxfPreview, unidades, centerLat, centerLng]);

    // ── Sync ──────────────────────────────────────────────────────────────────

    const handleSync = useCallback(async () => {
        setSyncing(true);
        const cosLat = Math.cos((centerLat * Math.PI) / 180);
        const metersPerPx = 10 / LOT_W;
        const svgCX = svgW / 2, svgCY = svgH / 2;
        let updated = 0;
        for (const manzana of manzanas) {
            for (const lot of manzana.lots) {
                if (lot.unit.polygon) continue;
                const { x, y, w, h } = lot;
                const polygon = [
                    { px: x,     py: y },
                    { px: x + w, py: y },
                    { px: x + w, py: y + h },
                    { px: x,     py: y + h },
                ].map(c => ({
                    lat: centerLat + ((svgCY - c.py) * metersPerPx) / 111000,
                    lng: centerLng + ((c.px - svgCX) * metersPerPx) / (111000 * cosLat),
                }));
                await updateUnidadPolygon(lot.unit.id, polygon);
                updated++;
            }
        }
        setSyncing(false);
        toast.success(`Sincronizado: ${updated} lotes actualizados en Masterplan`);
    }, [manzanas, svgW, svgH, centerLat, centerLng]);

    // ── 3D Mode ───────────────────────────────────────────────────────────────

    useEffect(() => {
        if (mode !== "3d" || !canvasRef.current) return;
        let renderer: any, animId: number;

        const init = async () => {
            const THREE = await import("three");
            const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js" as any);
            const W = canvasRef.current!.clientWidth || 800;
            const H = 500;
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0d1117);
            const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 10000);
            camera.position.set(0, 400, 600);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(W, H);
            canvasRef.current!.appendChild(renderer.domElement);
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            scene.add(new THREE.GridHelper(1200, 60, 0x1e2a3a, 0x1e2a3a));
            unidades.forEach((unit, i) => {
                const c = COLORS[unit.estado] || DEFAULT_COLOR;
                const geo: any = new THREE.BoxGeometry(LOT_W * 0.5, 8, LOT_H * 0.5);
                const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(c.stroke), transparent: true, opacity: 0.85 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set((i % 12) * (LOT_W * 0.5 + 4) - 250, 4, Math.floor(i / 12) * (LOT_H * 0.5 + 30) - 100);
                scene.add(mesh);
            });
            scene.add(new THREE.DirectionalLight(0xffffff, 1).position.set(100, 200, 100) as any);
            scene.add(new THREE.AmbientLight(0x334155, 1));
            const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
            animate();
        };
        init().catch(console.error);
        return () => {
            if (animId) cancelAnimationFrame(animId);
            if (renderer) { renderer.dispose(); if (canvasRef.current?.contains(renderer.domElement)) canvasRef.current.removeChild(renderer.domElement); }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // ── 3D render ─────────────────────────────────────────────────────────────

    if (mode === "3d") {
        return (
            <div className="w-full rounded-2xl overflow-hidden border border-slate-800" style={{ height: 500, background: "#0d1117" }}>
                <div ref={canvasRef} className="w-full h-full" />
            </div>
        );
    }

    // ── 2D render ─────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-2">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 bg-[#0d1117] border border-[#1e2a3a] rounded-xl px-3 py-2">
                <input ref={fileInputRef} type="file" accept=".dxf,.dwg" className="hidden" onChange={handleDXFFile} />
                <button onClick={() => fileInputRef.current?.click()} disabled={dxfImporting}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e2a3a] text-cyan-400 hover:bg-[#243040] text-xs font-mono transition-colors">
                    {dxfImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                    Cargar DXF/DWG
                </button>
                <button onClick={handleSync} disabled={syncing}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e2a3a] text-cyan-400 hover:bg-[#243040] text-xs font-mono transition-colors">
                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sincronizar Masterplan
                </button>
                <div className="w-px h-4 bg-[#1e2a3a] mx-1" />
                <button onClick={() => setEditMode(e => !e)}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors",
                        editMode ? "bg-cyan-500 text-black" : "bg-[#1e2a3a] text-slate-400 hover:bg-[#243040]")}>
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => { if (history.length) { setFuture(f => [history.at(-1), ...f]); setHistory(h => h.slice(0, -1)); } }}
                    disabled={!history.length}
                    className="p-1.5 rounded-lg bg-[#1e2a3a] text-slate-400 hover:bg-[#243040] disabled:opacity-30 transition-colors">
                    <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (future.length) { setHistory(h => [...h, future[0]]); setFuture(f => f.slice(1)); } }}
                    disabled={!future.length}
                    className="p-1.5 rounded-lg bg-[#1e2a3a] text-slate-400 hover:bg-[#243040] disabled:opacity-30 transition-colors">
                    <Redo2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setSnapEnabled(s => !s)}
                    className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-colors",
                        snapEnabled ? "bg-cyan-900/40 text-cyan-400" : "bg-[#1e2a3a] text-slate-500")}>
                    <Grid className="w-3.5 h-3.5" /> Snap
                </button>
                <div className="w-px h-4 bg-[#1e2a3a] mx-1" />
                <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="p-1.5 rounded-lg bg-[#1e2a3a] text-slate-400 hover:bg-[#243040] transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                <span className="text-xs font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.max(0.15, z * 0.8))} className="p-1.5 rounded-lg bg-[#1e2a3a] text-slate-400 hover:bg-[#243040] transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="p-1.5 rounded-lg bg-[#1e2a3a] text-slate-400 hover:bg-[#243040] transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
                <div className="ml-auto flex items-center gap-3 text-xs font-mono">
                    <span className="text-cyan-400">{stats.disp} disp</span>
                    <span className="text-amber-400">{stats.res} res</span>
                    <span className="text-red-400">{stats.vend} vend</span>
                </div>
            </div>

            {/* DXF Confirm */}
            {dxfPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl w-80">
                        <h3 className="font-bold text-white mb-2">Importar DXF</h3>
                        <p className="text-slate-400 text-sm mb-4">Se detectaron <strong className="text-cyan-400">{dxfPreview.count}</strong> polígonos. ¿Importar como polígonos de lotes?</p>
                        <div className="flex gap-2">
                            <button onClick={confirmDXFImport} className="flex-1 py-2 rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400">Importar</button>
                            <button onClick={() => setDxfPreview(null)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SVG Canvas */}
            <div
                className="relative w-full overflow-hidden rounded-2xl border border-[#1e2a3a]"
                style={{ height: 520, background: "#0d1117", cursor: editMode ? "default" : "grab" }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
            >
                <svg
                    width="100%" height="100%"
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }}
                >
                    {/* Dot grid */}
                    <defs>
                        <pattern id="cad-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="0.8" fill="#1e2a3a" opacity="0.5" />
                        </pattern>
                    </defs>
                    <rect x={0} y={0} width={svgW} height={svgH} fill="url(#cad-grid)" />

                    {/* Manzanas + lots */}
                    {manzanas.map((manzana, mi) => (
                        <g key={manzana.nombre}>
                            <text x={MARGIN} y={manzana.y - 8} fill="#334155" fontSize={10}
                                fontFamily="monospace" fontWeight="bold" letterSpacing={2}>
                                MZ {manzana.nombre.toUpperCase()}
                            </text>

                            {manzana.lots.map(lot => (
                                <LotRect
                                    key={lot.unit.id}
                                    lot={lot}
                                    editMode={editMode}
                                    isSelected={selectedId === lot.unit.id}
                                    onClick={() => {
                                        setSelectedId(id => id === lot.unit.id ? null : lot.unit.id);
                                        onLoteClick(lot.unit);
                                    }}
                                />
                            ))}

                            {/* Street between manzanas */}
                            {mi < manzanas.length - 1 && (
                                <g>
                                    <rect x={MARGIN} y={manzana.y + LOT_H + GAP}
                                        width={manzana.totalW} height={STREET_H - GAP * 2}
                                        fill="#0a1520" stroke="#1e2a3a" strokeWidth={0.5} strokeDasharray="4,4" />
                                    <text x={MARGIN + manzana.totalW / 2} y={manzana.y + LOT_H + GAP + (STREET_H - GAP * 2) / 2 + 4}
                                        textAnchor="middle" fill="#334155" fontSize={9} fontFamily="monospace">
                                        CALLE — 17,85 m
                                    </text>
                                </g>
                            )}
                        </g>
                    ))}

                    {/* Total width dim */}
                    {manzanas.length > 0 && (() => {
                        const last = manzanas[manzanas.length - 1];
                        const dimY = last.y + LOT_H + 34;
                        const x0 = MARGIN, x1 = MARGIN + last.totalW;
                        return (
                            <g>
                                <line x1={x0} y1={dimY} x2={x1} y2={dimY} stroke="#1e2a3a" strokeWidth={1} />
                                <line x1={x0} y1={dimY - 4} x2={x0} y2={dimY + 4} stroke="#1e2a3a" strokeWidth={1} />
                                <line x1={x1} y1={dimY - 4} x2={x1} y2={dimY + 4} stroke="#1e2a3a" strokeWidth={1} />
                                <text x={(x0 + x1) / 2} y={dimY + 12} textAnchor="middle" fill="#334155" fontSize={8} fontFamily="monospace">
                                    {(last.lots.length * 10 + Math.max(last.lots.length - 1, 0) * 0.4).toFixed(2).replace(".", ",")} m total
                                </text>
                            </g>
                        );
                    })()}

                    {/* Compass rose */}
                    <CompassRose x={svgW - 48} y={48} />

                    {/* Title */}
                    <text x={MARGIN} y={svgH - 10} fill="#1e2a3a" fontSize={8} fontFamily="monospace">
                        PLANO DE LOTEAMIENTO · Motor de Planos AI
                    </text>
                </svg>
                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-700">
                    scroll=zoom · drag=pan · click=ficha
                </div>
            </div>
        </div>
    );
}
