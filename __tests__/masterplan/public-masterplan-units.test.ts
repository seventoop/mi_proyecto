import { describe, expect, it } from "vitest";
import { parseMasterplanGeoJSON, parseMasterplanOverlayBounds } from "@/lib/masterplan-geo";
import {
    buildPublicMasterplanUnits,
    getPublicMasterplanGeometryState,
    type PublicMasterplanUnitInput,
} from "@/lib/public-masterplan-units";

function unit(overrides: Partial<PublicMasterplanUnitInput>): PublicMasterplanUnitInput {
    return {
        id: "unit-1",
        numero: "1",
        tipo: "LOTE",
        superficie: null,
        frente: null,
        fondo: null,
        esEsquina: false,
        orientacion: null,
        precio: null,
        moneda: "USD",
        estado: "DISPONIBLE",
        geoJSON: null,
        coordenadasMasterplan: null,
        ...overrides,
    };
}

describe("public masterplan unit geometry", () => {
    it("preserves valid geographic GeoJSON for the map polygon layer", () => {
        const geoJSON = JSON.stringify({
            type: "Polygon",
            coordinates: [[
                [-58.382, -34.604],
                [-58.381, -34.604],
                [-58.381, -34.603],
                [-58.382, -34.604],
            ]],
        });

        const [mapped] = buildPublicMasterplanUnits([
            unit({
                id: "lot-with-geojson",
                numero: "A1",
                geoJSON,
                coordenadasMasterplan: JSON.stringify({ path: "M 0 0 L 10 0 L 10 10 Z", cx: 5, cy: 5 }),
            }),
        ]);

        expect(mapped.geoJSON).toBe(geoJSON);
        expect(parseMasterplanGeoJSON(mapped.geoJSON)).toEqual([
            [-34.604, -58.382],
            [-34.604, -58.381],
            [-34.603, -58.381],
            [-34.604, -58.382],
        ]);
        expect(mapped.path).toBe("M 0 0 L 10 0 L 10 10 Z");
        expect(mapped.cx).toBe(5);
        expect(mapped.cy).toBe(5);
    });

    it("does not treat visual SVG coordinates as GeoJSON and keeps SVGGeo fallback inputs", () => {
        const visualCoordinates = JSON.stringify({ path: "M 1 2 L 9 2 L 9 8 Z", cx: 5, cy: 4 });

        const [mapped] = buildPublicMasterplanUnits([
            unit({
                id: "visual-only-lot",
                numero: "B2",
                geoJSON: visualCoordinates,
                coordenadasMasterplan: visualCoordinates,
            }),
        ]);

        expect(mapped.geoJSON).toBeNull();
        expect(mapped.path).toBe("M 1 2 L 9 2 L 9 8 Z");
        expect(mapped.cx).toBe(5);
        expect(mapped.cy).toBe(4);
        const overlay = parseMasterplanOverlayBounds(JSON.stringify([[-34.61, -58.39], [-34.6, -58.38]]));
        expect(Boolean(mapped.path && !mapped.geoJSON && overlay.bounds)).toBe(true);
    });

    it("rejects GeoJSON Point as a polygon source", () => {
        const point = JSON.stringify({ type: "Point", coordinates: [-58.9145, -34.4587] });

        const [mapped] = buildPublicMasterplanUnits([
            unit({
                id: "point-only",
                numero: "P1",
                geoJSON: point,
            }),
        ]);

        expect(mapped.geoJSON).toBeNull();
        expect(parseMasterplanGeoJSON(point)).toBeNull();
    });

    it("keeps metadata-only masterplan coordinates out of visual geometry", () => {
        const [mapped] = buildPublicMasterplanUnits([
            unit({
                id: "metadata-only",
                numero: "M1",
                geoJSON: JSON.stringify({ type: "Point", coordinates: [-58.9145, -34.4587] }),
                coordenadasMasterplan: JSON.stringify({ stage: "Etapa 1", block: "A", lotLabel: "1" }),
            }),
        ]);

        expect(mapped.geoJSON).toBeNull();
        expect(mapped.path).toBeUndefined();
        expect(mapped.cx).toBeUndefined();
        expect(mapped.cy).toBeUndefined();
    });

    it("does not throw when optional geometry fields are missing", () => {
        expect(() => buildPublicMasterplanUnits([unit({ id: "empty", numero: "0" })])).not.toThrow();

        const [mapped] = buildPublicMasterplanUnits([unit({ id: "empty", numero: "0" })]);

        expect(mapped.geoJSON).toBeNull();
        expect(mapped.path).toBeUndefined();
        expect(mapped.cx).toBeUndefined();
        expect(mapped.cy).toBeUndefined();
    });

    it("keeps lots, streets, and visual references available to the renderer", () => {
        const mapped = buildPublicMasterplanUnits([
            unit({
                id: "lot",
                numero: "1",
                tipo: "LOTE",
                coordenadasMasterplan: JSON.stringify({ path: "M 0 0 L 10 0 L 10 10 Z", cx: 5, cy: 5 }),
            }),
            unit({
                id: "street",
                numero: "Calle 1",
                tipo: "CALLE",
                coordenadasMasterplan: JSON.stringify({ path: "M 20 0 L 30 0 L 30 4 Z", cx: 25, cy: 2 }),
            }),
            unit({
                id: "reference",
                numero: "Plaza",
                tipo: "REFERENCIA",
                coordenadasMasterplan: JSON.stringify({ path: "M 40 0 L 50 0 L 50 8 Z", cx: 45, cy: 4 }),
            }),
        ]);

        expect(mapped).toHaveLength(3);
        expect(mapped.map((item) => item.tipo)).toEqual(["LOTE", "CALLE", "REFERENCIA"]);
        expect(mapped.map((item) => item.path)).toEqual([
            "M 0 0 L 10 0 L 10 10 Z",
            "M 20 0 L 30 0 L 30 4 Z",
            "M 40 0 L 50 0 L 50 8 Z",
        ]);
        expect(mapped.every((item) => item.geoJSON === null)).toBe(true);
    });

    it("does not enable SVGGeo fallback without overlay bounds", () => {
        const [mapped] = buildPublicMasterplanUnits([
            unit({
                id: "visual-without-overlay",
                numero: "V1",
                coordenadasMasterplan: JSON.stringify({ path: "M 0 0 L 10 0 L 10 10 Z", cx: 5, cy: 5 }),
            }),
        ]);

        const state = getPublicMasterplanGeometryState(
            [mapped],
            { bounds: null, corners: null },
            true,
        );

        expect(state.visualPathCount).toBe(1);
        expect(state.canUseSvgGeoFallback).toBe(false);
        expect(state.canRenderMapPolygons).toBe(false);
    });

    it("keeps the SVG base renderable when interactive geometry is absent", () => {
        const mapped = buildPublicMasterplanUnits([
            unit({
                id: "prod-like",
                numero: "1",
                geoJSON: JSON.stringify({ type: "Point", coordinates: [-58.9145, -34.4587] }),
                coordenadasMasterplan: JSON.stringify({ stage: "Etapa 1", block: "A", lotLabel: "1" }),
            }),
        ]);

        const state = getPublicMasterplanGeometryState(
            mapped,
            parseMasterplanOverlayBounds(JSON.stringify([[-34.459, -58.915], [-34.458, -58.914]])),
            true,
        );

        expect(state.hasBaseSvg).toBe(true);
        expect(state.totalUnits).toBe(1);
        expect(state.geographicPolygonCount).toBe(0);
        expect(state.visualPathCount).toBe(0);
        expect(state.hasInteractiveGeometry).toBe(false);
        expect(state.canRenderMapPolygons).toBe(false);
    });

    it("supports SVGGeo fallback only with valid path and overlay bounds", () => {
        const [mapped] = buildPublicMasterplanUnits([
            unit({
                id: "visual-with-overlay",
                numero: "V2",
                coordenadasMasterplan: JSON.stringify({ path: "M 0 0 L 10 0 L 10 10 Z", cx: 5, cy: 5 }),
            }),
        ]);

        const state = getPublicMasterplanGeometryState(
            [mapped],
            parseMasterplanOverlayBounds(JSON.stringify([[-34.459, -58.915], [-34.458, -58.914]])),
            true,
        );

        expect(state.visualPathCount).toBe(1);
        expect(state.canUseSvgGeoFallback).toBe(true);
        expect(state.canRenderMapPolygons).toBe(true);
    });
});
