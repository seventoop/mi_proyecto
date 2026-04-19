"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    Globe,
    Image as ImageIcon,
    Map as MapIcon,
    Square,
    Layers,
    Wrench,
} from "lucide-react";
import { computeSvgViewBox, svgPathToLatLng } from "@/lib/geo-projection";
import { getInfraCategoryColor, type InfraestructuraCategoria } from "@/types/infraestructura";

// Same color values used in the dashboard reference (captura).
const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#22c55e", // verde
    RESERVADA: "#f59e0b",  // amarillo
    VENDIDA: "#ef4444",    // rojo
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

export interface PreviewInfraItem {
    id: string;
    nombre: string;
    categoria: string;
    tipo: string;
    estado: string;
    geometriaTipo: string;          // "poligono" | "linea" | "punto"
    coordenadas: Array<[number, number]>; // [lat, lng][]
    colorPersonalizado: string | null;
}

export interface ProjectPreviewViewerProps {
    slug: string;
    projectName: string;
    /** SVG con sus fills nativos (Plano). Data URL para uso como background-image (fallback raster). */
    planAsset: string | null;
    /** SVG crudo (markup) para render inline en Plano. Si está presente, prevalece sobre planAsset. */
    planSvgRaw?: string | null;
    /** SVG con fills neutralizados (no se usa en Mapa para evitar la "alfombra"). */
    mapOverlayAsset?: string | null;
    /** viewBox real del SVG, para proyectar polígonos en Mapa. */
    planSvgViewBox?: { x: number; y: number; w: number; h: number } | null;
    mapCenterLat: number | null;
    mapCenterLng: number | null;
    mapZoom: number | null;
    overlayBounds: string | null;
    overlayRotation: number | null;
    units: PreviewUnit[];
    mapImages: PreviewMapImage[];
    infrastructures?: PreviewInfraItem[];
}

type ViewMode = "plano" | "mapa";

/**
 * Visor PÚBLICO del proyecto.
 *
 *   PLANO  → solo el SVG del masterplan (que ya viene con sus fills coloreados
 *            desde el dashboard, mismo estilo que la referencia visual).
 *   MAPA   → satélite con polígonos coloreados por estado encima
 *            (estilo captura de referencia), opcional infraestructura y fotos.
 *            En Mapa NO se monta el SVG, así no compite con los polígonos
 *            (eso era el origen de la "alfombra" anterior).
 *
 * La interacción avanzada (hover/click/detalle por lote, IDs) vive en
 * `/proyectos/[slug]/masterplan`.
 */
