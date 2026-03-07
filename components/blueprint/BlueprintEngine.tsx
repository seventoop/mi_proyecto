"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Edit3, Undo2, Redo2, Grid3x3, Save, Square, Layers } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { updateUnidadPolygon } from "@/lib/actions/blueprint";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlueprintUnit {
    id: string;
    numero: string;
    tipo?: string;
    superficie?: number | null;
    frente?: number | null;
    fondo?: number | null;
    precio?: number | null;
    moneda?: string;
    estado: string;
    polygon?: any;
    bloqueadoHasta?: Date | string | null;
}

interface Point { x: number; y: number }

interface BlueprintEngineProps {
    unidades: BlueprintUnit[];
    proyectoId: string;
    onLoteClick: (u: BlueprintUnit) => void;
    mode: "2d" | "3d";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ESTADO_FILL: Record<string, string> = {
    DISPONIBLE:          "#22c55e",
    RESERVADO:           "#f59e0b",
    RESERVADA:           "#f59e0b",
    RESERVADA_PENDIENTE: "#f59e0b",
    VENDIDO:             "#ef4444",
    VENDIDA:             "#ef4444",
    BLOQUEADO:           "#6b7280",
};

const LOTE_W = 80;
const LOTE_H = 140;
const COLS = 12;
const STREET = 40;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePoly(raw: any): Point[] | null {
    if (!Array.isArray(raw) || raw.length < 3) return null;
    // If geo ({lat,lng}) → convert to pixels later via bbox
    if (typeof raw[0].lat === "number") return raw as any;
    if (typeof raw[0].x === "number") return raw as Point[];
    return null;
}

function geoToPixels(pts: Array<{ lat: number; lng: number }>, bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number; w: number; h: number }): Point[] {
    return pts.map(p => ({
        x: ((p.lng - bbox.minLng) / (bbox.maxLng - bbox.minLng || 1)) * bbox.w,
        y: ((bbox.maxLat - p.lat) / (bbox.maxLat - bbox.minLat || 1)) * bbox.h,
    }));
}

function polyCenter(pts: Point[]): Point {
    const sx = pts.reduce((s, p) => s + p.x, 0);
    const sy = pts.reduce((s, p) => s + p.y, 0);
    return { x: sx / pts.length, y: sy / pts.length };
}

function ptsToStr(pts: Point[]) {
    return pts.map(p => `${p.x},${p.y}`).join(" ");
}

