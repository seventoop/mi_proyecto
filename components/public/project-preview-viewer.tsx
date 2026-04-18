"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, Image as ImageIcon, Layers, Map as MapIcon, Square } from "lucide-react";
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
    planAsset: string | null;
    mapCenterLat: number | null;
    mapCenterLng: number | null;
    mapZoom: number | null;
    overlayBounds: string | null;
    overlayRotation: number | null;
    units: PreviewUnit[];
    mapImages: PreviewMapImage[];
}

type LayerKey = "mapa" | "plano" | "infraestructura" | "imagenes";

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
    const grayBgRef = useRef<HTMLDivElement>(null);

    const [ready, setReady] = useState(false);
    const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
        mapa: true,
        plano: true,
        infraestructura: true,
        imagenes: true,
    });

    const hasMap = mapCenterLat != null && mapCenterLng != null;
    const hasOverlay = !!planAsset && !!overlayBounds;

    // Parse overlayBounds JSON
    const parsedBounds = useMemo<[[number, number], [number, number]] | null>(() => {
        if (!overlayBounds) return null;
        try {
            const b = JSON.parse(overlayBounds);
            if (Array.isArray(b) && b.length === 2) return b as [[number, number], [number, number]];
        } catch {}
        return null;
    }, [overlayBounds]);

    const svgViewBox = useMemo(() => computeSvgViewBox(units as any), [units]);

    // ── Mount Leaflet map ────────────────────────────────────────────────
    useEffect(() => {
        if (!hasMap || !containerRef.current || mapRef.current) return;

        let cancelled = false;
        (async () => {
            // Inject Leaflet CSS once
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

            const satellite = L.tileLayer(
                "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
                { maxZoom: 22, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
            );
            satellite.addTo(map);
            tileLayerRef.current = satellite;

            // Image overlay (the masterplan SVG drawing)
            if (hasOverlay && parsedBounds) {
                const overlay = L.imageOverlay(planAsset!, parsedBounds, {
                    opacity: 0.78,
                    interactive: false,
                    className: "preview-svg-overlay",
                });
                overlay.addTo(map);
                imageOverlayRef.current = overlay;

                // Persist rotation across Leaflet view updates (zoom/pan rewrites the
                // image's inline `transform` to reposition it, which would otherwise
                // wipe a one-off rotation). We reapply it after every reset.
                const rotationDeg = Number.isFinite(overlayRotation as number) ? (overlayRotation as number) : 0;
                if (rotationDeg !== 0) {
                    const applyRotation = () => {
                        const img = overlay.getElement() as HTMLImageElement | undefined;
                        if (!img) return;
                        img.style.transformOrigin = "center center";
                        // Append rotation to whatever transform Leaflet just set
                        const current = img.style.transform || "";
                        if (!current.includes("rotate(")) {
                            img.style.transform = `${current} rotate(${rotationDeg}deg)`.trim();
                        }
                    };
                    overlay.on("load", applyRotation);
                    map.on("zoomend viewreset moveend", applyRotation);
                    // Initial pass in case the image is already in the DOM
                    setTimeout(applyRotation, 0);
                }
            }

            // Unit polygons
            const polyGroup = L.layerGroup();
            polygonsLayerRef.current = polyGroup;
            if (svgViewBox && parsedBounds) {
                let drawnAny = false;
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
                        color,
                        fillColor: color,
                        fillOpacity: 0.45,
                        weight: 1,
                        interactive: false,
                    }).addTo(polyGroup);
                    drawnAny = true;
                });
                if (drawnAny) polyGroup.addTo(map);
            }

            // Image markers
            const markersGroup = L.layerGroup();
            markersLayerRef.current = markersGroup;
            mapImages.forEach((img) => {
                const icon = L.divIcon({
                    className: "",
                    html: `<div style="width:28px;height:28px;border-radius:50%;border:3px solid white;background:#f97316;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;">📷</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });
                const marker = L.marker([img.lat, img.lng], { icon, interactive: false });
                marker.addTo(markersGroup);
            });
            if (mapImages.length > 0) markersGroup.addTo(map);

            // Auto-fit to content
            if (parsedBounds) {
                map.fitBounds(parsedBounds as any, { padding: [40, 40], maxZoom: 19 });
            }

            setReady(true);
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Layer toggles ────────────────────────────────────────────────────
    useEffect(() => {
        if (!ready || !mapRef.current) return;
        const map = mapRef.current;

        // Mapa (satellite tiles)
        if (tileLayerRef.current) {
            if (layers.mapa) {
                if (!map.hasLayer(tileLayerRef.current)) tileLayerRef.current.addTo(map);
            } else if (map.hasLayer(tileLayerRef.current)) {
                map.removeLayer(tileLayerRef.current);
            }
        }

        // Infraestructura (the SVG image overlay = streets/plazas drawing)
        if (imageOverlayRef.current) {
            if (layers.infraestructura) {
                if (!map.hasLayer(imageOverlayRef.current)) imageOverlayRef.current.addTo(map);
            } else if (map.hasLayer(imageOverlayRef.current)) {
                map.removeLayer(imageOverlayRef.current);
            }
        }

        // Plano (lot polygons colored by state)
        if (polygonsLayerRef.current) {
            if (layers.plano) {
                if (!map.hasLayer(polygonsLayerRef.current)) polygonsLayerRef.current.addTo(map);
            } else if (map.hasLayer(polygonsLayerRef.current)) {
                map.removeLayer(polygonsLayerRef.current);
            }
        }

        // Imágenes (photo markers)
        if (markersLayerRef.current) {
            if (layers.imagenes) {
                if (!map.hasLayer(markersLayerRef.current)) markersLayerRef.current.addTo(map);
            } else if (map.hasLayer(markersLayerRef.current)) {
                map.removeLayer(markersLayerRef.current);
            }
        }

        // Gray neutral background visible when satellite is off
        if (grayBgRef.current) {
            grayBgRef.current.style.opacity = layers.mapa ? "0" : "1";
        }
    }, [ready, layers]);

    // ── Fallback: no map coordinates → render plano only ─────────────────
    if (!hasMap) {
        return (
            <div className="overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-lg">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
                    <div>
                        <p className="text-sm font-bold text-foreground">Vista del proyecto</p>
                        <p className="text-xs text-muted-foreground">Sin coordenadas de mapa cargadas — mostrando plano</p>
                    </div>
                    <Link
                        href={`/proyectos/${slug}/masterplan`}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-brand-400"
                    >
                        <Globe className="h-4 w-4" />
                        Ver masterplan interactivo
                    </Link>
                </div>
                <div className="flex h-[600px] items-center justify-center bg-white p-4">
                    {planAsset ? (
                        <img src={planAsset} alt={`Plano de ${projectName}`} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <p className="text-sm text-muted-foreground">Aún no hay plano cargado.</p>
                    )}
                </div>
            </div>
        );
    }

    const toggle = (k: LayerKey) => setLayers((s) => ({ ...s, [k]: !s[k] }));

    const layerControls: Array<{ key: LayerKey; label: string; icon: any; disabled?: boolean; title: string }> = [
        { key: "mapa", label: "Mapa", icon: MapIcon, title: "Mapa satelital de fondo" },
        { key: "infraestructura", label: "Plano", icon: Layers, disabled: !hasOverlay, title: "Plano del masterplan (calles, plazas e infraestructura)" },
        { key: "plano", label: "Lotes", icon: Square, disabled: units.length === 0 || !parsedBounds, title: "Lotes coloreados por estado" },
        { key: "imagenes", label: "Imágenes", icon: ImageIcon, disabled: mapImages.length === 0, title: "Marcadores de fotos vinculadas" },
    ];

    return (
        <div className="overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-lg">
            {/* Header con CTA principal */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
                <div>
                    <p className="text-sm font-bold text-foreground">Vista preview del proyecto</p>
                    <p className="text-xs text-muted-foreground">Mapa real, plano implantado y lotes coloreados por estado.</p>
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

            {/* Toolbar de capas + leyenda */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-5 py-3">
                <div role="group" aria-label="Capas del visor" className="flex flex-wrap items-center gap-1.5">
                    {layerControls.map(({ key, label, icon: Icon, disabled }) => {
                        const active = layers[key] && !disabled;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => !disabled && toggle(key)}
                                aria-pressed={active}
                                disabled={disabled}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                    disabled
                                        ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground/50"
                                        : active
                                            ? "border-brand-500/40 bg-brand-500/10 text-brand-500"
                                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                                }`}
                                title={disabled ? "No hay datos disponibles para esta capa" : `Mostrar/ocultar ${label.toLowerCase()}`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {STATUS_LEGEND.map(([label, color]) => (
                        <span key={label} className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Visor */}
            <div className="relative h-[640px] w-full bg-slate-100">
                <div
                    ref={grayBgRef}
                    className="pointer-events-none absolute inset-0 z-[1] bg-slate-200 transition-opacity duration-200"
                    style={{ opacity: 0 }}
                    aria-hidden
                />
                <div ref={containerRef} className="absolute inset-0 z-[2]" />
                {!ready && (
                    <div className="absolute inset-0 z-[3] flex items-center justify-center bg-slate-100">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                            <p className="text-sm font-bold text-slate-500">Cargando vista del proyecto…</p>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .preview-svg-overlay {
                    pointer-events: none;
                    mix-blend-mode: multiply;
                }
                .leaflet-container {
                    background: transparent !important;
                    font-family: inherit;
                }
            `}</style>
        </div>
    );
}
