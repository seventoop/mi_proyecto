import { describe, it, expect, vi } from "vitest";

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

type SessionArgs = {
    session: { user?: Record<string, unknown> } & Record<string, unknown>;
    token: Record<string, unknown>;
    user?: Record<string, unknown>;
    newSession?: unknown;
    trigger?: "update";
};

type SessionFn = (args: SessionArgs) => Promise<SessionArgs["session"]>;

function getSession(): SessionFn {
    const fn = authOptions.callbacks?.session;
    if (!fn) throw new Error("session callback not defined");
    return fn as unknown as SessionFn;
}

function baseSession() {
    return {
        user: {
            name: "Existing Name",
            email: "old@example.com",
            image: null,
        } as Record<string, unknown>,
        expires: "2026-12-31T00:00:00.000Z",
    };
}

describe("authOptions callbacks — session() (datos del token expuestos al cliente)", () => {
    it("copia id, email, role, orgId, kycStatus, demoEndsAt y googleId desde el token", async () => {
        const session = getSession();

        const result = await session({
            session: baseSession(),
            token: {
                id: "user-1",
                email: "user@example.com",
                role: "INVERSOR",
                orgId: "org-xyz",
                kycStatus: "APPROVED",
                demoEndsAt: "2026-12-31T00:00:00.000Z",
                googleId: "google-sub-1",
                hasPassword: true,
            },
        });

        expect(result.user?.id).toBe("user-1");
        expect(result.user?.email).toBe("user@example.com");
        expect(result.user?.role).toBe("INVERSOR");
        expect(result.user?.orgId).toBe("org-xyz");
        expect(result.user?.kycStatus).toBe("APPROVED");
        expect(result.user?.demoEndsAt).toBe("2026-12-31T00:00:00.000Z");
        expect(result.user?.googleId).toBe("google-sub-1");
    });

    it("propaga hasPassword === true tal cual al session.user", async () => {
        const session = getSession();

        const result = await session({
            session: baseSession(),
            token: {
                id: "user-2",
                email: "u2@example.com",
                role: "CLIENTE",
                orgId: "org-2",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                googleId: null,
                hasPassword: true,
            },
        });

        expect(result.user?.hasPassword).toBe(true);
    });

    it("propaga hasPassword === false tal cual al session.user", async () => {
        const session = getSession();

        const result = await session({
            session: baseSession(),
            token: {
                id: "user-3",
                email: "u3@example.com",
                role: "CLIENTE",
                orgId: "org-3",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                googleId: "google-sub-3",
                hasPassword: false,
            },
        });

        expect(result.user?.hasPassword).toBe(false);
    });

    it("conserva hasPassword === undefined cuando el token es viejo (no lo fuerza a false)", async () => {
        const session = getSession();

        // Pre-existing JWTs minted before `hasPassword` was added would
        // otherwise look like "no password" until the next 5-min DB sync,
        // which would briefly show the only-Google self-service hint to
        // users who actually have a password.
        const result = await session({
            session: baseSession(),
            token: {
                id: "user-4",
                email: "u4@example.com",
                role: "CLIENTE",
                orgId: "org-4",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                googleId: null,
                // hasPassword intentionally omitted -> undefined
            },
        });

        expect(result.user?.hasPassword).toBeUndefined();
        expect("hasPassword" in (result.user ?? {})).toBe(true);
        expect(result.user?.hasPassword).not.toBe(false);
    });

    it("cuando token.googleId es undefined, session.user.googleId queda en null", async () => {
        const session = getSession();

        const result = await session({
            session: baseSession(),
            token: {
                id: "user-5",
                email: "u5@example.com",
                role: "CLIENTE",
                orgId: "org-5",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                hasPassword: true,
                // googleId intentionally omitted -> undefined
            },
        });

        expect(result.user?.googleId).toBeNull();
    });

    it("si token.email falta, preserva el session.user.email original", async () => {
        const session = getSession();

        const original = baseSession();

        const result = await session({
            session: original,
            token: {
                id: "user-6",
                role: "CLIENTE",
                orgId: "org-6",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                googleId: null,
                hasPassword: true,
                // email intentionally omitted
            },
        });

        expect(result.user?.email).toBe("old@example.com");
    });

    it("no toca la DB (el callback session no consulta @/lib/db)", async () => {
        const session = getSession();

        await session({
            session: baseSession(),
            token: {
                id: "user-7",
                email: "u7@example.com",
                role: "CLIENTE",
                orgId: "org-7",
                kycStatus: "APPROVED",
                demoEndsAt: null,
                googleId: "g7",
                hasPassword: true,
            },
        });

        expect(findUniqueMock).not.toHaveBeenCalled();
        expect(updateMock).not.toHaveBeenCalled();
    });
});
