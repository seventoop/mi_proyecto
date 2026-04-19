"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, Image as ImageIcon, Map as MapIcon, Square, Layers } from "lucide-react";
import { computeSvgViewBox, svgPathToLatLng } from "@/lib/geo-projection";

const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#22c55e",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    BLOQUEADA: "#94a3b8",
    SUSPENDIDO: "#64748b",
};

const STATUS_LEGEND: Array<[string, string]> = [
    ["Disponible", "#22c55e"],
    ["Reservado", "#f59e0b"],
    ["Vendido", "#ef4444"],
];

const DARK_BG = "#1e1e1e";

export interface PreviewUnit {
    id: string;
    estado: string;
    coordenadasMasterplan: string | null;
}

export interface PreviewMapImage {
    id: string;
    url: string;
    titulo: string | null;
    lat: number;
    lng: number;
    tipo: string;
}

export interface ProjectPreviewViewerProps {
    slug: string;
    projectName: string;
    /** Cleaned masterplan SVG as data: URL (already stripped of <text>/fills upstream). */
    planAsset: string | null;
    mapCenterLat: number | null;
    mapCenterLng: number | null;
    mapZoom: number | null;
    overlayBounds: string | null;
    overlayRotation: number | null;
    units: PreviewUnit[];
    mapImages: PreviewMapImage[];
}

type ViewMode = "plano" | "mapa";

/**
 * Two-mode showcase viewer:
 *   PLANO  → solo el SVG sobre fondo gris oscuro (no satélite, no leaflet).
 *   MAPA   → satélite + plano (overlay con bounds + rotación tal como se cargó
 *            en el dashboard).
 *
 * En cualquiera de los dos modos podés activar overlays:
 *   ESTADOS   → polígonos coloreados por estado de cada lote.
 *   IMÁGENES  → marcadores de fotos vinculadas (sólo aparece en modo MAPA;
 *               en PLANO no hay coordenadas para anclar marcadores).
 */
