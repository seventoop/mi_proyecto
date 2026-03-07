export interface ExtractedPath {
    id: string;
    pathData: string;
    center: { x: number; y: number };
    bboxArea: number;
}

/**
 * Parses SVG content and extracts path data for lot mapping
 */
export function parseBlueprintSVG(svgString: string): ExtractedPath[] {
    if (typeof window === "undefined") return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const paths: ExtractedPath[] = [];

    // Extract paths, polygons, and rects
    const elements = doc.querySelectorAll("path, polygon, rect");

    elements.forEach((el, index) => {
        let d = "";
        let bbox = { x: 0, y: 0, width: 0, height: 0 };

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
            // We use a simplified center calculation based on the element's ID or position
            // In a real scenario, we'd use getBBox() but that requires the element to be in the DOM
            // For now, we'll try to extract coordinates from the path string as a fallback
            const coords = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
            let cx = 0, cy = 0;
            if (coords && coords.length >= 2) {
                cx = parseFloat(coords[0]);
                cy = parseFloat(coords[1]);
            }

            paths.push({
                id: el.getAttribute("id") || `path-${index}`,
                pathData: d,
                center: { x: cx, y: cy },
                bboxArea: 0,
            });
        }
    });

    return paths;
}

/**
 * Parses DXF content and converts it to a set of SVG paths
 * Focuses on LWPOLYLINE and POLYLINE entities (standard for lots)
 */
