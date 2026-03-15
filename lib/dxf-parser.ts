/**
 * Minimal DXF parser — extracts LWPOLYLINE / POLYLINE entities and TEXT labels.
 * No external deps. Handles basic 2D floor plans exported from AutoCAD/DraftSight.
 */

export interface ParsedLote {
    numero: string;
    points: Array<{ x: number; y: number }>;
}

interface RawEntity {
    type: string;
    vertices: Array<{ x: number; y: number }>;
    layer?: string;
}

interface TextEntity {
    x: number;
    y: number;
    text: string;
}

// ── Tokenize DXF into [code, value] pairs ───────────────────────────────────
function tokenize(content: string): Array<[number, string]> {
    const tokens: Array<[number, string]> = [];
    const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    for (let i = 0; i < lines.length - 1; i += 2) {
        const code = parseInt(lines[i].trim(), 10);
        const value = lines[i + 1]?.trim() ?? "";
        if (!isNaN(code)) tokens.push([code, value]);
    }
    return tokens;
}

// ── Extract ENTITIES section ─────────────────────────────────────────────────
function extractEntitiesSection(tokens: Array<[number, string]>): Array<[number, string]> {
    let inEntities = false;
    const result: Array<[number, string]> = [];
    for (const [code, val] of tokens) {
        if (code === 2 && val === "ENTITIES") { inEntities = true; continue; }
        if (inEntities && code === 0 && val === "ENDSEC") break;
        if (inEntities) result.push([code, val]);
    }
    return result;
}

// ── Parse polylines ──────────────────────────────────────────────────────────
function parsePolylines(tokens: Array<[number, string]>): RawEntity[] {
    const entities: RawEntity[] = [];
    let current: RawEntity | null = null;
    let cx = 0, cy = 0;

    for (const [code, val] of tokens) {
        if (code === 0) {
            if (current && current.vertices.length >= 3) entities.push(current);
            if (val === "LWPOLYLINE" || val === "POLYLINE") {
                current = { type: val, vertices: [] };
            } else {
                current = null;
            }
        } else if (current) {
            if (code === 8) current.layer = val;
            if (code === 10) cx = parseFloat(val);
            if (code === 20) { cy = parseFloat(val); current.vertices.push({ x: cx, y: cy }); }
        }
    }
    if (current && current.vertices.length >= 3) entities.push(current);
    return entities;
}

// ── Parse text labels ────────────────────────────────────────────────────────
function parseTexts(tokens: Array<[number, string]>): TextEntity[] {
    const texts: TextEntity[] = [];
    let inText = false;
    let x = 0, y = 0, text = "";

    for (const [code, val] of tokens) {
        if (code === 0) {
            if (inText && text) texts.push({ x, y, text });
            inText = val === "TEXT" || val === "MTEXT";
            x = 0; y = 0; text = "";
        } else if (inText) {
            if (code === 10) x = parseFloat(val);
            if (code === 20) y = parseFloat(val);
            if (code === 1 || code === 3) text += val;
        }
    }
    if (inText && text) texts.push({ x, y, text });
    return texts;
}

// ── Centroid ──────────────────────────────────────────────────────────────────
function centroid(pts: Array<{ x: number; y: number }>) {
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    return { cx, cy };
}

// ── Main export ───────────────────────────────────────────────────────────────
export function parseDXF(content: string): ParsedLote[] {
    const tokens = tokenize(content);
    const entityTokens = extractEntitiesSection(tokens);

    if (entityTokens.length === 0) {
        // Fallback: parse the whole file as entities
        const polys = parsePolylines(tokens);
        const texts = parseTexts(tokens);
        return assignNumbers(polys, texts);
    }

    const polys = parsePolylines(entityTokens);
    const texts = parseTexts(entityTokens);
    return assignNumbers(polys, texts);
}

function assignNumbers(polys: RawEntity[], texts: TextEntity[]): ParsedLote[] {
    // Normalize coordinates: find bounding box
    if (polys.length === 0) return [];

    const allPts = polys.flatMap(p => p.vertices);
    const minX = Math.min(...allPts.map(p => p.x));
    const minY = Math.min(...allPts.map(p => p.y));

    const normalize = (pts: Array<{ x: number; y: number }>) =>
        pts.map(p => ({ x: p.x - minX, y: p.y - minY }));

    return polys.map((poly, idx) => {
        const { cx, cy } = centroid(poly.vertices);

        // Find closest text label to centroid
        let best = "";
        let bestDist = Infinity;
        for (const t of texts) {
            const d = Math.hypot(t.x - cx, t.y - cy);
            if (d < bestDist) { bestDist = d; best = t.text; }
        }

        // Extract numeric part if label exists
        const numMatch = best.match(/\d+/);
        const numero = numMatch ? numMatch[0] : String(idx + 1);

        return { numero, points: normalize(poly.vertices) };
    });
}
