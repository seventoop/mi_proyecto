/**
 * Removes <text>/<tspan> nodes and per-lot fill colors from a masterplan SVG so
 * it can be rendered as a non-competing context layer underneath colored unit
 * polygons. Without this, the SVG (which already contains lot drawings AND
 * lot numbers) visually duplicates the polygons, producing the "two layouts
 * stacked" effect users complain about.
 *
 * Pure string-based: works in both browser and node, requires no DOM.
 */
export function stripSvgLabels(svgString: string | null | undefined): string | null {
    if (!svgString || typeof svgString !== "string") return svgString ?? null;
    if (!svgString.includes("<svg")) return svgString;

    let out = svgString;

    // 1) Remove all <text>...</text> blocks (including multi-line content).
    out = out.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, "");

    // 2) Remove <tspan>...</tspan> as a safety net (some exporters keep them
    //    outside <text>, though uncommon).
    out = out.replace(/<tspan\b[^>]*>[\s\S]*?<\/tspan>/gi, "");

    // 3) Remove self-closing <text .../> if any.
    out = out.replace(/<text\b[^>]*\/>/gi, "");

    // 4) Neutralize fill colors so the SVG reads as faint structural lines, not
    //    colored shapes that could compete with the dynamic lot polygons.
    //    We only touch path/polygon/rect fills; we leave stroke alone so streets
    //    and outlines stay visible.
    //    Trade-off: this can also blank legitimate context fills (plazas etc.).
    //    For SevenToop datasets the visible result is preferable to duplicated
    //    colored lots; if a project needs filled context shapes in the SVG we
    //    should switch to a class/layer-aware sanitizer.
    const SHAPE_TAGS = "path|polygon|polyline|rect|circle|ellipse";
    // double-quoted fill="..."
    out = out.replace(
        new RegExp(`(<(?:${SHAPE_TAGS})\\b[^>]*?)\\sfill="[^"]*"`, "gi"),
        '$1 fill="none"'
    );
    // single-quoted fill='...'
    out = out.replace(
        new RegExp(`(<(?:${SHAPE_TAGS})\\b[^>]*?)\\sfill='[^']*'`, "gi"),
        '$1 fill="none"'
    );
    // inline style fill in style="...fill: red; ..."
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
