export type BlueprintSourceKind = "svg" | "dxf" | "dwg" | "pdf" | "image" | "unknown";
export type BlueprintProcessingMode = "detected-lots" | "visual-only" | "source-only";

export interface BlueprintEmbeddedMeta {
    sourceKind: BlueprintSourceKind;
    sourceName?: string;
    sourceMime?: string;
    sourceUrl?: string;
    processingMode: BlueprintProcessingMode;
    warnings?: string[];
    detectedPaths?: number;
    detectedLots?: number;
    savedAt?: string;
}

const BLUEPRINT_META_MARKER = "SEVENTOOP_BLUEPRINT_META:";

export interface BlueprintDetectionAssessment {
    mode: "detected-lots" | "source-only";
    usablePaths: ExtractedPath[];
    warnings: string[];
    syntheticLabelsApplied: boolean;
    metrics: {
        totalPaths: number;
        closedPaths: number;
        plausiblePolygons: number;
        labeledPolygons: number;
        usableRatio: number;
        width: number;
        height: number;
    };
}

export interface ExtractedPath {
    id: string;
    /** Sequential 1-based ID assigned by spatial reading order (top-left → right → down) */
    internalId?: number;
    pathData: string;
    center: { x: number; y: number };
    lotNumber?: string;   // matched from MTEXT/TEXT label
    areaSqm?: number;     // Shoelace formula — in drawing units²
}

// ─── Shoelace formula: polygon area in drawing units² ────────────────────────
function shoelaceArea(vertices: { x: number; y: number }[]): number {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area) / 2;
}

// ─── Strip RTF-like MTEXT formatting codes ───────────────────────────────────
function cleanMText(raw: string): string {
    return raw
        .replace(/\{\\[^;]*;/g, '')   // {\fFont; or {\pXXX;
        .replace(/\{/g, '')
        .replace(/\}/g, '')
        .replace(/\\P/gi, ' ')         // paragraph break
        .replace(/\\~/g, ' ')          // non-breaking space
        .replace(/\\\\/g, '')
        .trim();
}

export function detectBlueprintSourceKind(file: { name?: string; type?: string }): BlueprintSourceKind {
    const name = (file.name ?? "").toLowerCase();
    const type = (file.type ?? "").toLowerCase();

    if (name.endsWith(".svg") || type.includes("svg")) return "svg";
    if (name.endsWith(".dxf") || type.includes("dxf")) return "dxf";
    if (name.endsWith(".dwg") || type.includes("dwg") || type.includes("acad") || type.includes("autocad")) {
        return "dwg";
    }
    if (name.endsWith(".pdf") || type.includes("pdf")) return "pdf";
    if (
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".webp") ||
        type.startsWith("image/")
    ) {
        return "image";
    }

    return "unknown";
}

export function sanitizeBlueprintSVG(svgString: string): string {
    if (typeof window === "undefined") {
        return svgString;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svg = doc.documentElement;

    if (!svg || svg.tagName.toLowerCase() !== "svg") {
        throw new Error("El archivo SVG no tiene una estructura valida");
    }

    svg.querySelectorAll("script, foreignObject, iframe, object, embed").forEach((node) => node.remove());
    svg.querySelectorAll("*").forEach((node) => {
        Array.from(node.attributes).forEach((attr) => {
            const attrName = attr.name.toLowerCase();
            const attrValue = attr.value.trim().toLowerCase();
            if (attrName.startsWith("on")) {
                node.removeAttribute(attr.name);
            }
            if ((attrName === "href" || attrName === "xlink:href") && attrValue.startsWith("javascript:")) {
                node.removeAttribute(attr.name);
            }
        });
    });

    return new XMLSerializer().serializeToString(svg);
}

export function withBlueprintMeta(svgString: string, meta: BlueprintEmbeddedMeta): string {
    const cleanMeta = JSON.stringify(meta).replace(/-->/g, "--&gt;");
    const stripped = svgString.replace(/<!--SEVENTOOP_BLUEPRINT_META:[\s\S]*?-->/g, "").trim();
    return `<!--${BLUEPRINT_META_MARKER}${cleanMeta}-->\n${stripped}`;
}

export function extractBlueprintMeta(svgString: string | null | undefined): BlueprintEmbeddedMeta | null {
    if (!svgString) return null;

    const match = svgString.match(/<!--SEVENTOOP_BLUEPRINT_META:([\s\S]*?)-->/);
    if (!match?.[1]) return null;

    try {
        return JSON.parse(match[1]) as BlueprintEmbeddedMeta;
    } catch {
        return null;
    }
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function buildImageBlueprintSVG(options: {
    imageUrl: string;
    width: number;
    height: number;
    meta: BlueprintEmbeddedMeta;
}): string {
    const width = Math.max(1, Math.round(options.width));
    const height = Math.max(1, Math.round(options.height));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#0f172a" />
<image href="${escapeXml(options.imageUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />
</svg>`;

    return withBlueprintMeta(svg, options.meta);
}

export function buildFallbackBlueprintSVG(options: {
    title: string;
    subtitle: string;
    lines: string[];
    meta: BlueprintEmbeddedMeta;
}): string {
    const lines = options.lines.slice(0, 4).map((line) => escapeXml(line));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<rect width="1200" height="800" fill="#0f172a" />
<rect x="80" y="80" width="1040" height="640" rx="28" fill="#111827" stroke="#334155" stroke-width="4" />
<text x="120" y="190" fill="#f8fafc" font-size="46" font-family="Arial, sans-serif" font-weight="700">${escapeXml(options.title)}</text>
<text x="120" y="250" fill="#94a3b8" font-size="28" font-family="Arial, sans-serif">${escapeXml(options.subtitle)}</text>
${lines.map((line, index) => `<text x="120" y="${340 + index * 56}" fill="#cbd5e1" font-size="26" font-family="Arial, sans-serif">${line}</text>`).join("\n")}
<text x="120" y="660" fill="#f97316" font-size="24" font-family="Arial, sans-serif">Se guardo una base segura para continuar despues.</text>
</svg>`;

    return withBlueprintMeta(svg, options.meta);
}

function extractPathBounds(pathData: string) {
    const coords = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number) ?? [];
    if (coords.length < 4) return null;

    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i + 1 < coords.length; i += 2) {
        xs.push(coords[i]);
        ys.push(coords[i + 1]);
    }

    if (!xs.length || !ys.length) return null;

    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
    };
}

