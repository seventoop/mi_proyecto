import { afterEach, describe, expect, it, vi } from "vitest";

const proyectoFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => {
    const prismaMock = {
        proyecto: {
            findMany: (...args: unknown[]) => proyectoFindManyMock(...args),
        },
    };

    return {
        default: prismaMock,
        db: prismaMock,
    };
});

vi.mock("@/lib/public-projects", () => ({
    buildPublicProjectWhere: () => ({ visibilityStatus: "PUBLICADO" }),
    isUnitAvailableForPublic: () => true,
    NORMALIZED_UNIT_ESTADO: {
        RESERVADA: "RESERVADA",
        VENDIDA: "VENDIDA",
    },
    normalizeUnitEstado: (estado: string) => estado,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { getProyectosDestacados } from "@/lib/actions/proyectos";
import { listPublicProjectCards, listPublicProjectShowcases } from "@/lib/project-showcase";

function sensitiveError() {
    return Object.assign(
        new Error("connect failed: postgresql://user:super-secret@secret-host:5432/seventoop"),
        { code: "P1001" },
    );
}

afterEach(() => {
    proyectoFindManyMock.mockReset();
    vi.restoreAllMocks();
});

describe("public project loader diagnostics", () => {
    it("logs getProyectosDestacados start, count, and duration without project data", async () => {
        const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
        proyectoFindManyMock.mockResolvedValueOnce([
            {
                id: "project-id",
                nombre: "Proyecto Secreto",
                slug: "proyecto-secreto",
                estado: "ACTIVO",
                tipo: "URBANIZACION",
                imagenPortada: "https://example.test/image.jpg",
                ubicacion: "Ubicacion",
                precioM2Mercado: 10,
            },
        ]);

        await getProyectosDestacados();

        expect(consoleInfoSpy).toHaveBeenCalledWith("[public-project-loader]", {
            event: "public_projects_featured_query_start",
            route: "/",
            function: "getProyectosDestacados",
        });
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            "[public-project-loader]",
            expect.objectContaining({
                event: "public_projects_featured_query_success",
                route: "/",
                function: "getProyectosDestacados",
                count: 1,
                durationMs: expect.any(Number),
            }),
        );

        const serializedLogs = JSON.stringify(consoleInfoSpy.mock.calls);
        expect(serializedLogs).not.toContain("project-id");
        expect(serializedLogs).not.toContain("Proyecto Secreto");
        expect(serializedLogs).not.toContain("proyecto-secreto");
    });

    it("logs sanitized getProyectosDestacados errors and keeps fallback", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        proyectoFindManyMock.mockRejectedValueOnce(sensitiveError());

        const result = await getProyectosDestacados();

        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[public-project-loader]",
            expect.objectContaining({
                event: "public_projects_featured_query_error",
                route: "/",
                function: "getProyectosDestacados",
                durationMs: expect.any(Number),
                errorClass: "Error",
                errorCode: "P1001",
                errorMessage: "connect failed: [redacted-url]",
            }),
        );

        const serializedLogs = JSON.stringify(consoleErrorSpy.mock.calls);
        expect(serializedLogs).not.toContain("postgresql://");
        expect(serializedLogs).not.toContain("super-secret");
        expect(serializedLogs).not.toContain("secret-host");
    });

    it("logs IDs and loaded showcase counts for public showcase loaders", async () => {
        const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
        proyectoFindManyMock.mockResolvedValue([]);

        await expect(listPublicProjectShowcases()).resolves.toEqual([]);
        await expect(listPublicProjectCards()).resolves.toEqual([]);

        expect(consoleInfoSpy).toHaveBeenCalledWith(
            "[public-project-loader]",
            expect.objectContaining({
                event: "public_project_showcases_ids_loaded",
                route: "/proyectos",
                function: "listPublicProjectShowcases",
                count: 0,
                durationMs: expect.any(Number),
            }),
        );
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            "[public-project-loader]",
            expect.objectContaining({
                event: "public_project_showcases_loaded",
                route: "/proyectos",
                function: "listPublicProjectShowcases",
                count: 0,
                durationMs: expect.any(Number),
            }),
        );
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            "[public-project-loader]",
            expect.objectContaining({
                event: "public_project_cards_loaded",
                route: "/proyectos",
                function: "listPublicProjectCards",
                count: 0,
                durationMs: expect.any(Number),
            }),
        );
    });

    it("logs sanitized showcase loader errors and rethrows for existing caller fallback", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        proyectoFindManyMock.mockRejectedValueOnce(sensitiveError());

        await expect(listPublicProjectCards()).rejects.toThrow("connect failed");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[public-project-loader]",
            expect.objectContaining({
                event: "public_project_showcases_error",
                route: "/proyectos",
                function: "listPublicProjectShowcases",
                count: 0,
                durationMs: expect.any(Number),
                errorClass: "Error",
                errorCode: "P1001",
                errorMessage: "connect failed: [redacted-url]",
            }),
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[public-project-loader]",
            expect.objectContaining({
                event: "public_project_cards_error",
                route: "/proyectos",
                function: "listPublicProjectCards",
                count: 0,
                durationMs: expect.any(Number),
                errorClass: "Error",
                errorCode: "P1001",
                errorMessage: "connect failed: [redacted-url]",
            }),
        );

        const serializedLogs = JSON.stringify(consoleErrorSpy.mock.calls);
        expect(serializedLogs).not.toContain("postgresql://");
        expect(serializedLogs).not.toContain("super-secret");
        expect(serializedLogs).not.toContain("secret-host");
    });
});
