/**
 * Sanitizes a masterplan SVG before rendering it on the public site.
 *
 * Two modes are supported:
 *
 *  - `stripSvgLabels(svg)` (default) → removes ONLY text/tspan labels. Lot
 *    polygons and their native fills are preserved. Use this when the SVG is
 *    meant to be the primary visual (Plano mode), so the user sees the full
 *    plan exactly as it does in the dashboard, just without the lot numbers.
 *
 *  - `stripSvgLabels(svg, { neutralizeFills: true })` → also replaces every
 *    shape `fill="..."` with `fill="none"` (and clears inline `style: fill`).
 *    Use this when the SVG is rendered as a low-opacity overlay UNDER another
 *    visual layer (Mapa mode + Estados polygons). Without neutralizing fills,
 *    the SVG's own colored lots would bleed through and visually duplicate the
 *    dynamic state polygons.
 *
 * Pure string-based: works in both browser and node, requires no DOM.
 */
export interface StripOptions {
    neutralizeFills?: boolean;
}

/**
 * Extracts the `viewBox="x y w h"` attribute from a raw SVG string.
 * Falls back to width/height if viewBox is missing. Returns null when neither
 * is parseable.
 */
export function extractSvgViewBox(
    svgString: string | null | undefined
): { x: number; y: number; w: number; h: number } | null {
    if (!svgString || typeof svgString !== "string") return null;
    const vb = svgString.match(/<svg\b[^>]*\sviewBox\s*=\s*["']([^"']+)["']/i);
    if (vb) {
        const parts = vb[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
            return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
        }
    }
    const w = svgString.match(/<svg\b[^>]*\swidth\s*=\s*["']([\d.]+)/i);
    const h = svgString.match(/<svg\b[^>]*\sheight\s*=\s*["']([\d.]+)/i);
    if (w && h) {
        const W = Number(w[1]);
        const H = Number(h[1]);
        if (Number.isFinite(W) && Number.isFinite(H)) return { x: 0, y: 0, w: W, h: H };
    }
    return null;
}

export function stripSvgLabels(
    svgString: string | null | undefined,
    options: StripOptions = {}
): string | null {
    if (!svgString || typeof svgString !== "string") return svgString ?? null;
    if (!svgString.includes("<svg")) return svgString;

    let out = svgString;

    // 1) Remove all <text>...</text> blocks (including multi-line content).
    out = out.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, "");
    // 2) Remove <tspan>...</tspan> as a safety net.
    out = out.replace(/<tspan\b[^>]*>[\s\S]*?<\/tspan>/gi, "");
    // 3) Remove self-closing <text .../>.
    out = out.replace(/<text\b[^>]*\/>/gi, "");

    if (!options.neutralizeFills) return out;

    // Neutralize fills on shape elements so the SVG reads as faint structural
    // lines, never as colored shapes that compete with dynamic overlays.
    const SHAPE_TAGS = "path|polygon|polyline|rect|circle|ellipse";

    out = out.replace(
        new RegExp(`(<(?:${SHAPE_TAGS})\\b[^>]*?)\\sfill="[^"]*"`, "gi"),
        '$1 fill="none"'
    );
    out = out.replace(
        new RegExp(`(<(?:${SHAPE_TAGS})\\b[^>]*?)\\sfill='[^']*'`, "gi"),
        '$1 fill="none"'
    );
    out = out.replace(
        new RegExp(`(<(?:${SHAPE_TAGS})\\b[^>]*?\\sstyle=")([^"]*)(")`, "gi"),
        (_m, pre, css, post) => `${pre}${css.replace(/(^|;)\s*fill\s*:[^;]*/gi, "$1fill:none")}${post}`
    );
    out = out.replace(
        new RegExp(`(<(?:${SHAPE_TAGS})\\b[^>]*?\\sstyle=')([^']*)(')`, "gi"),
        (_m, pre, css, post) => `${pre}${css.replace(/(^|;)\s*fill\s*:[^;]*/gi, "$1fill:none")}${post}`
    );

    return out;
}
