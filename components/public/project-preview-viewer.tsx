"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, Map as MapIcon, Layers } from "lucide-react";

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
    /** Masterplan SVG (text removed). Used as background image in Plano mode
     *  and as a faint georeferenced image overlay in Mapa mode. */
    planAsset: string | null;
    /** Same SVG with fills neutralized — used as the Mapa overlay so it doesn't
     *  fight visually with the satellite. Falls back to planAsset. */
    mapOverlayAsset?: string | null;
    /** Kept for API compatibility (used by /masterplan). Not used here. */
    planSvgViewBox?: { x: number; y: number; w: number; h: number } | null;
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
 * Visor PÚBLICO simplificado del proyecto.
 *
 *   PLANO  → solo el SVG del masterplan, encuadrado y limpio.
 *   MAPA   → satélite con el plano superpuesto en su posición real (faint).
 *
 * Toda la interacción avanzada (hover/click/estados por lote, IDs, detalle,
 * filtros) vive en `/proyectos/[slug]/masterplan`. Esta vista es solo
 * comercial: el visitante entiende dónde queda y cómo se ve el proyecto.
 */
export default function ProjectPreviewViewer({
    slug,
    projectName,
    planAsset,
    mapOverlayAsset,
    mapCenterLat,
    mapCenterLng,
    mapZoom,
    overlayBounds,
    overlayRotation,
}: ProjectPreviewViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    const hasMap = mapCenterLat != null && mapCenterLng != null;

    const [mode, setMode] = useState<ViewMode>(hasMap ? "mapa" : "plano");
    const [ready, setReady] = useState(false);

    // ?mode= después de mount (evita hydration mismatch).
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

    const hasOverlay = !!planAsset && !!parsedBounds;

    // Montar Leaflet sólo cuando estamos en Mapa.
    useEffect(() => {
        if (mode !== "mapa" || !hasMap) {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
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

            L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
                maxZoom: 22,
                subdomains: ["mt0", "mt1", "mt2", "mt3"],
            }).addTo(map);

            // Plano georreferenciado, faint, sólo como contexto. Sin polígonos
            // de estados, sin marcadores: lo indispensable.
            if (hasOverlay) {
                const overlaySrc = mapOverlayAsset || planAsset!;
                const overlay = L.imageOverlay(overlaySrc, parsedBounds!, {
                    opacity: 0.55,
                    interactive: false,
                    className: "preview-svg-overlay",
                });
                overlay.addTo(map);

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

                map.fitBounds(parsedBounds as any, { padding: [40, 40], maxZoom: 19 });
            }

            setReady(true);
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

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

    return (
        <div className="overflow-hidden rounded-3xl border-2 border-slate-700/60 bg-slate-950 shadow-lg">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-900/95 px-5 py-4">
                <div>
                    <p className="text-sm font-bold text-white">Vista del proyecto</p>
                    <p className="text-xs text-slate-300">
                        Cambiá entre <strong className="text-white">Plano</strong> y{" "}
                        <strong className="text-white">Mapa</strong>. Para ver lotes, estados y detalle, abrí el masterplan interactivo.
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

            {/* Toolbar (solo selector de modo) */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-700/60 bg-slate-900/70 px-5 py-3">
                <div role="group" aria-label="Modo" className="flex flex-wrap items-center gap-1.5">
                    {modeButton("plano", "Plano", Layers, !!planAsset)}
                    {modeButton("mapa", "Mapa", MapIcon, hasMap)}
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
                    /* PLANO: sólo el SVG, encuadrado. Sin overlays, sin polígonos. */
                    <div className="absolute inset-0 p-6">
                        {planAsset ? (
                            <div
                                className="h-full w-full"
                                style={{
                                    backgroundImage: `url("${planAsset}")`,
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "center",
                                    backgroundSize: "contain",
                                }}
                                aria-label={`Plano de ${projectName}`}
                                role="img"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-sm text-slate-300">Aún no hay plano cargado para este proyecto.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .preview-svg-overlay {
                    pointer-events: none;
                    filter: contrast(1.05) saturate(0.8);
                }
                .leaflet-container {
                    background: transparent !important;
                    font-family: inherit;
                }
            `}</style>
        </div>
    );
}