export function parseBlueprintDXF(dxfString: string): { svg: string; paths: ExtractedPath[] } {
    const lines = dxfString.split(/\r?\n/);
    const rawEntities: any[] = [];
    let currentEntity: string | null = null;
    let currentLayer = "0";
    let vertices: { x: number; y: number }[] = [];
    let isClosed = false;
    let viewbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    // LINE coords
    let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;
    // CIRCLE coords
    let ccx = 0, ccy = 0, cr = 0;
    // TEXT details
    let tx = 0, ty = 0, txt = "", tHeight = 10;

    const updateViewbox = (x: number, y: number) => {
        if (x < viewbox.minX) viewbox.minX = x;
        if (y < viewbox.minY) viewbox.minY = y;
        if (x > viewbox.maxX) viewbox.maxX = x;
        if (y > viewbox.maxY) viewbox.maxY = y;
    };

    const collectEntity = (type: string, data: any) => {
        if (!data || (data.vertices && data.vertices.length === 0)) return;

        // Filter out layers that usually contain giant frames or distant metadata
        const l = currentLayer.toUpperCase();
        if (l.includes("MARCO") || l.includes("FRAME") || l.includes("TEXTO") || l.includes("NOTAS")) {
            // We collect them but DON'T let them expand the viewbox if they are outliers
            rawEntities.push({ type, layer: currentLayer, ...data, isBackground: true });
            return;
        }

        rawEntities.push({ type, layer: currentLayer, ...data });
        if (data.vertices) data.vertices.forEach((v: any) => updateViewbox(v.x, v.y));
        if (data.x1 !== undefined) { updateViewbox(data.x1, data.y1); updateViewbox(data.x2, data.y2); }
        if (data.cx !== undefined) { updateViewbox(data.cx - data.r, data.cy - data.r); updateViewbox(data.cx + data.r, data.cy + data.r); }
        if (data.x !== undefined) updateViewbox(data.x, data.y);
    };

    for (let i = 0; i < lines.length; i++) {
        const code = lines[i].trim();
        const value = lines[i + 1]?.trim();
        if (value === undefined) break;

        if (code === "0") {
            const nextEntity = value;

            // Finalize previous collection
            if (currentEntity === "LWPOLYLINE") {
                collectEntity("LWPOLYLINE", { vertices: [...vertices], isClosed });
                vertices = [];
            } else if (currentEntity === "LINE") {
                collectEntity("LINE", { x1: lx1, y1: ly1, x2: lx2, y2: ly2 });
            } else if (currentEntity === "CIRCLE") {
                collectEntity("CIRCLE", { cx: ccx, cy: ccy, r: cr });
            } else if (currentEntity === "TEXT") {
                collectEntity("TEXT", { x: tx, y: ty, text: txt, height: tHeight });
                txt = "";
            } else if (nextEntity === "SEQEND") {
                collectEntity("POLYLINE", { vertices: [...vertices], isClosed });
                vertices = [];
                isClosed = false;
            }

            currentEntity = nextEntity;
            i++; continue;
        }

        if (code === "8") { currentLayer = value; i++; continue; }

        if (currentEntity === "LWPOLYLINE") {
            if (code === "10") vertices.push({ x: parseFloat(value), y: 0 });
            else if (code === "20" && vertices.length > 0) vertices[vertices.length - 1].y = parseFloat(value);
            else if (code === "70") isClosed = (parseInt(value) & 1) === 1;
        } else if (currentEntity === "VERTEX") {
            if (code === "10") vertices.push({ x: parseFloat(value), y: 0 });
            else if (code === "20" && vertices.length > 0) vertices[vertices.length - 1].y = parseFloat(value);
        } else if (currentEntity === "POLYLINE") {
            if (code === "70") isClosed = (parseInt(value) & 1) === 1;
        } else if (currentEntity === "LINE") {
            if (code === "10") lx1 = parseFloat(value); else if (code === "20") ly1 = parseFloat(value);
            else if (code === "11") lx2 = parseFloat(value); else if (code === "21") ly2 = parseFloat(value);
        } else if (currentEntity === "CIRCLE") {
            if (code === "10") ccx = parseFloat(value); else if (code === "20") ccy = parseFloat(value);
            else if (code === "40") cr = parseFloat(value);
        } else if (currentEntity === "TEXT") {
            if (code === "10") tx = parseFloat(value); else if (code === "20") ty = parseFloat(value);
            else if (code === "1") txt = value; else if (code === "40") tHeight = parseFloat(value);
        }
    }

    // Safety: If no viewbox was found, use a default fallback
    if (viewbox.minX === Infinity) viewbox = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

    // Process and Normalize Coordinates
    const width = viewbox.maxX - viewbox.minX || 1000;
    const height = viewbox.maxY - viewbox.minY || 1000;
    const padding = Math.max(width, height) * 0.05;

    const normX = (x: number) => x - viewbox.minX;
    const normY = (y: number) => height - (y - viewbox.minY);

    const paths: ExtractedPath[] = [];
    const svgElements: string[] = [];

    rawEntities.forEach((ent, idx) => {
        let d = "";
        let entVertices: { x: number; y: number }[] = [];

        // Skip entities that are way outside our interest viewbox (if possible)
        // or just render them as background
        const isOutlier = ent.isBackground;

        if (ent.type.includes("POLYLINE")) {
            entVertices = ent.vertices.map((v: any) => ({ x: normX(v.x), y: normY(v.y) }));
            if (entVertices.length < 2) return;
            d = `M ${entVertices[0].x.toFixed(4)} ${entVertices[0].y.toFixed(4)}`;
            for (let j = 1; j < entVertices.length; j++) d += ` L ${entVertices[j].x.toFixed(4)} ${entVertices[j].y.toFixed(4)}`;
            if (ent.isClosed) d += " Z";
        } else if (ent.type === "LINE") {
            entVertices = [{ x: normX(ent.x1), y: normY(ent.y1) }, { x: normX(ent.x2), y: normY(ent.y2) }];
            d = `M ${entVertices[0].x.toFixed(4)} ${entVertices[0].y.toFixed(4)} L ${entVertices[1].x.toFixed(4)} ${entVertices[1].y.toFixed(4)}`;
        } else if (ent.type === "CIRCLE") {
            const cx = normX(ent.cx);
            const cy = normY(ent.cy);
            d = `M ${cx - ent.r},${cy} a ${ent.r},${ent.r} 0 1,0 ${ent.r * 2},0 a ${ent.r},${ent.r} 0 1,0 ${-ent.r * 2},0`;
            entVertices = [{ x: cx, y: cy }];
        } else if (ent.type === "TEXT" && !isOutlier) {
            const nx = normX(ent.x);
            const ny = normY(ent.y);
            svgElements.push(`<text x="${nx.toFixed(4)}" y="${ny.toFixed(4)}" font-size="${ent.height || width / 100}" fill="#94a3b8" font-family="sans-serif" text-anchor="middle">${ent.text}</text>`);
        }

        if (d) {
            const cx = entVertices.reduce((sum, v) => sum + v.x, 0) / entVertices.length;
            const cy = entVertices.reduce((sum, v) => sum + v.y, 0) / entVertices.length;

            const xs = entVertices.map(v => v.x);
            const ys = entVertices.map(v => v.y);
            const minEx = Math.min(...xs);
            const maxEx = Math.max(...xs);
            const minEy = Math.min(...ys);
            const maxEy = Math.max(...ys);
            const bboxArea = (maxEx - minEx) * (maxEy - minEy);

            // Smart filling logic
            let shouldFill = d.includes("Z") && !isOutlier;
            if (shouldFill) {
                if (bboxArea > (width * height * 0.7)) shouldFill = false;
            }

            const id = `dxf-${idx}-${ent.layer}`;
            if (!isOutlier) {
                paths.push({ id, pathData: d, center: { x: cx, y: cy }, bboxArea });
            }

            // Background entities (frames) are rendered with subtle lines and NO fill
            const color = isOutlier ? "rgba(148, 163, 184, 0.1)" : "#10b981";
            const fill = shouldFill ? "rgba(16, 185, 129, 0.1)" : "none";
            const strokeWidth = isOutlier ? width / 4000 : width / 2000;

            svgElements.push(`<path id="${id}" d="${d}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`);
        }
    });

    const svg = `<svg viewBox="${-padding} ${-padding} ${width + padding * 2} ${height + padding * 2}" xmlns="http://www.w3.org/2000/svg">
${svgElements.join("\n")}
</svg>`;

    return { svg, paths };
}

/**
 * Projects SVG coordinates to Lat/Lng based on overlay bounds
 * This is the magic that puts the "AutoCAD" on Google Maps
 */
export function svgToGeoJSON(paths: ExtractedPath[], bounds: [[number, number], [number, number]]) {
    const [sw, ne] = bounds;
    const latDiff = ne[0] - sw[0];
    const lngDiff = ne[1] - sw[1];

    // Calculate source bounds of the paths
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
                    sw[0] + (1 - (p.center.y - minY) / sourceHeight) * latDiff // Lat is usually inverted relative to SVG
                ]
            }
        }))
    };
}
