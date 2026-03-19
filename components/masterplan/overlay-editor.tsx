"use client";

import { useEffect, useState, useRef } from "react";
import { Save, X, Trash2 } from "lucide-react";

type LatLngTuple = [number, number];

export interface OverlayConfig {
    imageUrl: string | null;
    bounds: [LatLngTuple, LatLngTuple] | null; // [SouthWest, NorthEast] — axis-aligned, pre-rotation
    rotation: number;
    opacity: number;
}

interface OverlayEditorProps {
    proyectoId: string;
    map: any;
    existingConfig: OverlayConfig | null;
    // rotation is now passed alongside bounds so live polygon transform can apply it
    onBoundsChange?: (bounds: [[number, number], [number, number]], rotation: number) => void;
    onSave: (config: OverlayConfig) => void;
    onCancel: () => void;
    onDelete: () => void;
}

function computeRotatedCorners(bounds: [LatLngTuple, LatLngTuple], rot: number): LatLngTuple[] {
    const [[swLat, swLng], [neLat, neLng]] = bounds;
    const cLat = (swLat + neLat) / 2;
    const cLng = (swLng + neLng) / 2;
    const rad = (rot * Math.PI) / 180;
    return ([
        [swLat, swLng], [swLat, neLng], [neLat, neLng], [neLat, swLng],
    ] as LatLngTuple[]).map(([lat, lng]) => {
        const dLat = lat - cLat, dLng = lng - cLng;
        return [
            cLat + dLat * Math.cos(rad) - dLng * Math.sin(rad),
            cLng + dLat * Math.sin(rad) + dLng * Math.cos(rad),
        ] as LatLngTuple;
    });
}

function unrotatePoint(dragPt: LatLngTuple, center: LatLngTuple, rot: number): LatLngTuple {
    const rad = (-rot * Math.PI) / 180;
    const dLat = dragPt[0] - center[0], dLng = dragPt[1] - center[1];
    return [
        center[0] + dLat * Math.cos(rad) - dLng * Math.sin(rad),
        center[1] + dLat * Math.sin(rad) + dLng * Math.cos(rad),
    ];
}

