import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const findUniqueMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/db", () => ({
    default: {
        user: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
            update: (...args: unknown[]) => updateMock(...args),
        },
    },
}));

vi.mock("bcryptjs", () => ({
    default: { compare: vi.fn() },
    compare: vi.fn(),
}));

vi.mock("@/lib/auth/google-pre-registration", () => ({
    createGooglePreRegistrationToken: vi.fn(),
}));

import { authOptions } from "@/lib/auth";

type JwtArgs = {
    token: Record<string, unknown>;
    user?: Record<string, unknown> | null;
    account?: Record<string, unknown> | null;
    profile?: Record<string, unknown>;
    trigger?: "signIn" | "signUp" | "update";
    isNewUser?: boolean;
    session?: unknown;
};

type JwtFn = (args: JwtArgs) => Promise<Record<string, unknown>>;

function getJwt(): JwtFn {
    const fn = authOptions.callbacks?.jwt;
    if (!fn) throw new Error("jwt callback not defined");
    return fn as unknown as JwtFn;
}

describe("authOptions callbacks — jwt() (refresco de datos del usuario)", () => {
    beforeEach(() => {
        findUniqueMock.mockReset();
        updateMock.mockReset();
        vi.useFakeTimers();
        // Anchor "now" at a deterministic timestamp so lastDbSync values are
        // predictable across tests.
        vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("primer login (con `user` presente)", () => {
        it("enriquece el token con datos de DB y setea lastDbSync cuando user.role no está definido", async () => {
            findUniqueMock.mockResolvedValueOnce({
                rol: "INVERSOR",
                orgId: "org-xyz",
                kycStatus: "APPROVED",
                demoEndsAt: new Date("2026-12-31T00:00:00.000Z"),
                email: "user@example.com",
                googleId: "google-sub-1",
                password: "hashed-pw",
            });

            const jwt = getJwt();

            const result = await jwt({
                token: {},
                user: {
                    id: "user-1",
                    email: "user@example.com",
                },
            });

            expect(findUniqueMock).toHaveBeenCalledTimes(1);
            expect(findUniqueMock).toHaveBeenCalledWith({
                where: { id: "user-1" },
                select: {
                    rol: true,
                    orgId: true,
                    kycStatus: true,
                    demoEndsAt: true,
                    email: true,
                    googleId: true,
                    password: true,
                },
            });

            expect(result.id).toBe("user-1");
            expect(result.email).toBe("user@example.com");
            expect(result.role).toBe("INVERSOR");
            expect(result.orgId).toBe("org-xyz");
            expect(result.kycStatus).toBe("APPROVED");
            expect(result.demoEndsAt).toBe("2026-12-31T00:00:00.000Z");
            expect(result.googleId).toBe("google-sub-1");
            expect(result.hasPassword).toBe(true);
            expect(result.lastDbSync).toBe(
                Math.floor(new Date("2026-04-26T12:00:00.000Z").getTime() / 1000),
            );
        });

        it("usa los valores del objeto `user` (no de DB) cuando user.role ya viene definido, pero igualmente lee googleId/hasPassword de DB", async () => {
            findUniqueMock.mockResolvedValueOnce({
                rol: "ADMIN_DB",
                orgId: "org-from-db",
                kycStatus: "PENDING_DB",
                demoEndsAt: null,
                email: "db@example.com",
                googleId: "google-sub-db",
                password: null,
            });

            const jwt = getJwt();

            const result = await jwt({
                token: {},
                user: {
                    id: "user-2",
                    email: "user2@example.com",
                    role: "CLIENTE",
                    orgId: "org-from-user",
                    kycStatus: "APPROVED",
                    demoEndsAt: "2027-01-01T00:00:00.000Z",
                },
            });

            expect(result.id).toBe("user-2");
            // The `user.role` branch keeps the values from the user object…
            expect(result.role).toBe("CLIENTE");
            expect(result.orgId).toBe("org-from-user");
            expect(result.kycStatus).toBe("APPROVED");
            expect(result.demoEndsAt).toBe("2027-01-01T00:00:00.000Z");
            // …but googleId and hasPassword always come from DB.
            expect(result.googleId).toBe("google-sub-db");
            expect(result.hasPassword).toBe(false);
            expect(result.lastDbSync).toBe(
                Math.floor(new Date("2026-04-26T12:00:00.000Z").getTime() / 1000),
            );
        });
    });

    describe("llamadas subsiguientes sin `user`", () => {
        it("no toca la DB cuando ha pasado menos de 5 minutos desde lastDbSync", async () => {
            const jwt = getJwt();

            const baseSeconds = Math.floor(
                new Date("2026-04-26T12:00:00.000Z").getTime() / 1000,
            );

            // Advance the clock by 4 minutes (still inside the 5-min window).
            vi.setSystemTime(new Date("2026-04-26T12:04:00.000Z"));

            const result = await jwt({
                token: {
                    id: "user-3",
                    role: "CLIENTE",
                    orgId: "org-3",
                    kycStatus: "APPROVED",
                    hasPassword: true,
                    googleId: null,
                    lastDbSync: baseSeconds,
                },
            });

            expect(findUniqueMock).not.toHaveBeenCalled();
            // Token is returned untouched.
            expect(result.role).toBe("CLIENTE");
            expect(result.lastDbSync).toBe(baseSeconds);
        });

        it("re-lee la DB y refresca role/hasPassword cuando han pasado más de 5 minutos", async () => {
            const baseSeconds = Math.floor(
                new Date("2026-04-26T12:00:00.000Z").getTime() / 1000,
            );

            findUniqueMock.mockResolvedValueOnce({
                rol: "ADMIN",
                orgId: "org-new",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                email: "fresh@example.com",
                googleId: "google-sub-fresh",
                password: "freshly-set-pw",
            });

            const jwt = getJwt();

            // Advance the clock by 6 minutes to trip the 5-min sync window.
            vi.setSystemTime(new Date("2026-04-26T12:06:00.000Z"));
            const newSeconds = Math.floor(
                new Date("2026-04-26T12:06:00.000Z").getTime() / 1000,
            );

            const result = await jwt({
                token: {
                    id: "user-4",
                    role: "CLIENTE",
                    orgId: "org-old",
                    kycStatus: "PENDING",
                    hasPassword: false,
                    googleId: null,
                    email: "stale@example.com",
                    lastDbSync: baseSeconds,
                },
            });

            expect(findUniqueMock).toHaveBeenCalledTimes(1);
            expect(findUniqueMock).toHaveBeenCalledWith({
                where: { id: "user-4" },
                select: {
                    rol: true,
                    orgId: true,
                    kycStatus: true,
                    demoEndsAt: true,
                    email: true,
                    googleId: true,
                    password: true,
                },
            });

            // Refreshed values from the DB row.
            expect(result.role).toBe("ADMIN");
            expect(result.orgId).toBe("org-new");
            expect(result.kycStatus).toBe("APPROVED");
            expect(result.email).toBe("fresh@example.com");
            expect(result.googleId).toBe("google-sub-fresh");
            expect(result.hasPassword).toBe(true);
            expect(result.lastDbSync).toBe(newSeconds);
        });

        it("fuerza re-lectura de DB cuando trigger === 'update' aunque no hayan pasado los 5 minutos", async () => {
            const baseSeconds = Math.floor(
                new Date("2026-04-26T12:00:00.000Z").getTime() / 1000,
            );

            findUniqueMock.mockResolvedValueOnce({
                rol: "GESTOR",
                orgId: "org-updated",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                email: "updated@example.com",
                googleId: null,
                password: "pw",
            });

            const jwt = getJwt();

            // Only 30 seconds elapsed — well inside the 5-min window.
            vi.setSystemTime(new Date("2026-04-26T12:00:30.000Z"));
            const newSeconds = Math.floor(
                new Date("2026-04-26T12:00:30.000Z").getTime() / 1000,
            );

            const result = await jwt({
                token: {
                    id: "user-5",
                    role: "CLIENTE",
                    orgId: "org-old",
                    kycStatus: "PENDING",
                    hasPassword: false,
                    googleId: "google-sub-old",
                    email: "old@example.com",
                    lastDbSync: baseSeconds,
                },
                trigger: "update",
            });

            // Even though only 30 seconds passed, `trigger: "update"` forces
            // a DB re-read to surface fresh role/hasPassword/etc.
            expect(findUniqueMock).toHaveBeenCalledTimes(1);
            expect(findUniqueMock).toHaveBeenCalledWith({
                where: { id: "user-5" },
                select: {
                    rol: true,
                    orgId: true,
                    kycStatus: true,
                    demoEndsAt: true,
                    email: true,
                    googleId: true,
                    password: true,
                },
            });

            expect(result.role).toBe("GESTOR");
            expect(result.orgId).toBe("org-updated");
            expect(result.email).toBe("updated@example.com");
            expect(result.googleId).toBeNull();
            expect(result.hasPassword).toBe(true);
            expect(result.lastDbSync).toBe(newSeconds);
        });

        it("no toca la DB cuando el token no tiene id, ni siquiera con trigger === 'update'", async () => {
            const jwt = getJwt();

            const result = await jwt({
                token: {
                    // no `id` — e.g. a freshly-minted empty token
                    lastDbSync: 0,
                },
                trigger: "update",
            });

            expect(findUniqueMock).not.toHaveBeenCalled();
            expect(result.lastDbSync).toBe(0);
        });
    });
});
