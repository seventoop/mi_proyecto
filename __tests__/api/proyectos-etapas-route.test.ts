import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "@/lib/auth-types";

const requireProjectOwnershipMock = vi.fn();
const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/lib/db", () => ({
    default: {
        etapa: {
            findMany: (...args: unknown[]) => findManyMock(...args),
            findFirst: (...args: unknown[]) => findFirstMock(...args),
            create: (...args: unknown[]) => createMock(...args),
        },
    },
}));

vi.mock("@/lib/guards", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/guards")>();
    return {
        ...actual,
        requireProjectOwnership: (...args: unknown[]) => requireProjectOwnershipMock(...args),
    };
});

import { GET, POST } from "@/app/api/proyectos/[id]/etapas/route";

const PROJECT_ID = "clxproject00000000000000000";
const OTHER_PROJECT_ID = "clxotherpr0000000000000000";

function params(id = PROJECT_ID) {
    return { params: { id } };
}

function postRequest(body: unknown) {
    return new Request("http://localhost/api/proyectos/clxproject00000000000000000/etapas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("app/api/proyectos/[id]/etapas route", () => {
    beforeEach(() => {
        requireProjectOwnershipMock.mockReset();
        findManyMock.mockReset();
        findFirstMock.mockReset();
        createMock.mockReset();
    });

    it("rechaza GET sin autenticación antes de leer etapas", async () => {
        requireProjectOwnershipMock.mockRejectedValueOnce(new AuthError("No autorizado", 401));

        const res = await GET(new Request("http://localhost"), params());

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "No autorizado" });
        expect(requireProjectOwnershipMock).toHaveBeenCalledWith(PROJECT_ID);
        expect(findManyMock).not.toHaveBeenCalled();
    });

    it("rechaza POST sin autenticación antes de leer o crear etapas", async () => {
        requireProjectOwnershipMock.mockRejectedValueOnce(new AuthError("No autorizado", 401));

        const res = await POST(postRequest({ nombre: "Etapa 1" }), params());

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "No autorizado" });
        expect(requireProjectOwnershipMock).toHaveBeenCalledWith(PROJECT_ID);
        expect(findFirstMock).not.toHaveBeenCalled();
        expect(createMock).not.toHaveBeenCalled();
    });

    it("permite GET a un usuario con acceso válido al proyecto", async () => {
        requireProjectOwnershipMock.mockResolvedValueOnce({
            id: "user-1",
            role: "DESARROLLADOR",
            orgId: "org-1",
        });
        const etapas = [{ id: "clxetapa00000000000000000", nombre: "Etapa 1" }];
        findManyMock.mockResolvedValueOnce(etapas);

        const res = await GET(new Request("http://localhost"), params());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual(etapas);
        expect(requireProjectOwnershipMock).toHaveBeenCalledWith(PROJECT_ID);
        expect(findManyMock).toHaveBeenCalledWith({
            where: { proyectoId: PROJECT_ID },
            include: {
                manzanas: {
                    include: {
                        _count: { select: { unidades: true } },
                    },
                },
            },
            orderBy: { orden: "asc" },
        });
    });

    it("permite POST a un usuario con acceso válido al proyecto", async () => {
        requireProjectOwnershipMock.mockResolvedValueOnce({
            id: "user-1",
            role: "DESARROLLADOR",
            orgId: "org-1",
        });
        findFirstMock.mockResolvedValueOnce({ orden: 2 });
        const created = {
            id: "clxetapa00000000000000000",
            proyectoId: PROJECT_ID,
            nombre: "Etapa 3",
            orden: 3,
            estado: "PENDIENTE",
        };
        createMock.mockResolvedValueOnce(created);

        const res = await POST(postRequest({ nombre: "Etapa 3" }), params());

        expect(res.status).toBe(201);
        await expect(res.json()).resolves.toEqual(created);
        expect(requireProjectOwnershipMock).toHaveBeenCalledWith(PROJECT_ID);
        expect(findFirstMock).toHaveBeenCalledWith({
            where: { proyectoId: PROJECT_ID },
            orderBy: { orden: "desc" },
            select: { orden: true },
        });
        expect(createMock).toHaveBeenCalledWith({
            data: {
                proyectoId: PROJECT_ID,
                nombre: "Etapa 3",
                orden: 3,
                estado: "PENDIENTE",
            },
        });
    });

    it("bloquea usuario de otra organización o sin acceso antes de leer etapas", async () => {
        requireProjectOwnershipMock.mockRejectedValueOnce(
            new AuthError("Proyecto no encontrado", 404),
        );

        const res = await GET(new Request("http://localhost"), params(OTHER_PROJECT_ID));

        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toEqual({ error: "Proyecto no encontrado" });
        expect(requireProjectOwnershipMock).toHaveBeenCalledWith(OTHER_PROJECT_ID);
        expect(findManyMock).not.toHaveBeenCalled();
    });

    it("permite GET a ADMIN según el bypass real de requireProjectOwnership", async () => {
        requireProjectOwnershipMock.mockResolvedValueOnce({
            id: "admin-1",
            role: "ADMIN",
            orgId: null,
        });
        findManyMock.mockResolvedValueOnce([]);

        const res = await GET(new Request("http://localhost"), params());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual([]);
        expect(requireProjectOwnershipMock).toHaveBeenCalledWith(PROJECT_ID);
        expect(findManyMock).toHaveBeenCalledTimes(1);
    });

    it("permite POST a SUPERADMIN según el bypass real de requireProjectOwnership", async () => {
        requireProjectOwnershipMock.mockResolvedValueOnce({
            id: "superadmin-1",
            role: "SUPERADMIN",
            orgId: null,
        });
        findFirstMock.mockResolvedValueOnce(null);
        const created = {
            id: "clxetapa00000000000000000",
            proyectoId: PROJECT_ID,
            nombre: "Etapa inicial",
            orden: 1,
            estado: "ACTIVA",
        };
        createMock.mockResolvedValueOnce(created);

        const res = await POST(
            postRequest({ nombre: "Etapa inicial", estado: "ACTIVA" }),
            params(),
        );

        expect(res.status).toBe(201);
        await expect(res.json()).resolves.toEqual(created);
        expect(requireProjectOwnershipMock).toHaveBeenCalledWith(PROJECT_ID);
        expect(createMock).toHaveBeenCalledWith({
            data: {
                proyectoId: PROJECT_ID,
                nombre: "Etapa inicial",
                orden: 1,
                estado: "ACTIVA",
            },
        });
    });
});