export default function OverlayEditor({
    proyectoId, map, existingConfig, onBoundsChange, onSave, onCancel, onDelete,
}: OverlayEditorProps) {
    const [opacity] = useState<number>(existingConfig?.opacity ?? 0.7);
    const [rotation, setRotation] = useState<number>(existingConfig?.rotation ?? 0);
    const rotationRef = useRef<number>(existingConfig?.rotation ?? 0);
    const [isSaving, setIsSaving] = useState(false);

    const overlayRef = useRef<any>(null);   // L.Polygon — visual reference frame
    const imageOverlayRef = useRef<any>(null); // L.ImageOverlay inside editor
    const anchorsRef = useRef<any[]>([]);   // All drag handles
    const boundsRef = useRef<[LatLngTuple, LatLngTuple]>([[0,0], [0,0]]);

    // Keep ref in sync with state so Leaflet event handlers always read the latest value
    useEffect(() => { rotationRef.current = rotation; }, [rotation]);

    // Apply rotation safely to leafet image
    const updateImageTransform = () => {
        if (!imageOverlayRef.current) return;
        const img = imageOverlayRef.current.getElement();
        if (img) {
            img.style.transformOrigin = "center center";
            img.style.transform = img.style.transform.replace(/ rotate\([^)]*\)/g, "");
            img.style.transform += ` rotate(${rotationRef.current}deg)`;
        }
    };

    useEffect(() => {
        if (!map) return;
        map.on("zoom", updateImageTransform);
        map.on("move", updateImageTransform);
        return () => {
            map.off("zoom", updateImageTransform);
            map.off("move", updateImageTransform);
        };
    }, [map]);

    useEffect(() => {
        if (!map) return;

        // ── Helpers ──────────────────────────────────────────────────────────────

        /** Redraws polygon + repositions all derived handles from current SW/NE state. */
        const syncAll = (skipCenter = false) => {
            const b = boundsRef.current;
            if (!b || !overlayRef.current) return;
            const [[swLat, swLng], [neLat, neLng]] = b;
            const cLat = (swLat + neLat) / 2, cLng = (swLng + neLng) / 2;

            // Redraw rotated polygon border
            overlayRef.current.setLatLngs(computeRotatedCorners(b, rotationRef.current));

            // Sync all derived handles to their actual rotated positions!
            const [rSW, rSE, rNE, rNW] = computeRotatedCorners(b, rotationRef.current);
            const rS: LatLngTuple = [(rSW[0]+rSE[0])/2, (rSW[1]+rSE[1])/2];
            const rN: LatLngTuple = [(rNW[0]+rNE[0])/2, (rNW[1]+rNE[1])/2];
            const rE: LatLngTuple = [(rSE[0]+rNE[0])/2, (rSE[1]+rNE[1])/2];
            const rW: LatLngTuple = [(rSW[0]+rNW[0])/2, (rSW[1]+rNW[1])/2];

            const set = (id: string, pos: LatLngTuple) => {
                const m = anchorsRef.current.find(m => (m as any)._hid === id);
                if (m) m.setLatLng(pos);
            };
            set("sw", rSW); set("se", rSE); set("ne", rNE); set("nw", rNW);
            set("s", rS); set("n", rN); set("e", rE); set("w", rW);
            if (!skipCenter) set("center", [cLat, cLng]);

            // Rotation handle: positioned above the rotated N edge center
            const rotM = anchorsRef.current.find(m => (m as any)._hid === "rotation");
            if (rotM) {
                const offset = (neLat - swLat) * 0.22;
                const rad = (rotationRef.current * Math.PI) / 180;
                const dLat = neLat + offset - cLat; 
                rotM.setLatLng([
                    cLat + dLat * Math.cos(rad),
                    cLng + dLat * Math.sin(rad),
                ]);
            }

            if (imageOverlayRef.current) {
                imageOverlayRef.current.setBounds(b);
                updateImageTransform();
            }

            onBoundsChange?.(b, rotationRef.current);
        };

        // ── Init ─────────────────────────────────────────────────────────────────

        const initOverlay = async () => {
            const L = (await import("leaflet")).default;

            let bounds: [LatLngTuple, LatLngTuple];
            if (existingConfig?.bounds) {
                bounds = existingConfig.bounds;
            } else {
                const c = map.getCenter();
                bounds = [[c.lat - 0.002, c.lng - 0.003], [c.lat + 0.002, c.lng + 0.003]];
            }
            boundsRef.current = bounds;

            if (overlayRef.current) map.removeLayer(overlayRef.current);
            if (imageOverlayRef.current) map.removeLayer(imageOverlayRef.current);

            if (existingConfig?.imageUrl) {
                imageOverlayRef.current = L.imageOverlay(existingConfig.imageUrl, bounds, {
                    opacity, interactive: false
                }).addTo(map);
            }

            // L.polygon so it can be rotated visually (L.rectangle can't)
            overlayRef.current = (L.polygon as any)(
                computeRotatedCorners(boundsRef.current, rotationRef.current),
                { color: "#f97316", weight: 2, fillColor: "#f97316", fillOpacity: 0.07, dashArray: "8 5" }
            ).addTo(map);
            updateImageTransform();

            createHandles(boundsRef.current, L);
        };

        // ── Handle creation ───────────────────────────────────────────────────────

        const createHandles = (bounds: [LatLngTuple, LatLngTuple], L: any) => {
            anchorsRef.current.forEach(a => map.removeLayer(a));
            anchorsRef.current = [];

            const [rSW, rSE, rNE, rNW] = computeRotatedCorners(bounds, rotationRef.current);
            const rS: LatLngTuple = [(rSW[0]+rSE[0])/2, (rSW[1]+rSE[1])/2];
            const rN: LatLngTuple = [(rNW[0]+rNE[0])/2, (rNW[1]+rNE[1])/2];
            const rE: LatLngTuple = [(rSE[0]+rNE[0])/2, (rSE[1]+rNE[1])/2];
            const rW: LatLngTuple = [(rSW[0]+rNW[0])/2, (rSW[1]+rNW[1])/2];
            
            const [[swLat, swLng], [neLat, neLng]] = bounds;
            const cLat = (swLat + neLat) / 2, cLng = (swLng + neLng) / 2;

            // Rotation handle: above N edge center, rotated with the plan
            const rotOffset = (neLat - swLat) * 0.22;
            const rotRad = (rotationRef.current * Math.PI) / 180;
            const rotPos: LatLngTuple = [
                cLat + (neLat + rotOffset - cLat) * Math.cos(rotRad),
                cLng + (neLat + rotOffset - cLat) * Math.sin(rotRad),
            ];

            const defs: { id: string; pos: LatLngTuple; type: "corner" | "edge" | "center" | "rotation" }[] = [
                // Corners
                { id: "sw", pos: rSW, type: "corner" },
                { id: "se", pos: rSE, type: "corner" },
                { id: "ne", pos: rNE, type: "corner" },
                { id: "nw", pos: rNW, type: "corner" },
                // Edges
                { id: "n",  pos: rN,  type: "edge" },
                { id: "s",  pos: rS,  type: "edge" },
                { id: "e",  pos: rE,  type: "edge" },
                { id: "w",  pos: rW,  type: "edge" },
                // Special
                { id: "center",   pos: [cLat, cLng], type: "center" },
                { id: "rotation", pos: rotPos,        type: "rotation" },
            ];

            defs.forEach(def => {
                const { id, pos, type } = def;
                let html: string, sz: [number, number], anc: [number, number];

                if (type === "center") {
                    html = '<div style="width:20px;height:20px;background:#6366f1;border:2.5px solid #4f46e5;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,.6);cursor:move;display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-size:13px;line-height:1">✥</span></div>';
                    sz = [20, 20]; anc = [10, 10];
                } else if (type === "rotation") {
                    html = '<div style="width:18px;height:18px;background:#0ea5e9;border:2.5px solid #0284c7;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.55);cursor:crosshair;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;line-height:1">↻</div>';
                    sz = [18, 18]; anc = [9, 9];
                } else if (type === "edge") {
                    const horiz = id === "n" || id === "s";
                    const cur = horiz ? "ns-resize" : "ew-resize";
                    html = `<div style="width:${horiz ? 20 : 8}px;height:${horiz ? 8 : 20}px;background:#f97316;border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,.5);cursor:${cur}"></div>`;
                    sz  = horiz ? [20, 8]  : [8, 20];
                    anc = horiz ? [10, 4]  : [4, 10];
                } else {
                    // corner
                    html = '<div style="width:16px;height:16px;background:#fff;border:2.5px solid #f97316;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.55);cursor:move"></div>';
                    sz = [16, 16]; anc = [8, 8];
                }

                const icon = L.divIcon({ className: "", html, iconSize: sz, iconAnchor: anc });
                const marker = L.marker(pos, {
                    draggable: true, icon,
                    zIndexOffset: type === "center" ? 1500 : type === "rotation" ? 1200 : 1000,
                }).addTo(map);
                (marker as any)._hid = id;

                // ── Event wiring ─────────────────────────────────────────────────

                if (type === "center") {
                    marker.on("dragstart", () => { (marker as any)._prev = marker.getLatLng(); });
                    marker.on("drag", () => {
                        const cur = marker.getLatLng(), prv = (marker as any)._prev;
                        if (!prv) return;
                        const dLat = cur.lat - prv.lat, dLng = cur.lng - prv.lng;
                        (marker as any)._prev = cur;
                        const b = boundsRef.current;
                        boundsRef.current = [
                            [b[0][0] + dLat, b[0][1] + dLng],
                            [b[1][0] + dLat, b[1][1] + dLng]
                        ];
                        // Physically shift all anchors visually immediately to prevent jitter
                        anchorsRef.current.forEach(m => {
                            if ((m as any)._hid !== "center") {
                                const ll = m.getLatLng();
                                m.setLatLng([ll.lat + dLat, ll.lng + dLng]);
                            }
                        });
                        syncAll(true);
                    });
                    marker.on("dragend", () => syncAll());

                } else if (type === "rotation") {
                    marker.on("dragstart", () => {
                        const b2 = boundsRef.current;
                        const [[s, w], [n, e]] = b2;
                        const cPt = map.latLngToContainerPoint([(s + n) / 2, (w + e) / 2]);
                        const hPt = map.latLngToContainerPoint(marker.getLatLng());
                        (marker as any)._ia = Math.atan2(hPt.y - cPt.y, hPt.x - cPt.x) * 180 / Math.PI;
                        (marker as any)._ir = rotationRef.current;
                    });
                    marker.on("drag", () => {
                        const b2 = boundsRef.current;
                        const [[s, w], [n, e]] = b2;
                        const cPt = map.latLngToContainerPoint([(s + n) / 2, (w + e) / 2]);
                        const hPt = map.latLngToContainerPoint(marker.getLatLng());
                        const ca = Math.atan2(hPt.y - cPt.y, hPt.x - cPt.x) * 180 / Math.PI;
                        const newRot = (((marker as any)._ir ?? 0) + (ca - ((marker as any)._ia ?? 0)) + 360) % 360;
                        rotationRef.current = newRot;
                        setRotation(newRot);
                        // Using boundsRef so it spins in place!
                        syncAll();
                    });
                    marker.on("dragend", () => syncAll());

                } else if (type === "corner") {
                    marker.on("dragstart", () => {
                        const b2 = boundsRef.current;
                        (marker as any)._ar = (b2[1][0] - b2[0][0]) / (b2[1][1] - b2[0][1]); // lat span / lng span
                        
                        // Pick the diagonally opposite rotated corner
                        const [rSW, rSE, rNE, rNW] = computeRotatedCorners(b2, rotationRef.current);
                        (marker as any)._fixedRot = 
                            id === "sw" ? rNE : id === "nw" ? rSE :
                            id === "ne" ? rSW : rNW;
                    });
                    marker.on("drag", () => {
                        const fixedRot = (marker as any)._fixedRot;
                        if (!fixedRot) return;
                        
                        const curLL = marker.getLatLng();
                        const cNew: LatLngTuple = [(fixedRot[0] + curLL.lat)/2, (fixedRot[1] + curLL.lng)/2];
                        const ud = unrotatePoint([curLL.lat, curLL.lng], cNew, rotationRef.current);
                        const uf = unrotatePoint(fixedRot, cNew, rotationRef.current);

                        // Enforce aspect ratio in unrotated space (optional but requested)
                        let dLat = ud[0] - uf[0], dLng = ud[1] - uf[1];
                        const ar = (marker as any)._ar;
                        if (Math.abs(dLng) * ar > Math.abs(dLat)) dLat = Math.sign(dLat) * Math.abs(dLng) * ar;
                        else dLng = Math.sign(dLng) * Math.abs(dLat) / ar;
                        
                        const minLat = Math.min(uf[0] + dLat, uf[0]), maxLat = Math.max(uf[0] + dLat, uf[0]);
                        const minLng = Math.min(uf[1] + dLng, uf[1]), maxLng = Math.max(uf[1] + dLng, uf[1]);
                        boundsRef.current = [[minLat, minLng], [maxLat, maxLng]];
                        syncAll();
                    });
                    marker.on("dragend", () => syncAll());

                } else { // type === "edge"
                    marker.on("dragstart", () => {
                        const b2 = boundsRef.current;
                        const [rSW, rSE, rNE, rNW] = computeRotatedCorners(b2, rotationRef.current);
                        // Fix the complete opposite edge natively
                        (marker as any)._fixedEdge = 
                            id === "n" ? [rSW, rSE] : id === "s" ? [rNW, rNE] :
                            id === "e" ? [rSW, rNW] : [rSE, rNE];
                    });
                    marker.on("drag", () => {
                        const fe = (marker as any)._fixedEdge;
                        if (!fe) return;

                        const curLL = marker.getLatLng();
                        const fm: LatLngTuple = [(fe[0][0] + fe[1][0])/2, (fe[0][1] + fe[1][1])/2];
                        const cNew: LatLngTuple = [(fm[0] + curLL.lat)/2, (fm[1] + curLL.lng)/2];
                        
                        const ud = unrotatePoint([curLL.lat, curLL.lng], cNew, rotationRef.current);
                        const uf0 = unrotatePoint(fe[0], cNew, rotationRef.current);
                        const uf1 = unrotatePoint(fe[1], cNew, rotationRef.current);

                        const lats = [ud[0], uf0[0], uf1[0]], lngs = [ud[1], uf0[1], uf1[1]];
                        boundsRef.current = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
                        syncAll();
                    });
                    marker.on("dragend", () => syncAll());
                }

                anchorsRef.current.push(marker);
            });
        };

        initOverlay();
        return () => {
            if (overlayRef.current) map.removeLayer(overlayRef.current);
            if (imageOverlayRef.current) map.removeLayer(imageOverlayRef.current);
            anchorsRef.current.forEach(a => map.removeLayer(a));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);

    // ── Save ──────────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!overlayRef.current) return;
        setIsSaving(true);

        const bounds = boundsRef.current;

        const savedImageUrl = existingConfig?.imageUrl && !existingConfig.imageUrl.startsWith("blob:")
            ? existingConfig.imageUrl : null;
        const rot = rotationRef.current;

        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/overlay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: savedImageUrl, bounds, rotation: rot,
                    mapCenter: { lat: map.getCenter().lat, lng: map.getCenter().lng, zoom: map.getZoom() },
                }),
            });
            if (res.ok) onSave({ imageUrl: savedImageUrl, bounds, rotation: rot, opacity });
        } catch (e) { console.error("Save failed", e); }
        finally { setIsSaving(false); }
    };

    // ── UI ────────────────────────────────────────────────────────────────────────

    return (
        <div className="absolute top-4 right-16 z-[2000] bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-4 w-64 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Posicionar Plano</h3>
                <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[10px] text-blue-600 dark:text-blue-300 leading-snug space-y-1">
                <p><span style={{ color: "#6366f1", fontWeight: 700 }}>Azul ✥</span> — mover todo.</p>
                <p><span style={{ color: "#f97316", fontWeight: 700 }}>Esquinas naranja</span> — escalar (mantiene proporción).</p>
                <p><span style={{ color: "#f97316", fontWeight: 700 }}>Bordes naranja</span> — escalar un eje.</p>
                <p><span style={{ color: "#0ea5e9", fontWeight: 700 }}>Celeste ↻</span> — rotar (encima del plano).</p>
            </div>

            {rotation !== 0 && (
                <div className="mb-3 flex items-center justify-between px-2.5 py-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
                    <span className="text-[10px] text-sky-600 dark:text-sky-300 font-medium">Rotación</span>
                    <span className="text-[10px] font-bold text-sky-700 dark:text-sky-200">{Math.round(rotation)}°</span>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={handleSave} disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                    {isSaving ? "Guardando..." : <><Save className="w-3 h-3" /> Fijar Posición</>}
                </button>
                <button
                    onClick={onDelete}
                    className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                    title="Resetear posición"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