function sanitizeDetectedLotLabel(label?: string): string | null {
    if (!label) return null;

    const clean = label.trim().toUpperCase();
    if (!clean || clean.length > 10) return null;
    if (!/^[A-Z0-9\-_.\/]+$/.test(clean)) return null;
    if (/^[A-Z]$/.test(clean)) return null;
    if (/^\d{4,}$/.test(clean)) return null;

    return clean;
}

function formatDisplayedLotLabel(label?: string): string | null {
    if (!label) return null;
    const trimmed = label.trim();
    const syntheticMatch = trimmed.match(/^L(\d+)$/i);
    if (syntheticMatch) {
        return syntheticMatch[1];
    }
    return trimmed;
}

function keepDominantBlueprintCluster(paths: ExtractedPath[]) {
    if (paths.length < 8) {
        return {
            paths,
            warning: null as string | null,
        };
    }

    const entries = paths
        .map((path, index) => {
            const bounds = extractPathBounds(path.pathData);
            if (!bounds) return null;
            return {
                index,
                path,
                bounds: {
                    ...bounds,
                    width: bounds.maxX - bounds.minX,
                    height: bounds.maxY - bounds.minY,
                    cx: (bounds.minX + bounds.maxX) / 2,
                    cy: (bounds.minY + bounds.maxY) / 2,
                },
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => !!entry);

    if (entries.length < 8) {
        return {
            paths,
            warning: null as string | null,
        };
    }

    const widths = entries.map((entry) => Math.max(entry.bounds.width, 0.001)).sort((a, b) => a - b);
    const heights = entries.map((entry) => Math.max(entry.bounds.height, 0.001)).sort((a, b) => a - b);
    const medianWidth = widths[Math.floor(widths.length / 2)] ?? 1;
    const medianHeight = heights[Math.floor(heights.length / 2)] ?? 1;
    const gap = Math.max(medianWidth, medianHeight) * 2.5;

    const parent = entries.map((_, index) => index);
    const find = (index: number): number => {
        if (parent[index] === index) return index;
        parent[index] = find(parent[index]);
        return parent[index];
    };
    const union = (a: number, b: number) => {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent[rootB] = rootA;
    };
    const overlapsWithGap = (minA: number, maxA: number, minB: number, maxB: number) =>
        Math.min(maxA, maxB) - Math.max(minA, minB) >= -gap;

    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const a = entries[i].bounds;
            const b = entries[j].bounds;
            if (Math.abs(a.cx - b.cx) > (a.width + b.width) / 2 + gap) continue;
            if (Math.abs(a.cy - b.cy) > (a.height + b.height) / 2 + gap) continue;
            if (overlapsWithGap(a.minX, a.maxX, b.minX, b.maxX) && overlapsWithGap(a.minY, a.maxY, b.minY, b.maxY)) {
                union(i, j);
            }
        }
    }

    const clusters = new Map<number, typeof entries>();
    entries.forEach((entry, index) => {
        const root = find(index);
        const cluster = clusters.get(root);
        if (cluster) {
            cluster.push(entry);
        } else {
            clusters.set(root, [entry]);
        }
    });

    if (clusters.size <= 1) {
        return {
            paths,
            warning: null as string | null,
        };
    }

    const rankedClusters = Array.from(clusters.values()).sort((a, b) => b.length - a.length);
    const dominantCluster = rankedClusters[0];
    const dominantRatio = dominantCluster.length / paths.length;
    const secondClusterSize = rankedClusters[1]?.length ?? 0;
    const shouldKeepOnlyDominant =
        dominantCluster.length >= 24 &&
        dominantRatio >= 0.75 &&
        secondClusterSize <= Math.max(12, Math.floor(dominantCluster.length * 0.15));

    if (!shouldKeepOnlyDominant) {
        return {
            paths,
            warning: null as string | null,
        };
    }

    const keptIndexes = new Set(dominantCluster.map((entry) => entry.index));
    const filteredPaths = paths.filter((_, index) => keptIndexes.has(index));

    return {
        paths: filteredPaths,
        warning:
            filteredPaths.length < paths.length
                ? `Se descartaron ${paths.length - filteredPaths.length} poligonos desconectados para conservar el cuerpo principal del plano.`
                : null,
    };
}

