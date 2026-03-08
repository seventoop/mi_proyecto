export interface ExtractedPath {
    id: string;
    pathData: string;
    center: { x: number; y: number };
    layer: string;
    bboxArea: number;
}

export interface LayerInfo {
    name: string;
    count: number;
}

export interface DxfParseResult {
    paths: ExtractedPath[];
    layers: LayerInfo[];
    viewBox: string;
    strokeWidth: number;
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

            paths.push({
                id: el.getAttribute("id") || `path-${index}`,
                pathData: d,
                center: { x: cx, y: cy },
                layer: "0",
                bboxArea: 0,
            });
        }
    });

    return paths;
}

/**
 * Lightweight layer extraction — no path building, just counts per layer
 */
export function getLayersFromDXF(dxfString: string): LayerInfo[] {
    const lines = dxfString.split(/\r?\n/);
    const layerCounts: Record<string, number> = {};
    let inEntities = false;
    let currentLayer = "0";
    let currentEntity: string | null = null;

    for (let i = 0; i < lines.length - 1; i++) {
        const code = lines[i].trim();
        const value = lines[i + 1]?.trim();
        if (value === undefined) break;

        if (code === "0" && value === "ENTITIES") { inEntities = true; i++; continue; }
        if (code === "0" && value === "ENDSEC" && inEntities) break;
        if (!inEntities) { i++; continue; }

        if (code === "0") {
            currentEntity = value;
            i++; continue;
        }
        if (code === "8") {
            currentLayer = value;
            if (currentEntity === "LWPOLYLINE" || currentEntity === "POLYLINE") {
                layerCounts[currentLayer] = (layerCounts[currentLayer] || 0) + 1;
            }
            i++; continue;
        }
        i++;
    }

    return Object.entries(layerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Parses DXF content and returns structured path data with layer info
 * (no SVG building — caller uses buildSVG with the result)
 */
export function parseBlueprintDXF(dxfString: string): DxfParseResult {
    const lines = dxfString.split(/\r?\n/);
    const rawEntities: any[] = [];
    let currentEntity: string | null = null;
    let currentLayer = "0";
    let vertices: { x: number; y: number }[] = [];
    let isClosed = false;
    let viewbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;
    let ccx = 0, ccy = 0, cr = 0;
    let tx = 0, ty = 0, txt = "", tHeight = 10;

    const updateViewbox = (x: number, y: number) => {
        if (x < viewbox.minX) viewbox.minX = x;
        if (y < viewbox.minY) viewbox.minY = y;
        if (x > viewbox.maxX) viewbox.maxX = x;
        if (y > viewbox.maxY) viewbox.maxY = y;
    };

    const collectEntity = (type: string, data: any) => {
        if (!data || (data.vertices && data.vertices.length === 0)) return;

        const l = currentLayer.toUpperCase();
        if (l.includes("MARCO") || l.includes("FRAME") || l.includes("TEXTO") || l.includes("NOTAS")) {
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

    if (viewbox.minX === Infinity) viewbox = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

    const width = viewbox.maxX - viewbox.minX || 1000;
    const height = viewbox.maxY - viewbox.minY || 1000;
    const padding = Math.max(width, height) * 0.05;

    const normX = (x: number) => x - viewbox.minX;
    const normY = (y: number) => height - (y - viewbox.minY);

    const paths: ExtractedPath[] = [];
    const layerCounts: Record<string, number> = {};

    rawEntities.forEach((ent, idx) => {
        let d = "";
        let entVertices: { x: number; y: number }[] = [];
        const isBackground = ent.isBackground;

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
        }

        if (d) {
            const cx = entVertices.reduce((s, v) => s + v.x, 0) / (entVertices.length || 1);
            const cy = entVertices.reduce((s, v) => s + v.y, 0) / (entVertices.length || 1);

            const xs = entVertices.map(v => v.x);
            const ys = entVertices.map(v => v.y);
            const minEx = xs.length ? Math.min(...xs) : 0;
            const maxEx = xs.length ? Math.max(...xs) : 0;
            const minEy = ys.length ? Math.min(...ys) : 0;
            const maxEy = ys.length ? Math.max(...ys) : 0;
            const bboxArea = (maxEx - minEx) * (maxEy - minEy);

            const layer = ent.layer || "0";
            const id = `dxf-${idx}-${layer}`;

            if (!isBackground) {
                paths.push({ id, pathData: d, center: { x: cx, y: cy }, layer, bboxArea });
                layerCounts[layer] = (layerCounts[layer] || 0) + 1;
            }
        }
    });

    const layers: LayerInfo[] = Object.entries(layerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const viewBox = `${(-padding).toFixed(4)} ${(-padding).toFixed(4)} ${(width + padding * 2).toFixed(4)} ${(height + padding * 2).toFixed(4)}`;
    const strokeWidth = width / 1500;

    return { paths, layers, viewBox, strokeWidth };
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
                    sw[0] + (1 - (p.center.y - minY) / sourceHeight) * latDiff
                ]
            }
        }))
    };
}
