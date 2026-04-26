import { describe, it, expect, beforeEach, vi } from "vitest";

const findUniqueMock = vi.fn();
const compareMock = vi.fn();

vi.mock("@/lib/db", () => ({
    default: {
        user: {
            findUnique: (...args: unknown[]) => findUniqueMock(...args),
        },
    },
}));

vi.mock("bcryptjs", () => ({
    default: {
        compare: (...args: unknown[]) => compareMock(...args),
    },
    compare: (...args: unknown[]) => compareMock(...args),
}));

vi.mock("@/lib/auth/google-pre-registration", () => ({
    createGooglePreRegistrationToken: vi.fn(() => "pre-reg-token"),
}));

import { authOptions } from "@/lib/auth";

type AuthorizeFn = (
    credentials: Record<string, string> | undefined,
) => Promise<unknown>;

function getAuthorize(): AuthorizeFn {
    // CredentialsProvider stores the user-supplied `authorize` under
    // `provider.options.authorize` (the top-level `authorize` is a stub
    // returning `null`). We invoke the real one directly to test it in
    // isolation, the same way next-auth does at runtime.
    const credentialsProvider = authOptions.providers[0] as unknown as {
        options: { authorize: AuthorizeFn };
    };
    return credentialsProvider.options.authorize.bind(
        credentialsProvider.options,
    );
}

describe("authOptions credentials provider — authorize()", () => {
    beforeEach(() => {
        findUniqueMock.mockReset();
        compareMock.mockReset();
    });

    it("rechaza con 'Credenciales inválidas' cuando el usuario no existe", async () => {
        findUniqueMock.mockResolvedValueOnce(null);

        const authorize = getAuthorize();

        await expect(
            authorize({ email: "noexiste@example.com", password: "secret123" }),
        ).rejects.toThrow("Credenciales inválidas");

        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { email: "noexiste@example.com" },
            select: expect.objectContaining({
                password: true,
                googleId: true,
            }),
        });
        expect(compareMock).not.toHaveBeenCalled();
    });

    it("rechaza con 'GOOGLE_ONLY_ACCOUNT' cuando la cuenta es solo-Google (sin password)", async () => {
        findUniqueMock.mockResolvedValueOnce({
            id: "user-1",
            email: "google@example.com",
            password: null,
            googleId: "google-sub-123",
            nombre: "Usuario Google",
            rol: "CLIENTE",
            orgId: "org-1",
            kycStatus: "PENDING",
            demoEndsAt: null,
        });

        const authorize = getAuthorize();

        await expect(
            authorize({ email: "google@example.com", password: "anything" }),
        ).rejects.toThrow("GOOGLE_ONLY_ACCOUNT");

        expect(compareMock).not.toHaveBeenCalled();
    });

    it("rechaza con 'Credenciales inválidas' cuando el password es inválido", async () => {
        findUniqueMock.mockResolvedValueOnce({
            id: "user-2",
            email: "user@example.com",
            password: "hashed-password",
            googleId: null,
            nombre: "Usuario",
            rol: "CLIENTE",
            orgId: "org-1",
            kycStatus: "APPROVED",
            demoEndsAt: null,
        });
        compareMock.mockResolvedValueOnce(false);

        const authorize = getAuthorize();

        await expect(
            authorize({ email: "user@example.com", password: "wrong-password" }),
        ).rejects.toThrow("Credenciales inválidas");

        expect(compareMock).toHaveBeenCalledWith("wrong-password", "hashed-password");
    });

    it("devuelve el objeto user esperado cuando el password es válido", async () => {
        const demoEndsAt = new Date("2026-12-31T00:00:00.000Z");
        findUniqueMock.mockResolvedValueOnce({
            id: "user-3",
            email: "ok@example.com",
            password: "hashed-password",
            googleId: null,
            nombre: "Usuario OK",
            rol: "INVERSOR",
            orgId: "org-2",
            kycStatus: "APPROVED",
            demoEndsAt,
        });
        compareMock.mockResolvedValueOnce(true);

        const authorize = getAuthorize();

        const result = await authorize({
            email: "ok@example.com",
            password: "correct-password",
        });

        expect(result).toEqual({
            id: "user-3",
            email: "ok@example.com",
            name: "Usuario OK",
            role: "INVERSOR",
            orgId: "org-2",
            kycStatus: "APPROVED",
            demoEndsAt: demoEndsAt.toISOString(),
        });
        expect(compareMock).toHaveBeenCalledWith(
            "correct-password",
            "hashed-password",
        );
    });

    it("normaliza el email (lowercase + trim) antes de buscar al usuario", async () => {
        findUniqueMock.mockResolvedValueOnce(null);

        const authorize = getAuthorize();

        await expect(
            authorize({ email: "  Mixed@Example.COM  ", password: "secret123" }),
        ).rejects.toThrow("Credenciales inválidas");

        expect(findUniqueMock).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { email: "mixed@example.com" },
            }),
        );
    });

    it("rechaza con 'Email y contraseña son requeridos' si faltan credenciales", async () => {
        const authorize = getAuthorize();

        await expect(authorize(undefined)).rejects.toThrow(
            "Email y contraseña son requeridos",
        );
        await expect(authorize({ email: "", password: "" })).rejects.toThrow(
            "Email y contraseña son requeridos",
        );
        expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it("devuelve demoEndsAt = null cuando el usuario no tiene demo configurada", async () => {
        findUniqueMock.mockResolvedValueOnce({
            id: "user-4",
            email: "nodemo@example.com",
            password: "hashed-password",
            googleId: null,
            nombre: "Sin Demo",
            rol: "CLIENTE",
            orgId: "org-3",
            kycStatus: "APPROVED",
            demoEndsAt: null,
        });
        compareMock.mockResolvedValueOnce(true);

        const authorize = getAuthorize();

        const result = (await authorize({
            email: "nodemo@example.com",
            password: "correct-password",
        })) as { demoEndsAt: string | null };

        expect(result.demoEndsAt).toBeNull();
    });
});