export function assessBlueprintDetection(paths: ExtractedPath[]): BlueprintDetectionAssessment {
    const closedPaths = paths.filter((path) => {
        if (!path.pathData.includes("Z")) return false;
        if (!Number.isFinite(path.center.x) || !Number.isFinite(path.center.y)) return false;
        if (!path.areaSqm || !Number.isFinite(path.areaSqm) || path.areaSqm <= 0) return false;
        return true;
    });

    if (closedPaths.length === 0) {
        return {
            mode: "source-only",
            usablePaths: [],
            warnings: ["No se detectaron poligonos cerrados utilizables."],
            syntheticLabelsApplied: false,
            metrics: {
                totalPaths: paths.length,
                closedPaths: 0,
                plausiblePolygons: 0,
                labeledPolygons: 0,
                usableRatio: 0,
                width: 0,
                height: 0,
            },
        };
    }

    const sortedAreas = closedPaths.map((path) => path.areaSqm!).sort((a, b) => a - b);
    const medianArea = sortedAreas[Math.floor(sortedAreas.length / 2)] ?? 0;
    const plausiblePolygons = closedPaths.filter((path) => {
        const area = path.areaSqm ?? 0;
        // Very wide range: only exclude dust particles (< 1% median) and obvious full-sheet borders (> 80× median)
        return medianArea > 0 && area >= medianArea * 0.01 && area <= medianArea * 80;
    });

    const bounds = plausiblePolygons.reduce((acc, path) => {
        const pathBounds = extractPathBounds(path.pathData);
        if (!pathBounds) return acc;
        acc.minX = Math.min(acc.minX, pathBounds.minX);
        acc.minY = Math.min(acc.minY, pathBounds.minY);
        acc.maxX = Math.max(acc.maxX, pathBounds.maxX);
        acc.maxY = Math.max(acc.maxY, pathBounds.maxY);
        return acc;
    }, {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
    });

    const width = Number.isFinite(bounds.maxX - bounds.minX) ? bounds.maxX - bounds.minX : 0;
    const height = Number.isFinite(bounds.maxY - bounds.minY) ? bounds.maxY - bounds.minY : 0;
    const usableRatio = plausiblePolygons.length / Math.max(paths.length, 1);
    const warnings: string[] = [];

    const sanitized = plausiblePolygons.map((path) => ({
        ...path,
        lotNumber: sanitizeDetectedLotLabel(path.lotNumber) ?? undefined,
    }));
    const dominantCluster = keepDominantBlueprintCluster(sanitized);
    const clustered = dominantCluster.paths;
    if (dominantCluster.warning) {
        warnings.push(dominantCluster.warning);
    }

    const numericLabels = clustered
        .map((path) => path.lotNumber)
        .filter((label): label is string => !!label && /^\d+$/.test(label));
    const suffixCounts = new Map<string, number>();
    numericLabels.forEach((label) => {
        const suffix = label.slice(-2);
        suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1);
    });
    const topSuffixCount = Math.max(...Array.from(suffixCounts.values()), 0);
    const suspiciousLabelCluster = numericLabels.length >= 6 && topSuffixCount / numericLabels.length >= 0.7;

    if (plausiblePolygons.length < 3) {
        warnings.push("Se detectaron muy pocos poligonos cerrados para un loteo confiable.");
    }
    if (usableRatio < 0.05) {
        warnings.push("La proporcion entre geometria util y trazos totales es demasiado baja para sincronizar inventario.");
    }
    if (width <= 0 || height <= 0) {
        warnings.push("La geometria detectada no tiene una dispersion espacial util.");
    }
    if (suspiciousLabelCluster) {
        warnings.push("Las etiquetas detectadas parecen venir de cotas o textos tecnicos, no de numeros de lote.");
    }

    const geometryReliable =
        plausiblePolygons.length >= 3 &&
        usableRatio >= 0.05 &&
        width > 0 &&
        height > 0;

    if (!geometryReliable) {
        return {
            mode: "source-only",
            usablePaths: [],
            warnings,
            syntheticLabelsApplied: false,
            metrics: {
                totalPaths: paths.length,
                closedPaths: closedPaths.length,
                plausiblePolygons: plausiblePolygons.length,
                labeledPolygons: sanitized.filter((path) => !!path.lotNumber).length,
                usableRatio,
                width,
                height,
            },
        };
    }

    const saneLabelCount = clustered.filter((path) => !!path.lotNumber).length;
    const shouldUseSyntheticLabels =
        suspiciousLabelCluster || saneLabelCount < Math.max(5, Math.round(clustered.length * 0.12));

    const usablePaths = clustered.map((path, index) => ({
        ...path,
        lotNumber: shouldUseSyntheticLabels
            ? `L${path.internalId ?? index + 1}`
            : path.lotNumber ?? `L${path.internalId ?? index + 1}`,
    }));

    if (shouldUseSyntheticLabels) {
        warnings.push("Se reemplazaron etiquetas poco confiables por identificadores correlativos para evitar lotes basura.");
    }

    return {
        mode: "detected-lots",
        usablePaths,
        warnings,
        syntheticLabelsApplied: shouldUseSyntheticLabels,
            metrics: {
                totalPaths: paths.length,
                closedPaths: closedPaths.length,
                plausiblePolygons: plausiblePolygons.length,
                labeledPolygons: saneLabelCount,
                usableRatio,
                width,
                height,
            },
    };
}