export default function ProjectPreviewViewer({
    slug,
    projectName,
    planAsset,
    mapCenterLat,
    mapCenterLng,
    mapZoom,
    overlayBounds,
    overlayRotation,
    units,
    mapImages,
}: ProjectPreviewViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const imageOverlayRef = useRef<any>(null);
    const polygonsLayerRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);

    const hasMap = mapCenterLat != null && mapCenterLng != null;

    const [mode, setMode] = useState<ViewMode>(hasMap ? "mapa" : "plano");
    const [showEstados, setShowEstados] = useState(true);
    const [showImagenes, setShowImagenes] = useState(true);
    const [ready, setReady] = useState(false);

    const parsedBounds = useMemo<[[number, number], [number, number]] | null>(() => {
        if (!overlayBounds) return null;
        try {
            const b = JSON.parse(overlayBounds);
            if (Array.isArray(b) && b.length === 2) return b as [[number, number], [number, number]];
        } catch {}
        return null;
    }, [overlayBounds]);

    const hasOverlay = !!planAsset && !!parsedBounds;
    const hasUnits = units.some((u) => !!u.coordenadasMasterplan);
    const hasImages = mapImages.length > 0;

    const svgViewBox = useMemo(() => computeSvgViewBox(units as any), [units]);

    // ── Mount Leaflet only when in MAPA mode ─────────────────────────────
    useEffect(() => {
        if (mode !== "mapa" || !hasMap) {
            // Tear down if we were mounted and switched to PLANO
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                tileLayerRef.current = null;
                imageOverlayRef.current = null;
                polygonsLayerRef.current = null;
                markersLayerRef.current = null;
                setReady(false);
            }
            return;
        }
        if (!containerRef.current || mapRef.current) return;

        let cancelled = false;
        (async () => {
            if (typeof document !== "undefined" && !document.getElementById("leaflet-css")) {
                const link = document.createElement("link");
                link.id = "leaflet-css";
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }

            const L = (await import("leaflet")).default;
            if (cancelled || !containerRef.current) return;

            const map = L.map(containerRef.current, {
                center: [mapCenterLat!, mapCenterLng!],
                zoom: mapZoom ?? 17,
                zoomControl: true,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false,
                dragging: true,
                attributionControl: false,
            });
            mapRef.current = map;

            // Mapa = satellite tile layer (always on in MAPA mode)
            const satellite = L.tileLayer(
                "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
                { maxZoom: 22, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
            );
            satellite.addTo(map);
            tileLayerRef.current = satellite;

            // Plano overlay (positioned with bounds + rotation, exactly as
            // configured in the dashboard — no recalculation).
            if (hasOverlay) {
                const overlay = L.imageOverlay(planAsset!, parsedBounds!, {
                    opacity: 0.55,
                    interactive: false,
                    className: "preview-svg-overlay",
                });
                overlay.addTo(map);
                imageOverlayRef.current = overlay;

                const rotationDeg = Number.isFinite(overlayRotation as number) ? (overlayRotation as number) : 0;
                if (rotationDeg !== 0) {
                    const applyRotation = () => {
                        const img = overlay.getElement() as HTMLImageElement | undefined;
                        if (!img) return;
                        img.style.transformOrigin = "center center";
                        const current = img.style.transform || "";
                        if (!current.includes("rotate(")) {
                            img.style.transform = `${current} rotate(${rotationDeg}deg)`.trim();
                        }
                    };
                    overlay.on("load", applyRotation);
                    map.on("zoomend viewreset moveend", applyRotation);
                    setTimeout(applyRotation, 0);
                }
            }

            // Estados (colored unit polygons, controlled by toggle below)
            const polyGroup = L.layerGroup();
            polygonsLayerRef.current = polyGroup;
            if (svgViewBox && parsedBounds) {
                units.forEach((u) => {
                    let svgPath: string | undefined;
                    if (u.coordenadasMasterplan) {
                        try { svgPath = JSON.parse(u.coordenadasMasterplan).path; } catch {}
                    }
                    if (!svgPath) return;
                    const coords = svgPathToLatLng(svgPath, svgViewBox, parsedBounds, overlayRotation ?? 0);
                    if (coords.length < 3) return;
                    const color = STATUS_COLORS[u.estado] || "#94a3b8";
                    L.polygon(coords, {
                        color: "#ffffff",
                        fillColor: color,
                        fillOpacity: 0.7,
                        weight: 1.5,
                        opacity: 0.95,
                        interactive: false,
                    }).addTo(polyGroup);
                    L.polygon(coords, {
                        color,
                        fillColor: color,
                        fillOpacity: 0,
                        weight: 2.5,
                        opacity: 1,
                        interactive: false,
                    }).addTo(polyGroup);
                });
            }

            // Imágenes (photo markers)
            const markersGroup = L.layerGroup();
            markersLayerRef.current = markersGroup;
            mapImages.forEach((img) => {
                const icon = L.divIcon({
                    className: "",
                    html: `<div style="width:28px;height:28px;border-radius:50%;border:3px solid white;background:#f97316;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;">📷</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });
                L.marker([img.lat, img.lng], { icon, interactive: false }).addTo(markersGroup);
            });

            if (parsedBounds) {
                map.fitBounds(parsedBounds as any, { padding: [40, 40], maxZoom: 19 });
            }

            setReady(true);
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // ── Sync overlay toggles (only meaningful in MAPA mode) ─────────────
    useEffect(() => {
        if (mode !== "mapa" || !ready || !mapRef.current) return;
        const map = mapRef.current;

        if (polygonsLayerRef.current) {
            const visible = showEstados && hasUnits;
            const present = map.hasLayer(polygonsLayerRef.current);
            if (visible && !present) polygonsLayerRef.current.addTo(map);
            else if (!visible && present) map.removeLayer(polygonsLayerRef.current);
        }

        if (markersLayerRef.current) {
            const visible = showImagenes && hasImages;
            const present = map.hasLayer(markersLayerRef.current);
            if (visible && !present) markersLayerRef.current.addTo(map);
            else if (!visible && present) map.removeLayer(markersLayerRef.current);
        }
    }, [ready, mode, showEstados, showImagenes, hasUnits, hasImages]);

    // PLANO mode shows the masterplan SVG only (per spec: "SOLO el SVG").
    // Estados overlay is intentionally NOT rendered in Plano mode because the
    // unit coordinates use a different viewBox than the full plano SVG and
    // would render misaligned. Estados is available in Mapa mode where the
    // bounds/rotation projection guarantees alignment.

    // Always-on unmount cleanup: remove leaflet instance even if the user
    // navigates away while still in Mapa mode (avoids dangling map/listeners).
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const toggle = (set: React.Dispatch<React.SetStateAction<boolean>>) => () => set((v) => !v);

    // Mode toggle button (no-op if mode is unavailable)
    const modeButton = (target: ViewMode, label: string, Icon: any, available: boolean) => {
        const active = mode === target;
        return (
            <button
                key={target}
                type="button"
                onClick={() => available && setMode(target)}
                aria-pressed={active}
                disabled={!available}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    !available
                        ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground/50"
                        : active
                            ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                            : "border-border bg-card text-foreground hover:bg-muted"
                }`}
                title={!available ? "No disponible para este proyecto" : `Ver en modo ${label.toLowerCase()}`}
            >
                <Icon className="h-3.5 w-3.5" />
                {label}
            </button>
        );
    };

    const overlayButton = (
        keyName: string,
        label: string,
        Icon: any,
        on: boolean,
        setter: () => void,
        disabled: boolean
    ) => (
        <button
            key={keyName}
            type="button"
            onClick={() => !disabled && setter()}
            aria-pressed={on}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                disabled
                    ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground/50"
                    : on
                        ? "border-brand-500/50 bg-brand-500/10 text-brand-500"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
            title={disabled ? "No hay datos disponibles" : `Mostrar/ocultar ${label.toLowerCase()}`}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );

    return (
        <div className="overflow-hidden rounded-3xl border-2 border-slate-700/60 bg-slate-950 shadow-lg">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-900/95 px-5 py-4">
                <div>
                    <p className="text-sm font-bold text-white">Vista del proyecto</p>
                    <p className="text-xs text-slate-300">
                        Cambiá entre <strong className="text-white">Plano</strong> y{" "}
                        <strong className="text-white">Mapa</strong> y activá los overlays que necesites.
                    </p>
                </div>
                <Link
                    href={`/proyectos/${slug}/masterplan`}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-glow transition-all hover:scale-[1.02] hover:bg-brand-400"
                >
                    <Globe className="h-4 w-4" />
                    Ver masterplan interactivo
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-900/70 px-5 py-3">
                {/* Mode (mutually exclusive) */}
                <div role="group" aria-label="Modo" className="flex flex-wrap items-center gap-1.5">
                    {modeButton("plano", "Plano", Layers, !!planAsset)}
                    {modeButton("mapa", "Mapa", MapIcon, hasMap)}
                </div>

                {/* Overlays (multi-select) */}
                <div role="group" aria-label="Overlays" className="flex flex-wrap items-center gap-1.5">
                    {overlayButton(
                        "estados",
                        "Estados",
                        Square,
                        showEstados,
                        toggle(setShowEstados),
                        !hasUnits || mode !== "mapa"
                    )}
                    {overlayButton(
                        "imagenes",
                        "Imágenes",
                        ImageIcon,
                        showImagenes,
                        toggle(setShowImagenes),
                        !hasImages || mode !== "mapa"
                    )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    {STATUS_LEGEND.map(([label, color]) => (
                        <span key={label} className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Viewer */}
            <div className="relative h-[640px] w-full" style={{ background: DARK_BG }}>
                {mode === "mapa" && hasMap ? (
                    <>
                        <div ref={containerRef} className="absolute inset-0" />
                        {!ready && (
                            <div className="absolute inset-0 z-[3] flex items-center justify-center" style={{ background: DARK_BG }}>
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                                    <p className="text-sm font-bold text-slate-300">Cargando mapa…</p>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* PLANO mode: SVG only on dark bg (per spec: "SOLO el SVG"). */
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        {planAsset ? (
                            <img
                                src={planAsset}
                                alt={`Plano de ${projectName}`}
                                className="max-h-full max-w-full object-contain"
                            />
                        ) : (
                            <p className="text-sm text-slate-300">Aún no hay plano cargado para este proyecto.</p>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .preview-svg-overlay {
                    pointer-events: none;
                    filter: contrast(1.1) saturate(0.85);
                }
                .leaflet-container {
                    background: transparent !important;
                    font-family: inherit;
                }
            `}</style>
        </div>
    );
}
