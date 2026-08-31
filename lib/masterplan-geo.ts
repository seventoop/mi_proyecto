export type LatLngTuple = [number, number];

export type VisualMasterplanCoordinates = {
    path?: string;
    cx?: number;
    cy?: number;
    center?: {
        x?: number;
        y?: number;
    };
    internalId?: string | number;
    lotLabel?: string;
};

export type OverlayCorners = [LatLngTuple, LatLngTuple, LatLngTuple, LatLngTuple];

export type ParsedOverlayBounds = {
    bounds: [LatLngTuple, LatLngTuple] | null;
    corners: OverlayCorners | null;
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isLatLngTuple(value: unknown): value is LatLngTuple {
    return (
        Array.isArray(value) &&
        value.length >= 2 &&
        isFiniteNumber(value[0]) &&
        isFiniteNumber(value[1])
    );
}

function isOverlayBounds(value: unknown): value is [LatLngTuple, LatLngTuple] {
    return Array.isArray(value) && value.length === 2 && isLatLngTuple(value[0]) && isLatLngTuple(value[1]);
}

function isOverlayCorners(value: unknown): value is OverlayCorners {
    return Array.isArray(value) && value.length === 4 && value.every(isLatLngTuple);
}

function coordinatesToLatLngs(coordinates: unknown): LatLngTuple[] | null {
    if (!Array.isArray(coordinates) || coordinates.length < 3) return null;

    const points = coordinates
        .map((coordinate) => {
            if (!isLatLngTuple(coordinate)) return null;
            const [lng, lat] = coordinate;
            return [lat, lng] satisfies LatLngTuple;
        })
        .filter((coordinate): coordinate is LatLngTuple => coordinate !== null);

    return points.length >= 3 ? points : null;
}

export function svgPathHasPolygonGeometry(path: string | null | undefined): path is string {
    if (!path || typeof path !== "string") return false;
    const vertices = path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
    return Boolean(vertices && vertices.length >= 6);
}

export function parseMasterplanGeoJSON(raw: string | null | undefined): LatLngTuple[] | null {
    if (!raw) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!parsed || typeof parsed !== "object") return null;

    if (Array.isArray(parsed)) {
        return parsed.every(isLatLngTuple) && parsed.length >= 3 ? parsed : null;
    }

    const candidate = parsed as { type?: unknown; coordinates?: unknown; geometry?: unknown };
    const type = typeof candidate.type === "string" ? candidate.type : null;

    if (type === "Polygon" && Array.isArray(candidate.coordinates)) {
        return coordinatesToLatLngs(candidate.coordinates[0]);
    }

    if (type === "MultiPolygon" && Array.isArray(candidate.coordinates)) {
        return coordinatesToLatLngs(candidate.coordinates[0]?.[0]);
    }

    if (type === "Feature" && candidate.geometry && typeof candidate.geometry === "object") {
        return parseMasterplanGeoJSON(JSON.stringify(candidate.geometry));
    }

    return null;
}

export function parseVisualMasterplanCoordinates(
    raw: string | null | undefined
): VisualMasterplanCoordinates | null {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as VisualMasterplanCoordinates;
        if (!parsed || typeof parsed !== "object" || !svgPathHasPolygonGeometry(parsed.path)) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function parseMasterplanOverlayBounds(raw: string | null | undefined): ParsedOverlayBounds {
    if (!raw) return { bounds: null, corners: null };

    try {
        const parsed = JSON.parse(raw) as unknown;

        if (isOverlayBounds(parsed)) {
            return { bounds: parsed, corners: null };
        }

        if (parsed && typeof parsed === "object") {
            const candidate = parsed as { bounds?: unknown; corners?: unknown };
            return {
                bounds: isOverlayBounds(candidate.bounds) ? candidate.bounds : null,
                corners: isOverlayCorners(candidate.corners) ? candidate.corners : null,
            };
        }
    } catch {
        return { bounds: null, corners: null };
    }

    return { bounds: null, corners: null };
}
