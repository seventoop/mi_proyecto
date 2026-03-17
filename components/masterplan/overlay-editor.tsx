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

// Rotate the 4 AABB corners around their center by `rot` degrees
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

export default function OverlayEditor({
    proyectoId, map, existingConfig, onBoundsChange, onSave, onCancel, onDelete,
}: OverlayEditorProps) {
    const [opacity] = useState<number>(existingConfig?.opacity ?? 0.7);
    const [rotation, setRotation] = useState<number>(existingConfig?.rotation ?? 0);
    const rotationRef = useRef<number>(existingConfig?.rotation ?? 0);
    const [isSaving, setIsSaving] = useState(false);

    const overlayRef = useRef<any>(null);   // L.Polygon — visual reference frame
    const anchorsRef = useRef<any[]>([]);   // All drag handles

    // Keep ref in sync with state so Leaflet event handlers always read the latest value
    useEffect(() => { rotationRef.current = rotation; }, [rotation]);

    useEffect(() => {
        if (!map) return;

        // ── Helpers ──────────────────────────────────────────────────────────────

        const getBoundsFromAnchors = (): [LatLngTuple, LatLngTuple] | null => {
            const swM = anchorsRef.current.find(m => (m as any)._hid === "sw");
            const neM = anchorsRef.current.find(m => (m as any)._hid === "ne");
            if (!swM || !neM) return null;
            const sw = swM.getLatLng(), ne = neM.getLatLng();
            return [[sw.lat, sw.lng], [ne.lat, ne.lng]];
        };

        /** Redraws polygon + repositions all derived handles from current SW/NE state. */
        const syncAll = (skipCenter = false) => {
            const b = getBoundsFromAnchors();
            if (!b || !overlayRef.current) return;
            const [[swLat, swLng], [neLat, neLng]] = b;
            const cLat = (swLat + neLat) / 2, cLng = (swLng + neLng) / 2;

            // Redraw rotated polygon border
            overlayRef.current.setLatLngs(computeRotatedCorners(b, rotationRef.current));

            // Sync all derived handles (unrotated positions for edge/corner handles)
            const set = (id: string, pos: LatLngTuple) => {
                const m = anchorsRef.current.find(m => (m as any)._hid === id);
                if (m) m.setLatLng(pos);
            };
            set("se", [swLat, neLng]);
            set("nw", [neLat, swLng]);
            set("n",  [neLat, cLng]);
            set("s",  [swLat, cLng]);
            set("e",  [cLat,  neLng]);
            set("w",  [cLat,  swLng]);
            if (!skipCenter) set("center", [cLat, cLng]);

            // Rotation handle: positioned above the N edge center, then rotated
            const rotM = anchorsRef.current.find(m => (m as any)._hid === "rotation");
            if (rotM) {
                const offset = (neLat - swLat) * 0.22;
                const rad = (rotationRef.current * Math.PI) / 180;
                const dLat = neLat + offset - cLat; // above N edge
                // rotate around center
                rotM.setLatLng([
                    cLat + dLat * Math.cos(rad),
                    cLng + dLat * Math.sin(rad),
                ]);
            }

            onBoundsChange?.([[swLat, swLng], [neLat, neLng]], rotationRef.current);
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

            if (overlayRef.current) map.removeLayer(overlayRef.current);

            // L.polygon so it can be rotated visually (L.rectangle can't)
            overlayRef.current = (L.polygon as any)(
                computeRotatedCorners(bounds, rotationRef.current),
                { color: "#f97316", weight: 2, fillColor: "#f97316", fillOpacity: 0.07, dashArray: "8 5" }
            ).addTo(map);

            createHandles(bounds, L);
        };

        // ── Handle creation ───────────────────────────────────────────────────────

        const createHandles = (bounds: [LatLngTuple, LatLngTuple], L: any) => {
            anchorsRef.current.forEach(a => map.removeLayer(a));
            anchorsRef.current = [];

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
                // Corners (resize with aspect-ratio lock)
                { id: "sw", pos: [swLat, swLng], type: "corner" },
                { id: "se", pos: [swLat, neLng], type: "corner" },
                { id: "ne", pos: [neLat, neLng], type: "corner" },
                { id: "nw", pos: [neLat, swLng], type: "corner" },
                // Edges (resize one axis only)
                { id: "n",  pos: [neLat, cLng],  type: "edge" },
                { id: "s",  pos: [swLat, cLng],  type: "edge" },
                { id: "e",  pos: [cLat,  neLng], type: "edge" },
                { id: "w",  pos: [cLat,  swLng], type: "edge" },
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
                        const b2 = getBoundsFromAnchors(); if (!b2) return;
                        const [[s, w], [n, e]] = b2;
                        const cPt = map.latLngToContainerPoint([(s + n) / 2, (w + e) / 2]);
                        const hPt = map.latLngToContainerPoint(marker.getLatLng());
                        (marker as any)._ia = Math.atan2(hPt.y - cPt.y, hPt.x - cPt.x) * 180 / Math.PI;
                        (marker as any)._ir = rotationRef.current;
                    });
                    marker.on("drag", () => {
                        const b2 = getBoundsFromAnchors(); if (!b2) return;
                        const [[s, w], [n, e]] = b2;
                        const cPt = map.latLngToContainerPoint([(s + n) / 2, (w + e) / 2]);
                        const hPt = map.latLngToContainerPoint(marker.getLatLng());
                        const ca = Math.atan2(hPt.y - cPt.y, hPt.x - cPt.x) * 180 / Math.PI;
                        const newRot = (((marker as any)._ir ?? 0) + (ca - ((marker as any)._ia ?? 0)) + 360) % 360;
                        rotationRef.current = newRot;
                        setRotation(newRot);
                        overlayRef.current?.setLatLngs(computeRotatedCorners(b2, newRot));
                        onBoundsChange?.([[s, w], [n, e]], newRot);
                    });
                    marker.on("dragend", () => syncAll());

                } else if (type === "corner") {
                    // Capture aspect-ratio and fixed corner at dragstart
                    marker.on("dragstart", () => {
                        const b2 = getBoundsFromAnchors(); if (!b2) return;
                        const [[swL, swG], [neL, neG]] = b2;
                        const swPt = map.latLngToContainerPoint([swL, swG]);
                        const nePt = map.latLngToContainerPoint([neL, neG]);
                        const pxW = Math.abs(nePt.x - swPt.x);
                        const pxH = Math.abs(nePt.y - swPt.y);
                        (marker as any)._ar = pxW > 0 ? pxH / pxW : 1; // pxH/pxW ratio
                        // Fixed corner = opposite of this handle
                        (marker as any)._fixed =
                            id === "sw" ? { lat: neL, lng: neG } :
                            id === "ne" ? { lat: swL, lng: swG } :
                            id === "se" ? { lat: neL, lng: swG } : // NW
                                          { lat: swL, lng: neG };  // id === "nw" → SE
                    });
                    marker.on("drag", () => {
                        const fixed = (marker as any)._fixed;
                        const ar: number = (marker as any)._ar ?? 1;
                        if (!fixed) { syncAll(); return; }

                        // Constrain drag to aspect ratio in pixel space
                        const fixedPt = map.latLngToContainerPoint([fixed.lat, fixed.lng]);
                        const dragPt  = map.latLngToContainerPoint(marker.getLatLng());
                        let dx = dragPt.x - fixedPt.x;
                        let dy = dragPt.y - fixedPt.y;

                        if (Math.abs(dx) * ar > Math.abs(dy)) {
                            dy = (Math.sign(dy) || (id === "ne" || id === "nw" ? -1 : 1)) * Math.abs(dx) * ar;
                        } else {
                            dx = (Math.sign(dx) || (id === "sw" || id === "nw" ? -1 : 1)) * Math.abs(dy) / ar;
                        }

                        const constrained = map.containerPointToLatLng(
                            L.point(fixedPt.x + dx, fixedPt.y + dy)
                        );
                        marker.setLatLng(constrained); // snap to aspect-ratio

                        // Update SW/NE primary markers based on which corner moved
                        const swM = anchorsRef.current.find(m => (m as any)._hid === "sw");
                        const neM = anchorsRef.current.find(m => (m as any)._hid === "ne");
                        if (!swM || !neM) { syncAll(); return; }

                        if (id === "sw") {
                            swM.setLatLng(constrained);
                            neM.setLatLng(fixed);
                        } else if (id === "ne") {
                            neM.setLatLng(constrained);
                            swM.setLatLng(fixed);
                        } else if (id === "se") {
                            // SE moves: NW is fixed → SW.lat = SE.lat, NE.lng = SE.lng
                            swM.setLatLng([constrained.lat, fixed.lng]);
                            neM.setLatLng([fixed.lat, constrained.lng]);
                        } else { // nw
                            // NW moves: SE is fixed → NE.lat = NW.lat, SW.lng = NW.lng
                            neM.setLatLng([constrained.lat, fixed.lng]);
                            swM.setLatLng([fixed.lat, constrained.lng]);
                        }
                        syncAll();
                    });
                    marker.on("dragend", () => syncAll());

                } else { // type === "edge"
                    marker.on("drag", () => {
                        const ll = marker.getLatLng();
                        const swM = anchorsRef.current.find(m => (m as any)._hid === "sw");
                        const neM = anchorsRef.current.find(m => (m as any)._hid === "ne");
                        if (!swM || !neM) return;
                        if (id === "n") neM.setLatLng([ll.lat, neM.getLatLng().lng]);
                        if (id === "s") swM.setLatLng([ll.lat, swM.getLatLng().lng]);
                        if (id === "e") neM.setLatLng([neM.getLatLng().lat, ll.lng]);
                        if (id === "w") swM.setLatLng([swM.getLatLng().lat, ll.lng]);
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
            anchorsRef.current.forEach(a => map.removeLayer(a));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);

    // ── Save ──────────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!overlayRef.current) return;
        setIsSaving(true);

        const swM = anchorsRef.current.find(m => (m as any)._hid === "sw");
        const neM = anchorsRef.current.find(m => (m as any)._hid === "ne");
        let bounds: [LatLngTuple, LatLngTuple];
        if (swM && neM) {
            bounds = [[swM.getLatLng().lat, swM.getLatLng().lng], [neM.getLatLng().lat, neM.getLatLng().lng]];
        } else {
            const bo = overlayRef.current.getBounds();
            bounds = [[bo.getSouthWest().lat, bo.getSouthWest().lng], [bo.getNorthEast().lat, bo.getNorthEast().lng]];
        }

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
