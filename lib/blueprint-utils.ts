export interface ExtractedPath {
    id: string;
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

    // ─── Main DXF parse loop ──────────────────────────────────────────────────
    for (let i = 0; i < lines.length; i++) {
        const code = lines[i].trim();
        const value = lines[i + 1]?.trim();
        if (value === undefined) break;

        if (code === "0") {
            const nextEntity = value;
            // Flush current entity
            if (currentEntity === "LWPOLYLINE" && vertices.length > 0) {
                collectEntity("LWPOLYLINE", { vertices: [...vertices], isClosed });
            } else if (currentEntity === "LINE") {
                collectEntity("LINE", { x1: lx1, y1: ly1, x2: lx2, y2: ly2 });
            } else if (currentEntity === "CIRCLE" && cr > 0) {
                collectEntity("CIRCLE", { cx: ccx, cy: ccy, r: cr });
            } else if (currentEntity === "ARC" && ar > 0) {
                collectEntity("ARC", { cx: ax, cy: ay, r: ar, startAngle: aStart, endAngle: aEnd });
                ar = 0;
            } else if (currentEntity === "TEXT" && txt.trim()) {
                collectEntity("TEXT", { x: tx, y: ty, text: txt, height: tHeight });
                txt = "";
            } else if (currentEntity === "MTEXT" && mtxt.trim()) {
                collectEntity("MTEXT", { x: mx, y: my, text: mtxt, height: mtHeight });
                mtxt = "";
            } else if (currentEntity === "SEQEND" && inPolyline && vertices.length > 0) {
                collectEntity("POLYLINE", { vertices: [...vertices], isClosed });
                inPolyline = false;
            }
            vertices = []; isClosed = false;
            if (nextEntity === "POLYLINE") inPolyline = true;
            currentEntity = nextEntity;
            i++; continue;
        }

        if (code === "8") { currentLayer = value; i++; continue; }

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
            else if (code === "1") { txt = value; i++; continue; } // skip value from being re-read as code
        } else if (currentEntity === "MTEXT") {
            if (code === "10") mx = parseFloat(value); else if (code === "20") my = parseFloat(value);
            else if (code === "40") mtHeight = parseFloat(value);
            else if (code === "1" || code === "3") { mtxt += value; i++; continue; } // skip value
        } else if (currentEntity === "POLYLINE" && inPolyline) {
            if (code === "70") isClosed = (parseInt(value) & 1) === 1;
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
        // Must be a short identifier (≤6 chars), no spaces, no decimal measurements
        if (clean.length > 6) continue;
        if (!/^[A-Za-z0-9áéíóúÁÉÍÓÚ\-]+$/.test(clean)) continue;
        if (/^\d+\.\d+$/.test(clean)) continue;

        let minDist = Infinity, bestIdx = -1;
        for (const [idx, { cx, cy }] of closedPolyMeta) {
            const dist = Math.hypot(label.x - cx, label.y - cy);
            if (dist < minDist) { minDist = dist; bestIdx = idx; }
        }
        if (bestIdx < 0) continue;

        // Distance threshold: 1.5× polygon "radius"
        const meta = closedPolyMeta.get(bestIdx)!;
        if (minDist > Math.sqrt(meta.area) * 1.5 + 0.5) continue;

        // Keep only the closest match per unique label value
        const existing = labelBestMatch.get(clean);
        if (!existing || minDist < existing.dist) {
            labelBestMatch.set(clean, { idx: bestIdx, dist: minDist });
        }
    }

    // Pass 2: assign labels to polygons — strictly 1:1 (closest wins both ways)
    const sortedMatches = [...labelBestMatch.entries()].sort((a, b) => a[1].dist - b[1].dist);
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
