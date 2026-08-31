import type { MasterplanUnit } from "@/lib/masterplan-store";
import {
    parseMasterplanGeoJSON,
    parseVisualMasterplanCoordinates,
    svgPathHasPolygonGeometry,
    type ParsedOverlayBounds,
} from "@/lib/masterplan-geo";

export type PublicMasterplanUnitInput = Omit<MasterplanUnit, "estado"> & {
    estado: string;
};

export function buildPublicMasterplanUnits(units: PublicMasterplanUnitInput[]): MasterplanUnit[] {
    return units.map((unit): MasterplanUnit => {
        const visualCoordinates = parseVisualMasterplanCoordinates(unit.coordenadasMasterplan);
        const validGeoJSON = parseMasterplanGeoJSON(unit.geoJSON) ? unit.geoJSON : null;

        return {
            ...unit,
            estado: unit.estado as MasterplanUnit["estado"],
            path: visualCoordinates?.path,
            cx: visualCoordinates?.cx ?? visualCoordinates?.center?.x,
            cy: visualCoordinates?.cy ?? visualCoordinates?.center?.y,
            geoJSON: validGeoJSON,
        };
    });
}

export function getPublicMasterplanGeometryState(
    units: MasterplanUnit[],
    overlay: ParsedOverlayBounds,
    hasBaseSvg: boolean
) {
    const geographicPolygonCount = units.filter((unit) => parseMasterplanGeoJSON(unit.geoJSON)).length;
    const visualPathCount = units.filter((unit) => svgPathHasPolygonGeometry(unit.path)).length;
    const canUseSvgGeoFallback = visualPathCount > 0 && Boolean(overlay.bounds || overlay.corners);

    return {
        hasBaseSvg,
        totalUnits: units.length,
        geographicPolygonCount,
        visualPathCount,
        canUseSvgGeoFallback,
        hasInteractiveGeometry: geographicPolygonCount > 0 || visualPathCount > 0,
        canRenderMapPolygons: geographicPolygonCount > 0 || canUseSvgGeoFallback,
    };
}