export function buildDetectedLotsSVG(paths: ExtractedPath[]): string {
    if (paths.length === 0) {
        return buildFallbackBlueprintSVG({
            title: "Plano recibido",
            subtitle: "Sin geometria util",
            lines: ["No se detectaron lotes confiables en esta pasada."],
            meta: {
                sourceKind: "dxf",
                processingMode: "source-only",
            },
        });
    }

    const bounds = paths.reduce((acc, path) => {
        const pathBounds = extractPathBounds(path.pathData);
        if (!pathBounds) return acc;
        acc.minX = Math.min(acc.minX, pathBounds.minX);
        acc.minY = Math.min(acc.minY, pathBounds.minY);
        acc.maxX = Math.max(acc.maxX, pathBounds.maxX);
        acc.maxY = Math.max(acc.maxY, pathBounds.maxY);
        return acc;
    }, {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
    });

    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const padding = Math.max(width, height) * 0.06;

    const pathElements = paths.map((path) => {
        const dataAttrs = path.lotNumber
            ? ` data-lot="${path.lotNumber}" data-area="${path.areaSqm?.toFixed(4) ?? ""}"`
            : "";
        const pathBounds = extractPathBounds(path.pathData);
        const lotWidth = pathBounds ? Math.max(0.1, pathBounds.maxX - pathBounds.minX) : width / 40;
        const lotHeight = pathBounds ? Math.max(0.1, pathBounds.maxY - pathBounds.minY) : height / 40;
        const strokeWidth = Math.max(0.5, Math.min(lotWidth, lotHeight) * 0.02);
        return `<path d="${path.pathData}"${dataAttrs} fill="none" stroke="#10b981" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`;
    });

    const labelElements = paths.map((path) => {
        const displayLabel = formatDisplayedLotLabel(path.lotNumber);
        if (!displayLabel) return "";
        const pathBounds = extractPathBounds(path.pathData);
        const lotWidth = pathBounds ? Math.max(0.1, pathBounds.maxX - pathBounds.minX) : width / 40;
        const lotHeight = pathBounds ? Math.max(0.1, pathBounds.maxY - pathBounds.minY) : height / 40;
        const minSide = Math.min(lotWidth, lotHeight);
        const textLengthFactor = Math.max(0.58, 1 - Math.max(displayLabel.length - 3, 0) * 0.12);
        const autoFontSize = Math.min(
            minSide * 0.72 * textLengthFactor,
            lotWidth * 0.78 / Math.max(displayLabel.length * 0.62, 1),
            lotHeight * 0.76,
            Math.min(width, height) / 12
        );
        const fontSize = Math.max(1.2, Math.min(autoFontSize, 3.8));
        return `<text x="${path.center.x}" y="${path.center.y}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="#f8fafc" stroke="rgba(15,23,42,0.56)" stroke-width="${Math.max(fontSize * 0.045, 0.05)}" paint-order="stroke fill" font-family="monospace" font-weight="700" letter-spacing="0" pointer-events="none">${escapeXml(displayLabel)}</text>`;
    }).filter(Boolean);

    return `<svg viewBox="${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}" xmlns="http://www.w3.org/2000/svg">
${pathElements.join("\n")}
${labelElements.join("\n")}
</svg>`;
}

/**
 * Parses SVG content and extracts path data for lot mapping
 */
export function parseBlueprintSVG(svgString: string): ExtractedPath[] {
    if (typeof window === "undefined") return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const paths: ExtractedPath[] = [];

    const elements = doc.querySelectorAll("path, polygon, rect");
    elements.forEach((el, index) => {
        let d = "";
        if (el.tagName === "path") {
            d = el.getAttribute("d") || "";
        } else if (el.tagName === "polygon") {
            const points = el.getAttribute("points") || "";
            d = `M ${points} Z`;
        } else if (el.tagName === "rect") {
            const x = parseFloat(el.getAttribute("x") || "0");
            const y = parseFloat(el.getAttribute("y") || "0");
            const w = parseFloat(el.getAttribute("width") || "0");
            const h = parseFloat(el.getAttribute("height") || "0");
            d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
        }
        if (d) {
            const coords = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
            let cx = 0, cy = 0;
            if (coords && coords.length >= 2) {
                cx = parseFloat(coords[0]);
                cy = parseFloat(coords[1]);
            }
            paths.push({ id: el.getAttribute("id") || `path-${index}`, pathData: d, center: { x: cx, y: cy } });
        }
    });
    return paths;
}

/**
 * Parses DXF content → SVG paths with lot numbers (MTEXT) and polygon areas (Shoelace).
 * Supports: LWPOLYLINE, POLYLINE, LINE, CIRCLE, ARC, TEXT, MTEXT
 */
