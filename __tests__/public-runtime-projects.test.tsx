import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn());
const getBannersLandingMock = vi.hoisted(() => vi.fn());
const getSystemConfigMock = vi.hoisted(() => vi.fn());
const listPublicProjectCardsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
    default: {
        proyecto: {
            findMany: (...args: unknown[]) => findManyMock(...args),
        },
    },
}));

vi.mock("@/lib/public-projects", () => ({
    buildPublicProjectWhere: () => ({ visibilityStatus: "PUBLICADO" }),
}));

vi.mock("@/lib/actions/banners", () => ({
    getBannersLanding: (...args: unknown[]) => getBannersLandingMock(...args),
}));

vi.mock("@/lib/actions/configuration", () => ({
    getSystemConfig: (...args: unknown[]) => getSystemConfigMock(...args),
}));

vi.mock("@/lib/project-showcase", () => ({
    listPublicProjectCards: (...args: unknown[]) => listPublicProjectCardsMock(...args),
}));

vi.mock("@/components/public/hero", () => ({
    default: () => React.createElement("div", { "data-testid": "hero" }),
}));

vi.mock("@/components/public/media-banner", () => ({
    default: () => React.createElement("div", { "data-testid": "media-banner" }),
}));

vi.mock("@/components/public/exploracion", () => ({
    default: () => React.createElement("div", { "data-testid": "exploracion" }),
}));

vi.mock("@/components/public/formulario-captura", () => ({
    default: () => React.createElement("div", { "data-testid": "formulario-captura" }),
}));

vi.mock("@/components/public/proyectos-destacados", () => ({
    default: () => React.createElement("div", { "data-testid": "proyectos-destacados" }),
}));

vi.mock("@/components/public/como-funciona", () => ({
    default: () => React.createElement("div", { "data-testid": "como-funciona" }),
}));

vi.mock("@/components/public/para-desarrolladores", () => ({
    default: () => React.createElement("div", { "data-testid": "para-desarrolladores" }),
}));

vi.mock("@/components/public/comunidad", () => ({
    default: () => React.createElement("div", { "data-testid": "comunidad" }),
}));

vi.mock("@/components/public/testimonials-section", () => ({
    default: () => React.createElement("div", { "data-testid": "testimonials-section" }),
}));

vi.mock("@/components/public/noticias", () => ({
    default: () => React.createElement("div", { "data-testid": "noticias" }),
}));

vi.mock("@/components/public/floating-nav", () => ({
    default: () => React.createElement("div", { "data-testid": "floating-nav" }),
}));

vi.mock("@/components/public/projects-filter", () => ({
    default: () => React.createElement("div", { "data-testid": "projects-filter" }),
}));

vi.mock("next/link", () => ({
    default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
        React.createElement("a", { href, ...props }, children),
}));

vi.mock("lucide-react", () => ({
    Building2: () => React.createElement("span", { "data-testid": "building-icon" }),
    ArrowRight: () => React.createElement("span", { "data-testid": "arrow-icon" }),
}));

import HomePage, { dynamic as homeDynamic } from "@/app/(public)/page";
import ProjectsPage, { dynamic as projectsDynamic } from "@/app/(public)/proyectos/page";

function sensitiveError() {
    return Object.assign(
        new Error("connect failed: postgresql://user:super-secret@secret-host:5432/seventoop"),
        { code: "P1001" },
    );
}

afterEach(() => {
    findManyMock.mockReset();
    getBannersLandingMock.mockReset();
    getSystemConfigMock.mockReset();
    listPublicProjectCardsMock.mockReset();
    vi.restoreAllMocks();
});

describe("public project pages runtime behavior", () => {
    it("declaran render dinamico para consultar proyectos en runtime", () => {
        expect(homeDynamic).toBe("force-dynamic");
        expect(projectsDynamic).toBe("force-dynamic");
    });

    it("registra errores seguros cuando falla la consulta de proyectos destacados", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        findManyMock.mockRejectedValueOnce(sensitiveError());
        getBannersLandingMock.mockResolvedValueOnce({ success: true, data: [] });
        getSystemConfigMock.mockResolvedValue(null);

        await HomePage();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[public-home] project query failed",
            expect.objectContaining({
                event: "public_project_query_failed",
                route: "/",
                query: "getProyectosDestacados",
                errorName: "Error",
                prismaCode: "P1001",
            }),
        );
        const serializedLogs = JSON.stringify(consoleErrorSpy.mock.calls);
        expect(serializedLogs).not.toContain("postgresql://");
        expect(serializedLogs).not.toContain("super-secret");
        expect(serializedLogs).not.toContain("secret-host");
    });

    it("registra errores seguros cuando falla la consulta del listado publico", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        listPublicProjectCardsMock.mockRejectedValueOnce(sensitiveError());

        await ProjectsPage();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[public-projects] project query failed",
            expect.objectContaining({
                event: "public_project_query_failed",
                route: "/proyectos",
                query: "getProjects",
                errorName: "Error",
                prismaCode: "P1001",
            }),
        );
        const serializedLogs = JSON.stringify(consoleErrorSpy.mock.calls);
        expect(serializedLogs).not.toContain("postgresql://");
        expect(serializedLogs).not.toContain("super-secret");
        expect(serializedLogs).not.toContain("secret-host");
    });
});