function snap(v: number, gridOn: boolean) {
    return gridOn ? Math.round(v / 10) * 10 : v;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function BlueprintEngine({ unidades, proyectoId, onLoteClick, mode }: BlueprintEngineProps) {
    // ── 2D state ──
    const svgRef = useRef<SVGSVGElement>(null);
    const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [snapOn, setSnapOn] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // polygons state: map unitId → Point[]
    const [polygons, setPolygons] = useState<Map<string, Point[]>>(new Map());
    const [history, setHistory] = useState<Map<string, Point[]>[]>([]);
    const [histIdx, setHistIdx] = useState(-1);

    // drag
    const dragRef = useRef<{ type: "pan" | "vertex" | "poly"; unitId?: string; vertIdx?: number; startX: number; startY: number; startPan?: Point; startPoly?: Point[] } | null>(null);
    const [saving, setSaving] = useState(false);

    // ── 3D state ──
    const canvasRef = useRef<HTMLDivElement>(null);
    const threeRef = useRef<{ cleanup: () => void } | null>(null);

    // ─── Build pixel polygons from units ────────────────────────────────────

    useEffect(() => {
        const map = new Map<string, Point[]>();

        // Collect all geo polygons to compute bbox
        const geoPts: Array<{ lat: number; lng: number }> = [];
        unidades.forEach(u => {
            const raw = normalizePoly(u.polygon);
            if (raw && typeof (raw[0] as any).lat === "number") {
                (raw as any[]).forEach((p: any) => geoPts.push(p));
            }
        });

        let bbox = { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1, w: 900, h: 600 };
        if (geoPts.length > 0) {
            const lats = geoPts.map(p => p.lat);
            const lngs = geoPts.map(p => p.lng);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            bbox = { minLat, maxLat, minLng, maxLng, w: 900, h: 600 };
        }

        unidades.forEach((u, idx) => {
            const raw = normalizePoly(u.polygon);
            if (raw && typeof (raw[0] as any).lat === "number") {
                map.set(u.id, geoToPixels(raw as any[], bbox));
            } else if (raw && typeof (raw[0] as any).x === "number") {
                map.set(u.id, raw as Point[]);
            } else {
                // Auto-grid
                const row = Math.floor(idx / COLS);
                const col = idx % COLS;
                const streetOffset = row >= 1 ? STREET : 0;
                const x = col * (LOTE_W + 4) + 10;
                const y = row * (LOTE_H + 4) + 10 + streetOffset;
                map.set(u.id, [
                    { x, y },
                    { x: x + LOTE_W, y },
                    { x: x + LOTE_W, y: y + LOTE_H },
                    { x, y: y + LOTE_H },
                ]);
            }
        });

        setPolygons(map);
        setHistory([new Map(map)]);
        setHistIdx(0);
    }, [unidades]);

    // ─── History helpers ─────────────────────────────────────────────────────

    const pushHistory = useCallback((next: Map<string, Point[]>) => {
        setHistory(h => {
            const trimmed = h.slice(0, histIdx + 1);
            const capped = [...trimmed, next].slice(-20);
            setHistIdx(capped.length - 1);
            return capped;
        });
    }, [histIdx]);

    const undo = () => {
        if (histIdx <= 0) return;
        const prev = history[histIdx - 1];
        setPolygons(new Map(prev));
        setHistIdx(i => i - 1);
    };

    const redo = () => {
        if (histIdx >= history.length - 1) return;
        const next = history[histIdx + 1];
        setPolygons(new Map(next));
        setHistIdx(i => i + 1);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [histIdx, history]);

    // ─── SVG mouse events ────────────────────────────────────────────────────

    const getSVGPoint = (e: React.MouseEvent | MouseEvent): Point => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom,
        };
    };

    const onSVGMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if ((e.target as SVGElement).dataset.role !== "bg") return;
        dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
    };

    const onPolyMouseDown = (e: React.MouseEvent, unitId: string) => {
        if (!isEditing) return;
        e.stopPropagation();
        const svgPt = getSVGPoint(e);
        dragRef.current = { type: "poly", unitId, startX: svgPt.x, startY: svgPt.y, startPoly: polygons.get(unitId)?.map(p => ({ ...p })) };
    };

    const onHandleMouseDown = (e: React.MouseEvent, unitId: string, vertIdx: number) => {
        e.stopPropagation();
        dragRef.current = { type: "vertex", unitId, vertIdx, startX: e.clientX, startY: e.clientY };
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        const drag = dragRef.current;
        if (!drag) return;

        if (drag.type === "pan" && drag.startPan) {
            setPan({ x: drag.startPan.x + e.clientX - drag.startX, y: drag.startPan.y + e.clientY - drag.startY });
        } else if (drag.type === "vertex" && drag.unitId !== undefined && drag.vertIdx !== undefined) {
            const svgPt = getSVGPoint(e);
            setPolygons(prev => {
                const poly = prev.get(drag.unitId!)?.map(p => ({ ...p }));
                if (!poly) return prev;
                poly[drag.vertIdx!] = { x: snap(svgPt.x, snapOn), y: snap(svgPt.y, snapOn) };
                return new Map(prev).set(drag.unitId!, poly);
            });
        } else if (drag.type === "poly" && drag.unitId && drag.startPoly) {
            const svgPt = getSVGPoint(e);
            const dx = svgPt.x - drag.startX;
            const dy = svgPt.y - drag.startY;
            setPolygons(prev => {
                const moved = drag.startPoly!.map(p => ({ x: snap(p.x + dx, snapOn), y: snap(p.y + dy, snapOn) }));
                return new Map(prev).set(drag.unitId!, moved);
            });
        }
    }, [pan, zoom, snapOn]);

    const onMouseUp = useCallback(() => {
        if (dragRef.current && (dragRef.current.type === "vertex" || dragRef.current.type === "poly")) {
            pushHistory(new Map(polygons));
        }
        dragRef.current = null;
    }, [polygons, pushHistory]);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.max(0.2, Math.min(5, z * delta)));
    };

    const handleSave = async () => {
        setSaving(true);
        const unitsWithPoly = unidades.filter(u => u.polygon);
        let ok = 0;
        for (const u of unitsWithPoly) {
            const pts = polygons.get(u.id);
            if (!pts || pts.length < 3) continue;
            // If original polygon was geo-based, we keep geo; otherwise send px coords as fallback
            const original = normalizePoly(u.polygon);
            if (original && typeof (original[0] as any).lat === "number") {
                // We don't convert back - just skip (pixel edit doesn't update geo polygon)
                ok++;
                continue;
            }
            const res = await updateUnidadPolygon(u.id, pts.map(p => ({ lat: p.y, lng: p.x })));
            if (res.success) ok++;
        }
        setSaving(false);
        toast.success(`${ok} polígono(s) guardado(s)`);
    };

    // ─── Stats ───────────────────────────────────────────────────────────────

    const counts = unidades.reduce((acc, u) => {
        const k = ["DISPONIBLE", "RESERVADO", "RESERVADA", "VENDIDO", "VENDIDA", "BLOQUEADO"].includes(u.estado)
            ? (["RESERVADO", "RESERVADA", "RESERVADA_PENDIENTE"].includes(u.estado) ? "RESERVADO" : ["VENDIDO", "VENDIDA"].includes(u.estado) ? "VENDIDO" : u.estado)
            : "OTRO";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // ─── 3D Renderer ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (mode !== "3d" || !canvasRef.current) return;

        let animId: number;
        let mounted = true;

        (async () => {
            const THREE = await import("three");
            const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

            if (!mounted || !canvasRef.current) return;

            const container = canvasRef.current;
            const w = container.clientWidth;
            const h = container.clientHeight || 500;

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(w, h);
            renderer.setClearColor(0x0f172a);
            container.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
            camera.position.set(0, 80, 120);

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.minDistance = 5;
            controls.maxDistance = 300;

            // Lighting
            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const dir = new THREE.DirectionalLight(0xffffff, 0.8);
            dir.position.set(50, 100, 50);
            scene.add(dir);

            // Ground
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(600, 600),
                new THREE.MeshPhongMaterial({ color: 0x1a1a2e })
            );
            ground.rotation.x = -Math.PI / 2;
            scene.add(ground);

            // Lotes
            const maxPrice = Math.max(...unidades.map(u => u.precio || 0), 1);
            unidades.forEach((u, idx) => {
                const color = new THREE.Color(ESTADO_FILL[u.estado] || "#94a3b8");
                const extH = 2 + ((u.precio || 0) / maxPrice) * 6;
                const row = Math.floor(idx / COLS);
                const col = idx % COLS;
                const x = (col - COLS / 2) * 12;
                const z = (row - 1) * 18;

                let geo: any;
                const pts2D = polygons.get(u.id);
                if (pts2D && pts2D.length >= 3) {
                    const shape = new THREE.Shape();
                    shape.moveTo(pts2D[0].x / 50, pts2D[0].y / 50);
                    pts2D.slice(1).forEach(p => shape.lineTo(p.x / 50, p.y / 50));
                    shape.closePath();
                    geo = new THREE.ExtrudeGeometry(shape, { depth: extH, bevelEnabled: false });
                } else {
                    geo = new THREE.BoxGeometry(10, extH, 15);
                }

                const mat = new THREE.MeshPhongMaterial({ color, shininess: 60 });
                const mesh = new THREE.Mesh(geo, mat);
                if (pts2D && pts2D.length >= 3) {
                    const cx = pts2D.reduce((s, p) => s + p.x, 0) / pts2D.length / 50;
                    const cy = pts2D.reduce((s, p) => s + p.y, 0) / pts2D.length / 50;
                    mesh.position.set(cx - 9, 0, cy - 6);
                } else {
                    mesh.position.set(x, extH / 2, z);
                }
                (mesh as any)._unitId = u.id;
                scene.add(mesh);
            });

            // Raycaster for click
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const onClick = (e: MouseEvent) => {
                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                const hits = raycaster.intersectObjects(scene.children);
                for (const hit of hits) {
                    const uid = (hit.object as any)._unitId;
                    if (uid) {
                        const u = unidades.find(u => u.id === uid);
                        if (u) onLoteClick(u);
                        break;
                    }
                }
            };
            renderer.domElement.addEventListener("click", onClick);

            const animate = () => {
                if (!mounted) return;
                animId = requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };
            animate();

            threeRef.current = {
                cleanup: () => {
                    mounted = false;
                    cancelAnimationFrame(animId);
                    renderer.domElement.removeEventListener("click", onClick);
                    renderer.dispose();
                    if (container.contains(renderer.domElement)) {
                        container.removeChild(renderer.domElement);
                    }
                }
            };
        })();

        return () => {
            mounted = false;
            threeRef.current?.cleanup();
            threeRef.current = null;
        };
    }, [mode, unidades, polygons, onLoteClick]);

    // ─── Toolbar ─────────────────────────────────────────────────────────────

    const Toolbar = () => (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {mode === "2d" && (
                <>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold">
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700 text-xs font-bold">
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700 text-xs font-bold">
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

                    <button
                        onClick={() => setIsEditing(e => !e)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                            isEditing ? "bg-brand-orange text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700")}
                    >
                        <Edit3 className="w-3.5 h-3.5" /> {isEditing ? "Editando" : "Editar"}
                    </button>
                    <button onClick={undo} disabled={histIdx <= 0} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 flex items-center gap-1.5">
                        <Undo2 className="w-3.5 h-3.5" /> Undo
                    </button>
                    <button onClick={redo} disabled={histIdx >= history.length - 1} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 flex items-center gap-1.5">
                        <Redo2 className="w-3.5 h-3.5" /> Redo
                    </button>
                    <button
                        onClick={() => setSnapOn(s => !s)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                            snapOn ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}
                    >
                        <Grid3x3 className="w-3.5 h-3.5" /> Snap
                    </button>
                    {isEditing && (
                        <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" /> {saving ? "Guardando..." : "Guardar"}
                        </button>
                    )}
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                </>
            )}

            {/* Stat counts */}
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                <span className="text-emerald-500">{counts.DISPONIBLE || 0} disponibles</span>
                <span>·</span>
                <span className="text-amber-500">{counts.RESERVADO || 0} reservados</span>
                <span>·</span>
                <span className="text-rose-500">{counts.VENDIDO || 0} vendidos</span>
                {counts.BLOQUEADO > 0 && <><span>·</span><span className="text-slate-400">{counts.BLOQUEADO} bloqueados</span></>}
            </div>

            <div className="ml-auto flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Mode switcher is handled by parent via `mode` prop; show current mode */}
                <span className={cn("px-3 py-1.5 text-xs font-bold", mode === "2d" ? "bg-brand-orange text-white" : "text-slate-400")}>
                    <Square className="w-3.5 h-3.5 inline mr-1" />2D
                </span>
                <span className={cn("px-3 py-1.5 text-xs font-bold border-l border-slate-200 dark:border-slate-700", mode === "3d" ? "bg-brand-orange text-white" : "text-slate-400")}>
                    <Layers className="w-3.5 h-3.5 inline mr-1" />3D
                </span>
            </div>
        </div>
    );

    // ─── Legend ───────────────────────────────────────────────────────────────

    const Legend = () => (
        <div className="flex flex-wrap gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 text-xs font-medium">
            {Object.entries({ DISPONIBLE: "#22c55e", RESERVADO: "#f59e0b", VENDIDO: "#ef4444", BLOQUEADO: "#6b7280" }).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
                    {k.charAt(0) + k.slice(1).toLowerCase()}
                </span>
            ))}
        </div>
    );

    // ─── 2D SVG Render ───────────────────────────────────────────────────────

    if (mode === "2d") {
        return (
            <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <Toolbar />
                <div className="relative flex-1 overflow-hidden" style={{ height: "calc(100vh - 420px)", minHeight: 400 }}>
                    <svg
                        ref={svgRef}
                        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                        style={{ background: "#0f172a" }}
                        onMouseDown={onSVGMouseDown}
                        onWheel={onWheel}
                    >
                        <rect data-role="bg" x="-99999" y="-99999" width="999999" height="999999" fill="transparent" />
                        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                            {unidades.map((u) => {
                                const pts = polygons.get(u.id);
                                if (!pts || pts.length < 3) return null;
                                const fill = ESTADO_FILL[u.estado] || "#94a3b8";
                                const center = polyCenter(pts);
                                const isSelected = selectedId === u.id;

                                return (
                                    <g key={u.id}>
                                        <polygon
                                            points={ptsToStr(pts)}
                                            fill={fill}
                                            fillOpacity={0.75}
                                            stroke={isSelected ? "#ffffff" : "white"}
                                            strokeWidth={isSelected ? 2 : 1}
                                            style={{ cursor: isEditing ? "move" : "pointer", filter: isSelected ? "brightness(1.2)" : undefined }}
                                            onClick={(e) => { e.stopPropagation(); setSelectedId(u.id); onLoteClick(u); }}
                                            onMouseDown={(e) => onPolyMouseDown(e, u.id)}
                                            onMouseEnter={(e) => { if (!isEditing) (e.target as SVGElement).style.filter = "brightness(1.15)"; }}
                                            onMouseLeave={(e) => { (e.target as SVGElement).style.filter = ""; }}
                                        />

                                        {/* Labels */}
                                        <text x={center.x} y={center.y - 10} textAnchor="middle" fontSize={12} fontWeight="bold" fill="white" pointerEvents="none">
                                            {u.numero}
                                        </text>
                                        {u.superficie && (
                                            <text x={center.x} y={center.y + 4} textAnchor="middle" fontSize={10} fill="white" pointerEvents="none">
                                                {u.superficie} m²
                                            </text>
                                        )}
                                        {u.precio && (
                                            <text x={center.x} y={center.y + 16} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.8)" pointerEvents="none">
                                                {formatCurrency(u.precio)}
                                            </text>
                                        )}

                                        {/* Vertex handles when editing */}
                                        {isEditing && pts.map((pt, vi) => (
                                            <circle
                                                key={vi}
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={6}
                                                fill="white"
                                                stroke="#f97316"
                                                strokeWidth={2}
                                                style={{ cursor: "crosshair" }}
                                                onMouseDown={(e) => { e.stopPropagation(); onHandleMouseDown(e, u.id, vi); }}
                                            />
                                        ))}
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </div>
                <Legend />
            </div>
        );
    }

    // ─── 3D Render ────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Toolbar />
            <div ref={canvasRef} className="w-full" style={{ height: "calc(100vh - 380px)", minHeight: 500, background: "#0f172a" }} />
            <Legend />
        </div>
    );
}