export default function ProjectPreviewViewer({
    slug,
    projectName,
    planAsset,
    planSvgRaw,
    planSvgViewBox,
    mapCenterLat,
    mapCenterLng,
    mapZoom,
    overlayBounds,
    overlayRotation,
    units,
    mapImages,
    infrastructures = [],
}: ProjectPreviewViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const estadosLayerRef = useRef<any>(null);
    const infraLayerRef = useRef<any>(null);
    const imagesLayerRef = useRef<any>(null);

    const hasMap = mapCenterLat != null && mapCenterLng != null;
    const hasUnits = units.some((u) => !!u.coordenadasMasterplan);
    const hasInfra = infrastructures.some((i) => Array.isArray(i.coordenadas) && i.coordenadas.length > 0);
    const hasImages = mapImages.length > 0;

    const [mode, setMode] = useState<ViewMode>(hasMap ? "mapa" : "plano");
    const [showEstados, setShowEstados] = useState(true);
    // Infra arranca OFF: muchos proyectos tienen polígonos de "areas_verdes"
    // (plaza/parque) en verde #22c55e — el MISMO verde de DISPONIBLE — que en
    // el mapa parecen "bloques verdes enormes" superpuestos a los lotes.
    // El usuario la prende sólo si quiere verla.
    const [showInfra, setShowInfra] = useState(false);
    const [showImagenes, setShowImagenes] = useState(true);
    const [ready, setReady] = useState(false);

    // ?mode= después del mount (evita hydration mismatch).
    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get("mode");
        if (q === "plano" && planAsset) setMode("plano");
        else if (q === "mapa" && hasMap) setMode("mapa");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const parsedBounds = useMemo<[[number, number], [number, number]] | null>(() => {
        if (!overlayBounds) return null;
        try {
            const b = JSON.parse(overlayBounds);
            if (Array.isArray(b) && b.length === 2) return b as [[number, number], [number, number]];
        } catch {}
        return null;
    }, [overlayBounds]);

    // Single source of truth para alinear los polígonos con el satélite:
    // viewBox real del SVG (fallback al bounding box derivado de las unidades).
    const svgViewBox = useMemo(() => {
        if (planSvgViewBox) return { x: planSvgViewBox.x, y: planSvgViewBox.y, w: planSvgViewBox.w, h: planSvgViewBox.h };
        return computeSvgViewBox(units as any);
    }, [planSvgViewBox, units]);

    // ── Montar Leaflet sólo en Mapa ───────────────────────────────────────
    useEffect(() => {
        if (mode !== "mapa" || !hasMap) {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                estadosLayerRef.current = null;
                infraLayerRef.current = null;
                imagesLayerRef.current = null;
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

            // Base: satélite Google.
            L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
                maxZoom: 22,
                subdomains: ["mt0", "mt1", "mt2", "mt3"],
            }).addTo(map);

            // ── ESTADOS: polígonos coloreados estilo dashboard ──────────────
            // Sólo polígonos, sin SVG debajo, para evitar que el verde nativo
            // del SVG se sume al verde de Disponible y genere la "alfombra".
            const estadosGroup = L.layerGroup();
            estadosLayerRef.current = estadosGroup;
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
                        weight: 1.5,
                        opacity: 1,
                        fillColor: color,
                        fillOpacity: 0.65,
                        interactive: false,
                    }).addTo(estadosGroup);
                });
            }

            // ── INFRAESTRUCTURA: polígonos / líneas / puntos georreferenciados ─
            const infraGroup = L.layerGroup();
            infraLayerRef.current = infraGroup;
            infrastructures.forEach((it) => {
                const coords = it.coordenadas;
                if (!Array.isArray(coords) || coords.length === 0) return;
                const color =
                    it.colorPersonalizado ||
                    getInfraCategoryColor(it.categoria as InfraestructuraCategoria, it.tipo);
                if (it.geometriaTipo === "poligono" && coords.length >= 3) {
                    L.polygon(coords as any, {
                        color: "#ffffff",
                        weight: 1.25,
                        opacity: 0.9,
                        fillColor: color,
                        fillOpacity: 0.55,
                        interactive: false,
                    }).addTo(infraGroup);
                } else if (it.geometriaTipo === "linea" && coords.length >= 2) {
                    L.polyline(coords as any, {
                        color,
                        weight: 4,
                        opacity: 0.9,
                        interactive: false,
                    }).addTo(infraGroup);
                } else if (it.geometriaTipo === "punto" && coords.length >= 1) {
                    const [lat, lng] = coords[0];
                    L.circleMarker([lat, lng], {
                        radius: 6,
                        color: "#ffffff",
                        weight: 2,
                        fillColor: color,
                        fillOpacity: 0.95,
                        interactive: false,
                    }).addTo(infraGroup);
                }
            });

            // ── IMÁGENES: marcadores ────────────────────────────────────────
            const imagesGroup = L.layerGroup();
            imagesLayerRef.current = imagesGroup;
            mapImages.forEach((img) => {
                const icon = L.divIcon({
                    className: "",
                    html: `<div style="width:28px;height:28px;border-radius:50%;border:3px solid white;background:#f97316;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;">📷</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });
                L.marker([img.lat, img.lng], { icon, interactive: false }).addTo(imagesGroup);
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

    // Sync de toggles (Mapa).
    useEffect(() => {
        if (mode !== "mapa" || !ready || !mapRef.current) return;
        const map = mapRef.current;

        const sync = (layer: any, visible: boolean) => {
            if (!layer) return;
            const present = map.hasLayer(layer);
            if (visible && !present) layer.addTo(map);
            else if (!visible && present) map.removeLayer(layer);
        };

        sync(estadosLayerRef.current, showEstados && hasUnits);
        sync(infraLayerRef.current, showInfra && hasInfra);
        sync(imagesLayerRef.current, showImagenes && hasImages);
    }, [ready, mode, showEstados, showInfra, showImagenes, hasUnits, hasInfra, hasImages]);

    // Cleanup al desmontar.
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

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

    // Switch ON/OFF estilo iOS — claro y reconocible.
    const overlayButton = (
        keyName: string,
        label: string,
        Icon: any,
        on: boolean,
        setter: () => void,
        disabled: boolean
    ) => (
        <label
            key={keyName}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                disabled
                    ? "cursor-not-allowed border-slate-700/60 bg-slate-800/40 text-slate-500"
                    : "cursor-pointer border-slate-700/60 bg-slate-800/60 text-slate-100 hover:border-brand-500/60"
            }`}
            title={disabled ? "No hay datos disponibles" : `Mostrar/ocultar ${label.toLowerCase()}`}
        >
            <Icon className={`h-3.5 w-3.5 ${disabled ? "opacity-50" : on ? "text-brand-400" : "text-slate-400"}`} />
            <span className="select-none">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={disabled}
                onClick={() => !disabled && setter()}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    disabled ? "bg-slate-700/40" : on ? "bg-brand-500" : "bg-slate-600"
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        on ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                />
            </button>
        </label>
    );

    const toggle = (set: React.Dispatch<React.SetStateAction<boolean>>) => () => set((v) => !v);

    return (
        <div className="overflow-hidden rounded-3xl border-2 border-slate-700/60 bg-slate-950 shadow-lg">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-900/95 px-5 py-4">
                <div>
                    <p className="text-sm font-bold text-white">Vista del proyecto</p>
                    <p className="text-xs text-slate-300">
                        Cambiá entre <strong className="text-white">Plano</strong> y{" "}
                        <strong className="text-white">Mapa</strong>. Para ver detalle por lote, abrí el masterplan interactivo.
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
                <div role="group" aria-label="Modo" className="flex flex-wrap items-center gap-1.5">
                    {modeButton("plano", "Plano", Layers, !!planAsset)}
                    {modeButton("mapa", "Mapa", MapIcon, hasMap)}
                </div>

                {/* Capas (sólo aplican en Mapa) */}
                <div role="group" aria-label="Capas" className="flex flex-wrap items-center gap-1.5">
                    {overlayButton(
                        "estados",
                        "Estados",
                        Square,
                        showEstados,
                        toggle(setShowEstados),
                        !hasUnits
                    )}
                    {overlayButton(
                        "infra",
                        "Infraestructura",
                        Wrench,
                        showInfra,
                        toggle(setShowInfra),
                        mode !== "mapa" || !hasInfra
                    )}
                    {overlayButton(
                        "imagenes",
                        "Imágenes",
                        ImageIcon,
                        showImagenes,
                        toggle(setShowImagenes),
                        mode !== "mapa" || !hasImages
                    )}
                </div>

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
                    /* PLANO: SVG del dashboard como fondo + (si Estados está
                       activo y hay viewBox real) polígonos coloreados encima
                       alineados al MISMO viewBox del SVG. */
                    <div className="absolute inset-0 p-6">
                        {planSvgRaw ? (
                            <div
                                className="relative h-full w-full"
                                aria-label={`Plano de ${projectName}`}
                                role="img"
                            >
                                {/* SVG inline: respeta su propio viewBox, escala al contenedor
                                    y evita los problemas de decodificación que tiene
                                    background-image:url(data:image/svg+xml,...) con SVGs grandes.
                                    Forzamos width/height al 100% inyectándolos en el tag <svg>
                                    porque algunos planos generados desde DXF no traen esos atributos
                                    (sólo viewBox), y sin ellos el navegador renderiza a 300x150. */}
                                <div
                                    className="absolute inset-0 overflow-hidden [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                                    // The SVG comes from our own DB (uploaded by the project owner in the
                                    // dashboard) and is already label-stripped on the server.
                                    dangerouslySetInnerHTML={{
                                        __html: planSvgRaw.replace(
                                            /<svg\b([^>]*)>/i,
                                            (_m, attrs) => {
                                                let a = attrs as string;
                                                if (!/\swidth\s*=/.test(a)) a += ' width="100%"';
                                                if (!/\sheight\s*=/.test(a)) a += ' height="100%"';
                                                if (!/preserveAspectRatio\s*=/.test(a)) a += ' preserveAspectRatio="xMidYMid meet"';
                                                return `<svg${a}>`;
                                            },
                                        ),
                                    }}
                                />
                                {showEstados && planSvgViewBox && hasUnits && (
                                    <svg
                                        viewBox={`${planSvgViewBox.x} ${planSvgViewBox.y} ${planSvgViewBox.w} ${planSvgViewBox.h}`}
                                        preserveAspectRatio="xMidYMid meet"
                                        className="pointer-events-none absolute inset-0 h-full w-full"
                                    >
                                        {units.map((u) => {
                                            if (!u.coordenadasMasterplan) return null;
                                            let path: string | undefined;
                                            try { path = JSON.parse(u.coordenadasMasterplan).path; } catch {}
                                            if (!path) return null;
                                            const color = STATUS_COLORS[u.estado] || "#94a3b8";
                                            return (
                                                <path
                                                    key={u.id}
                                                    d={path}
                                                    fill={color}
                                                    fillOpacity={0.65}
                                                    stroke="#ffffff"
                                                    strokeWidth={1}
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            );
                                        })}
                                    </svg>
                                )}
                            </div>
                        ) : planAsset ? (
                            <div
                                className="relative h-full w-full"
                                style={{
                                    backgroundImage: `url("${planAsset}")`,
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "center",
                                    backgroundSize: "contain",
                                }}
                                aria-label={`Plano de ${projectName}`}
                                role="img"
                            >
                                {showEstados && planSvgViewBox && hasUnits && (
                                    <svg
                                        viewBox={`${planSvgViewBox.x} ${planSvgViewBox.y} ${planSvgViewBox.w} ${planSvgViewBox.h}`}
                                        preserveAspectRatio="xMidYMid meet"
                                        className="pointer-events-none absolute inset-0 h-full w-full"
                                    >
                                        {units.map((u) => {
                                            if (!u.coordenadasMasterplan) return null;
                                            let path: string | undefined;
                                            try { path = JSON.parse(u.coordenadasMasterplan).path; } catch {}
                                            if (!path) return null;
                                            const color = STATUS_COLORS[u.estado] || "#94a3b8";
                                            return (
                                                <path
                                                    key={u.id}
                                                    d={path}
                                                    fill={color}
                                                    fillOpacity={0.65}
                                                    stroke="#ffffff"
                                                    strokeWidth={1}
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            );
                                        })}
                                    </svg>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-slate-300">Aún no hay plano cargado para este proyecto.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .leaflet-container {
                    background: transparent !important;
                    font-family: inherit;
                }
            `}</style>
        </div>
    );
}