export function parseBlueprintDXF(dxfString: string): { svg: string; paths: ExtractedPath[] } {
    const lines = dxfString.split(/\r?\n/);
    const rawEntities: any[] = [];
    let currentEntity: string | null = null;
    let currentLayer = "0";
    let vertices: { x: number; y: number }[] = [];
    let isClosed = false;
    let inPolyline = false;
    let viewbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    // Entity state vars
    let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;
    let ccx = 0, ccy = 0, cr = 0;
    let ax = 0, ay = 0, ar = 0, aStart = 0, aEnd = 0;
    let tx = 0, ty = 0, txt = "", tHeight = 2.5;
    let mx = 0, my = 0, mtxt = "", mtHeight = 2.5;

    const updateViewbox = (x: number, y: number) => {
        if (x < viewbox.minX) viewbox.minX = x;
        if (y < viewbox.minY) viewbox.minY = y;
        if (x > viewbox.maxX) viewbox.maxX = x;
        if (y > viewbox.maxY) viewbox.maxY = y;
    };

    const collectEntity = (type: string, data: any) => {
        rawEntities.push({ type, layer: currentLayer, ...data });
        if (data.vertices) data.vertices.forEach((v: any) => updateViewbox(v.x, v.y));
        if (data.x1 !== undefined) { updateViewbox(data.x1, data.y1); updateViewbox(data.x2, data.y2); }
        if (data.cx !== undefined) { updateViewbox(data.cx - data.r, data.cy - data.r); updateViewbox(data.cx + data.r, data.cy + data.r); }
        if (data.x !== undefined && data.text === undefined) updateViewbox(data.x, data.y);
    };

    const resetEntityState = () => {
        vertices = [];
        isClosed = false;
        lx1 = 0; ly1 = 0; lx2 = 0; ly2 = 0;
        ccx = 0; ccy = 0; cr = 0;
        ax = 0; ay = 0; ar = 0; aStart = 0; aEnd = 0;
        tx = 0; ty = 0; txt = ""; tHeight = 2.5;
        mx = 0; my = 0; mtxt = ""; mtHeight = 2.5;
    };

    const flushCurrentEntity = () => {
        if (currentEntity === "LWPOLYLINE" && vertices.length > 0) {
            // Also detect geometrically-closed polylines where the isClosed flag isn't set
            // (some DXF exporters omit it and just repeat the first vertex at the end)
            let geomClosed = isClosed;
            let verts = [...vertices];
            if (!geomClosed && verts.length >= 4) {
                const first = verts[0], last = verts[verts.length - 1];
                const epsilon = Math.max(0.001, Math.hypot(
                    verts[1].x - verts[0].x, verts[1].y - verts[0].y
                ) * 0.01);
                if (Math.abs(first.x - last.x) < epsilon && Math.abs(first.y - last.y) < epsilon) {
                    geomClosed = true;
                    verts = verts.slice(0, -1); // remove duplicate closing vertex
                }
            }
            collectEntity("LWPOLYLINE", { vertices: verts, isClosed: geomClosed });
        } else if (currentEntity === "LINE") {
            collectEntity("LINE", { x1: lx1, y1: ly1, x2: lx2, y2: ly2 });
        } else if (currentEntity === "CIRCLE" && cr > 0) {
            collectEntity("CIRCLE", { cx: ccx, cy: ccy, r: cr });
        } else if (currentEntity === "ARC" && ar > 0) {
            collectEntity("ARC", { cx: ax, cy: ay, r: ar, startAngle: aStart, endAngle: aEnd });
        } else if (currentEntity === "TEXT" && txt.trim()) {
            collectEntity("TEXT", { x: tx, y: ty, text: txt, height: tHeight });
        } else if (currentEntity === "MTEXT" && mtxt.trim()) {
            collectEntity("MTEXT", { x: mx, y: my, text: mtxt, height: mtHeight });
        } else if (currentEntity === "SEQEND" && inPolyline && vertices.length > 0) {
            collectEntity("POLYLINE", { vertices: [...vertices], isClosed });
            inPolyline = false;
        }

        resetEntityState();
    };

    // ─── Main DXF parse loop ──────────────────────────────────────────────────
    for (let i = 0; i < lines.length - 1; i += 2) {
        const code = lines[i].trim();
        const value = lines[i + 1]?.trim();
        if (value === undefined) break;

        if (code === "0") {
            const nextEntity = value;
            flushCurrentEntity();
            if (nextEntity === "POLYLINE") inPolyline = true;
            currentEntity = nextEntity;
            continue;
        }

        if (code === "8") { currentLayer = value; continue; }

        if (currentEntity === "LWPOLYLINE") {
            if (code === "10") vertices.push({ x: parseFloat(value), y: 0 });
            else if (code === "20" && vertices.length > 0) vertices[vertices.length - 1].y = parseFloat(value);
            else if (code === "70") isClosed = (parseInt(value) & 1) === 1;
        } else if (currentEntity === "VERTEX" && inPolyline) {
            if (code === "10") vertices.push({ x: parseFloat(value), y: 0 });
            else if (code === "20" && vertices.length > 0) vertices[vertices.length - 1].y = parseFloat(value);
        } else if (currentEntity === "LINE") {
            if (code === "10") lx1 = parseFloat(value); else if (code === "20") ly1 = parseFloat(value);
            else if (code === "11") lx2 = parseFloat(value); else if (code === "21") ly2 = parseFloat(value);
        } else if (currentEntity === "CIRCLE") {
            if (code === "10") ccx = parseFloat(value); else if (code === "20") ccy = parseFloat(value);
            else if (code === "40") cr = parseFloat(value);
        } else if (currentEntity === "ARC") {
            if (code === "10") ax = parseFloat(value); else if (code === "20") ay = parseFloat(value);
            else if (code === "40") ar = parseFloat(value);
            else if (code === "50") aStart = parseFloat(value);
            else if (code === "51") aEnd = parseFloat(value);
        } else if (currentEntity === "TEXT") {
            if (code === "10") tx = parseFloat(value); else if (code === "20") ty = parseFloat(value);
            else if (code === "40") tHeight = parseFloat(value);
            else if (code === "1") txt = value;
        } else if (currentEntity === "MTEXT") {
            if (code === "10") mx = parseFloat(value); else if (code === "20") my = parseFloat(value);
            else if (code === "40") mtHeight = parseFloat(value);
            else if (code === "1" || code === "3") mtxt += value;
        } else if (currentEntity === "POLYLINE" && inPolyline) {
            if (code === "70") isClosed = (parseInt(value) & 1) === 1;
        }
    }

    flushCurrentEntity();

    // ─── Topology reconstruction for segment-based DXFs (R12 style) ────────────
    // AutoCAD R12 encodes each lot side as a separate POLYLINE entity (2 vertices).
    // Chain these segments into closed polygons by following shared endpoints.
    {
        const hasRealPolygon = rawEntities.some(
            (e) => e.type.includes("POLYLINE") && e.isClosed
                && (e.vertices?.length ?? 0) >= 4
                && shoelaceArea(e.vertices) > 0
        );

        if (!hasRealPolygon) {
            interface TopoSeg { from: { x: number; y: number }; to: { x: number; y: number }; used: boolean; }
            const segs: TopoSeg[] = [];

            for (const e of rawEntities) {
                if (e.type === "LINE") {
                    const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
                    if (len > 1e-10) segs.push({ from: { x: e.x1, y: e.y1 }, to: { x: e.x2, y: e.y2 }, used: false });
                } else if (e.type.includes("POLYLINE") && (e.vertices?.length ?? 0) >= 2) {
                    let verts: { x: number; y: number }[] = e.vertices;
                    // Remove phantom closing vertex (R12 POLYLINE with flag=1 often repeats first vertex at end)
                    if (verts.length > 2) {
                        const f = verts[0], l = verts[verts.length - 1];
                        if (Math.abs(f.x - l.x) < 1e-9 && Math.abs(f.y - l.y) < 1e-9) {
                            verts = verts.slice(0, -1);
                        }
                    }
                    if (verts.length === 2) {
                        const len = Math.hypot(verts[1].x - verts[0].x, verts[1].y - verts[0].y);
                        if (len > 1e-10) segs.push({ from: verts[0], to: verts[1], used: false });
                    }
                }
            }

            if (segs.length >= 4) {
                // Tight epsilon: R12 exact endpoints match perfectly, inter-lot slop is ~0.003
                const eps = 0.001;
                const reconstructed: { x: number; y: number }[][] = [];

                for (let si = 0; si < segs.length; si++) {
                    if (segs[si].used) continue;
                    const ring: { x: number; y: number }[] = [segs[si].from, segs[si].to];
                    segs[si].used = true;

                    let extended = true;
                    while (extended && ring.length < 500) {
                        extended = false;
                        const tail = ring[ring.length - 1];
                        const head = ring[0];

                        // Closed?
                        if (ring.length >= 3 && Math.hypot(tail.x - head.x, tail.y - head.y) < eps) {
                            ring.pop();
                            if (ring.length >= 3) reconstructed.push([...ring]);
                            extended = true;
                            break;
                        }

                        // Prefer forward continuation (seg.from ≈ tail) over reverse (seg.to ≈ tail)
                        let bestJ = -1, bestReverse = false;
                        for (let sj = 0; sj < segs.length; sj++) {
                            if (segs[sj].used) continue;
                            if (Math.hypot(segs[sj].from.x - tail.x, segs[sj].from.y - tail.y) < eps) {
                                bestJ = sj; bestReverse = false; break;
                            }
                        }
                        if (bestJ < 0) {
                            for (let sj = 0; sj < segs.length; sj++) {
                                if (segs[sj].used) continue;
                                if (Math.hypot(segs[sj].to.x - tail.x, segs[sj].to.y - tail.y) < eps) {
                                    bestJ = sj; bestReverse = true; break;
                                }
                            }
                        }
                        if (bestJ >= 0) {
                            segs[bestJ].used = true;
                            ring.push(bestReverse ? segs[bestJ].from : segs[bestJ].to);
                            extended = true;
                        }
                    }
                }

                for (const verts of reconstructed) {
                    rawEntities.push({ type: "POLYLINE", layer: "topo", vertices: verts, isClosed: true });
                    verts.forEach((v) => updateViewbox(v.x, v.y));
                }
            }
        }
    }

    // ─── Coordinate transform setup ──────────────────────────────────────────
    const width = viewbox.maxX - viewbox.minX || 1000;
    const height = viewbox.maxY - viewbox.minY || 1000;
    const padding = Math.max(width, height) * 0.05;
    const vMinX = viewbox.minX - padding;
    const vHeight = height + padding * 2;
    const flipY = (y: number) => viewbox.maxY - (y - viewbox.minY);

    // ─── Step 1: compute closed polygon centroids + areas ────────────────────
    const closedPolyMeta = new Map<number, { cx: number; cy: number; area: number }>();
    rawEntities.forEach((ent, idx) => {
        if (ent.type.includes("POLYLINE") && ent.isClosed && ent.vertices?.length >= 3) {
            const cx = ent.vertices.reduce((s: number, v: any) => s + v.x, 0) / ent.vertices.length;
            const cy = ent.vertices.reduce((s: number, v: any) => s + v.y, 0) / ent.vertices.length;
            const area = shoelaceArea(ent.vertices);
            closedPolyMeta.set(idx, { cx, cy, area });
        }
    });

    // ─── Step 2: match each text label to nearest polygon centroid ───────────
    // Only match labels that look like lot identifiers (short integers or alphanumeric IDs, max 6 chars)
    const polygonLabels = new Map<number, string>();
    const textLabels = rawEntities.filter(
        ent => (ent.type === "TEXT" || ent.type === "MTEXT") && ent.text?.trim()
    );

    // Pass 1: for each unique label text, find the single closest polygon
    // This prevents the same label appearing on multiple polygons (duplicates)
    const labelBestMatch = new Map<string, { idx: number; dist: number }>();

    for (const label of textLabels) {
        const clean = cleanMText(label.text);
        if (!clean) continue;
        // Must be a short identifier (≤10 chars), no spaces, no decimal measurements
        if (clean.length > 10) continue;
        if (!/^[A-Za-z0-9áéíóúÁÉÍÓÚ\-_./]+$/.test(clean)) continue;
        if (/^\d+\.\d+$/.test(clean)) continue;

        let minDist = Infinity, bestIdx = -1;
        for (const [idx, { cx, cy }] of Array.from(closedPolyMeta)) {
            const dist = Math.hypot(label.x - cx, label.y - cy);
            if (dist < minDist) { minDist = dist; bestIdx = idx; }
        }
        if (bestIdx < 0) continue;

        // Distance threshold: 3.0× polygon "radius" (generous — labels can sit outside the polygon)
        const meta = closedPolyMeta.get(bestIdx)!;
        if (minDist > Math.sqrt(meta.area) * 3.0 + 0.5) continue;

        // Keep only the closest match per unique label value
        const existing = labelBestMatch.get(clean);
        if (!existing || minDist < existing.dist) {
            labelBestMatch.set(clean, { idx: bestIdx, dist: minDist });
        }
    }

    // Pass 2: assign labels to polygons — strictly 1:1 (closest wins both ways)
    const sortedMatches = Array.from(labelBestMatch.entries()).sort((a, b) => a[1].dist - b[1].dist);
    for (const [label, { idx }] of sortedMatches) {
        if (!polygonLabels.has(idx)) {
            polygonLabels.set(idx, label);
        }
    }

    // ─── Step 3: build SVG elements ──────────────────────────────────────────
    const paths: ExtractedPath[] = [];
    const pathElements: string[] = [];
    const textElements: string[] = [];
    const labelElements: string[] = [];
    const labelFontSize = Math.min(width, height) / 60;
    const strokeW = width / 1500;

    rawEntities.forEach((ent, idx) => {
        let d = "";
        let entVertices: { x: number; y: number }[] = [];

        if (ent.type.includes("POLYLINE")) {
            entVertices = ent.vertices.map((v: any) => ({ x: v.x, y: flipY(v.y) }));
            d = `M ${entVertices[0].x} ${entVertices[0].y}`;
            for (let j = 1; j < entVertices.length; j++) d += ` L ${entVertices[j].x} ${entVertices[j].y}`;
            if (ent.isClosed) d += " Z";

        } else if (ent.type === "LINE") {
            entVertices = [{ x: ent.x1, y: flipY(ent.y1) }, { x: ent.x2, y: flipY(ent.y2) }];
            d = `M ${entVertices[0].x} ${entVertices[0].y} L ${entVertices[1].x} ${entVertices[1].y}`;

        } else if (ent.type === "CIRCLE") {
            const fcy = flipY(ent.cy);
            d = `M ${ent.cx - ent.r},${fcy} a ${ent.r},${ent.r} 0 1,0 ${ent.r * 2},0 a ${ent.r},${ent.r} 0 1,0 ${-ent.r * 2},0`;
            entVertices = [{ x: ent.cx, y: fcy }];

        } else if (ent.type === "ARC") {
            const fcy = flipY(ent.cy);
            const startRad = (ent.startAngle * Math.PI) / 180;
            const endRad = (ent.endAngle * Math.PI) / 180;
            const sx = ent.cx + ent.r * Math.cos(startRad);
            const sy = fcy - ent.r * Math.sin(startRad);  // Y-flipped
            const ex = ent.cx + ent.r * Math.cos(endRad);
            const ey = fcy - ent.r * Math.sin(endRad);
            let angleDiff = ent.endAngle - ent.startAngle;
            if (angleDiff < 0) angleDiff += 360;
            const largeArc = angleDiff > 180 ? 1 : 0;
            d = `M ${sx},${sy} A ${ent.r},${ent.r} 0 ${largeArc},0 ${ex},${ey}`;
            entVertices = [{ x: ent.cx, y: fcy }];

        } else if (ent.type === "TEXT" || ent.type === "MTEXT") {
            const clean = cleanMText(ent.text);
            if (clean) {
                const fty = flipY(ent.y);
                textElements.push(
                    `<text x="${ent.x}" y="${fty}" class="dxf-text" font-size="${ent.height || labelFontSize}" fill="#94a3b8" font-family="sans-serif" pointer-events="none">${clean}</text>`
                );
            }
        }

        if (!d) return;

        const cx = entVertices.reduce((s, v) => s + v.x, 0) / entVertices.length;
        const cy = entVertices.reduce((s, v) => s + v.y, 0) / entVertices.length;
        const lotNumber = polygonLabels.get(idx);
        const polyMeta = closedPolyMeta.get(idx);
        const area = polyMeta?.area;

        // Smart fill: skip giant border/frame polygons
        let shouldFill = d.includes("Z");
        if (shouldFill && entVertices.length >= 3) {
            const entW = Math.max(...entVertices.map(v => v.x)) - Math.min(...entVertices.map(v => v.x));
            const entH = Math.max(...entVertices.map(v => v.y)) - Math.min(...entVertices.map(v => v.y));
            if (entW * entH > width * height * 0.4 || entW > width * 0.7 || entH > height * 0.7) {
                shouldFill = false;
            }
        }

        paths.push({
            id: `dxf-${idx}-${ent.layer}`,
            pathData: d,
            center: { x: cx, y: cy },
            lotNumber,
            areaSqm: area,
        });

        const dataAttrs = lotNumber
            ? ` data-lot="${lotNumber}" data-area="${area?.toFixed(4) ?? ''}"`
            : '';

        pathElements.push(
            `<path id="dxf-${idx}-${ent.layer}" d="${d}"${dataAttrs} fill="${shouldFill ? "rgba(16, 185, 129, 0.15)" : "none"}" stroke="#10b981" stroke-width="${strokeW}" vector-effect="non-scaling-stroke" />`
        );

        // Lot number label centered on the polygon (analysis mode)
        // Adaptive font size: fit inside the polygon, never exceed global labelFontSize
        if (lotNumber) {
            let fontSize = labelFontSize;
            if (entVertices.length >= 3) {
                const xs = entVertices.map(v => v.x), ys = entVertices.map(v => v.y);
                const pW = Math.max(...xs) - Math.min(...xs);
                const pH = Math.max(...ys) - Math.min(...ys);
                fontSize = Math.min(pW * 0.35, pH * 0.45, labelFontSize);
                fontSize = Math.max(fontSize, labelFontSize * 0.3); // floor
            }
            // Approx text width for monospace: 0.62em per char + padding
            const approxW = fontSize * 0.62 * lotNumber.length + fontSize * 0.6;
            const approxH = fontSize * 1.3;
            const rx = approxH * 0.3;
            labelElements.push(
                `<g class="lot-label" pointer-events="none">` +
                `<rect x="${cx - approxW / 2}" y="${cy - approxH / 2}" width="${approxW}" height="${approxH}" rx="${rx}" fill="rgba(0,0,0,0.65)" />` +
                `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" fill="#10b981" font-family="monospace" font-weight="bold">${lotNumber}</text>` +
                `</g>`
            );
        }
    });

    const svg = `<svg viewBox="${vMinX} ${viewbox.minY - padding} ${width + padding * 2} ${vHeight}" xmlns="http://www.w3.org/2000/svg">
${pathElements.join("\n")}
${textElements.join("\n")}
${labelElements.join("\n")}
</svg>`;

    // ─── Assign internalIds in reading order (top-left → right → down) ───────
    // Only for closed polygons (actual lot shapes). Uses SVG Y: small Y = top.
    const closedPaths = paths.filter(p => p.pathData.includes("Z"));
    if (closedPaths.length > 0) {
        const allCY = closedPaths.map(p => p.center.y);
        const minCY = Math.min(...allCY);
        const maxCY = Math.max(...allCY);
        // Row height threshold: 5% of total height, minimum 5 units
        const rowH = Math.max((maxCY - minCY) * 0.05, 5);
        closedPaths
            .sort((a, b) => {
                const rowA = Math.round(a.center.y / rowH);
                const rowB = Math.round(b.center.y / rowH);
                return rowA !== rowB ? rowA - rowB : a.center.x - b.center.x;
            })
            .forEach((p, i) => { p.internalId = i + 1; });
    }

    return { svg, paths };
}

/**
 * Projects SVG coordinates to Lat/Lng based on overlay bounds
 */
export function svgToGeoJSON(paths: ExtractedPath[], bounds: [[number, number], [number, number]]) {
    const [sw, ne] = bounds;
    const latDiff = ne[0] - sw[0];
    const lngDiff = ne[1] - sw[1];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(p => {
        if (p.center.x < minX) minX = p.center.x;
        if (p.center.y < minY) minY = p.center.y;
        if (p.center.x > maxX) maxX = p.center.x;
        if (p.center.y > maxY) maxY = p.center.y;
    });

    const sourceWidth = maxX - minX || 1;
    const sourceHeight = maxY - minY || 1;

    return {
        type: "FeatureCollection",
        features: paths.map(p => ({
            type: "Feature",
            properties: { id: p.id },
            geometry: {
                type: "Point",
                coordinates: [
                    sw[1] + ((p.center.x - minX) / sourceWidth) * lngDiff,
                    sw[0] + (1 - (p.center.y - minY) / sourceHeight) * latDiff,
                ]
            }
        }))
    };
}
