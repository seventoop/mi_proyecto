import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const userCountMock = vi.fn();
const userGroupByMock = vi.fn();
const proyectoCountMock = vi.fn();
const proyectoImagenCountMock = vi.fn();
const unidadCountMock = vi.fn();
const bannerCountMock = vi.fn();
const leadCountMock = vi.fn();

vi.mock("@/lib/db", () => ({
    default: {
        user: {
            count: (...args: unknown[]) => userCountMock(...args),
            groupBy: (...args: unknown[]) => userGroupByMock(...args),
        },
        proyecto: {
            count: (...args: unknown[]) => proyectoCountMock(...args),
        },
        proyectoImagen: {
            count: (...args: unknown[]) => proyectoImagenCountMock(...args),
        },
        unidad: {
            count: (...args: unknown[]) => unidadCountMock(...args),
        },
        banner: {
            count: (...args: unknown[]) => bannerCountMock(...args),
        },
        lead: {
            count: (...args: unknown[]) => leadCountMock(...args),
        },
    },
}));

import { GET as getDbUsers } from "@/app/api/debug/db-users/route";
import { GET as getDbCounts } from "@/app/api/debug/db-counts/route";
import { GET as getOauthLinks } from "@/app/api/debug/oauth-links/route";

const DEBUG_TOKEN = "debug-token-for-tests";

function request(path: string, token?: string) {
    const headers = token ? { "x-debug-db-token": token } : undefined;
    return new NextRequest(`http://localhost${path}`, { headers });
}

function resetPrismaMocks() {
    userCountMock.mockReset();
    userGroupByMock.mockReset();
    proyectoCountMock.mockReset();
    proyectoImagenCountMock.mockReset();
    unidadCountMock.mockReset();
    bannerCountMock.mockReset();
    leadCountMock.mockReset();
}

function totalDbCalls() {
    return [
        userCountMock,
        userGroupByMock,
        proyectoCountMock,
        proyectoImagenCountMock,
        unidadCountMock,
        bannerCountMock,
        leadCountMock,
    ].reduce((total, mock) => total + mock.mock.calls.length, 0);
}

async function expectBlockedWithoutDbCall(
    handler: (req: NextRequest) => Promise<Response>,
    path: string,
    status: number,
    token?: string,
) {
    const res = await handler(request(path, token));

    expect(res.status).toBe(status);
    expect(totalDbCalls()).toBe(0);
}

describe("debug API routes", () => {
    beforeEach(() => {
        resetPrismaMocks();
        vi.stubEnv("DEBUG_DB_TOKEN", DEBUG_TOKEN);
        vi.stubEnv("DATABASE_URL", "postgresql://user:password@secret-host:5432/app");
        vi.stubEnv("NODE_ENV", "development");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("responden 404 en producción aunque el header tenga el token correcto", async () => {
        vi.stubEnv("NODE_ENV", "production");

        await expectBlockedWithoutDbCall(getDbUsers, "/api/debug/db-users", 404, DEBUG_TOKEN);
        await expectBlockedWithoutDbCall(getDbCounts, "/api/debug/db-counts", 404, DEBUG_TOKEN);
        await expectBlockedWithoutDbCall(getOauthLinks, "/api/debug/oauth-links", 404, DEBUG_TOKEN);
    });

    it("bloquean en desarrollo si falta el header", async () => {
        await expectBlockedWithoutDbCall(getDbUsers, "/api/debug/db-users", 403);
        await expectBlockedWithoutDbCall(getDbCounts, "/api/debug/db-counts", 403);
        await expectBlockedWithoutDbCall(getOauthLinks, "/api/debug/oauth-links", 403);
    });

    it("bloquean en desarrollo si el header es incorrecto", async () => {
        await expectBlockedWithoutDbCall(getDbUsers, "/api/debug/db-users", 403, "wrong-token");
        await expectBlockedWithoutDbCall(getDbCounts, "/api/debug/db-counts", 403, "wrong-token");
        await expectBlockedWithoutDbCall(getOauthLinks, "/api/debug/oauth-links", 403, "wrong-token");
    });

    it("no autentican con ?token= aunque el valor sea correcto", async () => {
        await expectBlockedWithoutDbCall(
            getDbUsers,
            `/api/debug/db-users?token=${DEBUG_TOKEN}`,
            403,
        );
        await expectBlockedWithoutDbCall(
            getDbCounts,
            `/api/debug/db-counts?token=${DEBUG_TOKEN}`,
            403,
        );
        await expectBlockedWithoutDbCall(
            getOauthLinks,
            `/api/debug/oauth-links?token=${DEBUG_TOKEN}`,
            403,
        );
    });

    it("permite db-users en desarrollo con header correcto y no expone emails ni hashes", async () => {
        userCountMock
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(1);
        userGroupByMock.mockResolvedValueOnce([
            { rol: "ADMIN", _count: { _all: 1 } },
            { rol: "USER", _count: { _all: 2 } },
        ]);

        const res = await getDbUsers(request("/api/debug/db-users", DEBUG_TOKEN));
        const body = await res.json();
        const serialized = JSON.stringify(body);

        expect(res.status).toBe(200);
        expect(body).toEqual({
            ok: true,
            count: 3,
            byRole: [
                { role: "ADMIN", count: 1 },
                { role: "USER", count: 2 },
            ],
            accountLinks: {
                withPassword: 2,
                withGoogle: 1,
            },
        });
        expect(serialized).not.toContain("@");
        expect(serialized).not.toContain("passwordHash");
        expect(serialized).not.toContain("google-id");
        expect(body.users).toBeUndefined();
    });

    it("permite oauth-links en desarrollo con header correcto y minimiza datos OAuth", async () => {
        userCountMock.mockResolvedValueOnce(2);

        const res = await getOauthLinks(request("/api/debug/oauth-links", DEBUG_TOKEN));
        const body = await res.json();
        const serialized = JSON.stringify(body);

        expect(res.status).toBe(200);
        expect(body).toEqual({ ok: true, googleLinkedUsers: 2 });
        expect(serialized).not.toContain("@");
        expect(serialized).not.toContain("providerAccountId");
        expect(serialized).not.toContain("google-id");
        expect(body.users).toBeUndefined();
    });

    it("permite db-counts en desarrollo con header correcto sin exponer host ni secretos", async () => {
        userCountMock
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(2);
        proyectoCountMock.mockResolvedValueOnce(7).mockResolvedValueOnce(4);
        proyectoImagenCountMock.mockResolvedValueOnce(8);
        unidadCountMock.mockResolvedValueOnce(9);
        bannerCountMock.mockResolvedValueOnce(10).mockResolvedValueOnce(6);
        leadCountMock.mockResolvedValueOnce(11);

        const res = await getDbCounts(request("/api/debug/db-counts", DEBUG_TOKEN));
        const body = await res.json();
        const serialized = JSON.stringify(body);

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.db).toBeUndefined();
        expect(body.counts).toMatchObject({
            users: 5,
            usersConPassword: 3,
            usersConGoogle: 2,
            proyectos: 7,
            proyectosVisiblesEnLanding: 4,
            proyectoImagenes: 8,
            unidades: 9,
            banners: 10,
            bannersPublicadosLanding: 6,
            leads: 11,
        });
        expect(serialized).not.toContain("secret-host");
        expect(serialized).not.toContain("password");
        expect(serialized).not.toContain("postgresql://");
    });
});
