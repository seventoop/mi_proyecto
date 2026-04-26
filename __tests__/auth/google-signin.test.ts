import { describe, it, expect, beforeEach, vi } from "vitest";

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const createGooglePreRegistrationTokenMock = vi.fn();

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
    createGooglePreRegistrationToken: (...args: unknown[]) =>
        createGooglePreRegistrationTokenMock(...args),
}));

import { authOptions } from "@/lib/auth";

type SignInArgs = {
    user: Record<string, unknown>;
    account: Record<string, unknown> | null;
    profile?: Record<string, unknown>;
    email?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
};

type SignInFn = (args: SignInArgs) => Promise<boolean | string>;

function getSignIn(): SignInFn {
    const fn = authOptions.callbacks?.signIn;
    if (!fn) throw new Error("signIn callback not defined");
    return fn as unknown as SignInFn;
}

describe("authOptions callbacks — signIn() (Google branch)", () => {
    beforeEach(() => {
        findUniqueMock.mockReset();
        updateMock.mockReset();
        createGooglePreRegistrationTokenMock.mockReset();
        createGooglePreRegistrationTokenMock.mockReturnValue("pre-reg-token");
    });

    it("retorna true sin tocar la DB cuando el provider no es google", async () => {
        const signIn = getSignIn();

        const result = await signIn({
            user: { id: "u1", email: "x@example.com" },
            account: { provider: "credentials", providerAccountId: "u1" },
        });

        expect(result).toBe(true);
        expect(findUniqueMock).not.toHaveBeenCalled();
        expect(updateMock).not.toHaveBeenCalled();
        expect(createGooglePreRegistrationTokenMock).not.toHaveBeenCalled();
    });

    it("retorna false cuando el email no está verificado", async () => {
        const signIn = getSignIn();

        const result = await signIn({
            user: { name: "Foo", email: "foo@example.com" },
            account: { provider: "google", providerAccountId: "google-sub-1" },
            profile: {
                email: "foo@example.com",
                email_verified: false,
                sub: "google-sub-1",
                name: "Foo",
            },
        });

        expect(result).toBe(false);
        expect(findUniqueMock).not.toHaveBeenCalled();
        expect(updateMock).not.toHaveBeenCalled();
        expect(createGooglePreRegistrationTokenMock).not.toHaveBeenCalled();
    });

    it("retorna false cuando el email está ausente en el profile", async () => {
        const signIn = getSignIn();

        const result = await signIn({
            user: { name: "Foo" },
            account: { provider: "google", providerAccountId: "google-sub-2" },
            profile: {
                email_verified: true,
                sub: "google-sub-2",
                name: "Foo",
            },
        });

        expect(result).toBe(false);
        expect(findUniqueMock).not.toHaveBeenCalled();
        expect(updateMock).not.toHaveBeenCalled();
        expect(createGooglePreRegistrationTokenMock).not.toHaveBeenCalled();
    });

    it("vincula googleId/avatar y retorna true cuando el usuario existe sin googleId", async () => {
        findUniqueMock.mockResolvedValueOnce({
            id: "user-existing-1",
            googleId: null,
            avatar: null,
            nombre: "Existente",
        });
        findUniqueMock.mockResolvedValueOnce({
            rol: "INVERSOR",
            orgId: "org-1",
            kycStatus: "APPROVED",
            demoEndsAt: null,
        });
        updateMock.mockResolvedValueOnce({});

        const signIn = getSignIn();
        const userArg: Record<string, unknown> = {
            name: "Existente",
            email: "EXISTENTE@example.com",
            image: "https://lh3.googleusercontent.com/avatar.png",
        };

        const result = await signIn({
            user: userArg,
            account: { provider: "google", providerAccountId: "google-sub-99" },
            profile: {
                email: "EXISTENTE@example.com",
                email_verified: true,
                sub: "google-sub-99",
                name: "Existente",
                picture: "https://lh3.googleusercontent.com/avatar.png",
            },
        });

        expect(result).toBe(true);

        // Email is normalized (lowercase + trim) before lookup.
        expect(findUniqueMock).toHaveBeenNthCalledWith(1, {
            where: { email: "existente@example.com" },
            select: { id: true, googleId: true, avatar: true, nombre: true },
        });

        // Linking write happened with the new googleId and avatar.
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(updateMock).toHaveBeenCalledWith({
            where: { id: "user-existing-1" },
            data: {
                googleId: "google-sub-99",
                avatar: "https://lh3.googleusercontent.com/avatar.png",
            },
        });

        // Mutates the `user` object that next-auth will pass to `jwt()`.
        expect(userArg.id).toBe("user-existing-1");
        expect(userArg.email).toBe("existente@example.com");
        expect(userArg.role).toBe("INVERSOR");

        expect(createGooglePreRegistrationTokenMock).not.toHaveBeenCalled();
    });

    it("retorna true sin escribir cuando el usuario existe y ya tiene googleId + avatar", async () => {
        findUniqueMock.mockResolvedValueOnce({
            id: "user-existing-2",
            googleId: "google-sub-already",
            avatar: "https://existing.example.com/me.png",
            nombre: "Ya Vinculado",
        });
        findUniqueMock.mockResolvedValueOnce({
            rol: "CLIENTE",
            orgId: "org-2",
            kycStatus: "APPROVED",
            demoEndsAt: null,
        });

        const signIn = getSignIn();
        const userArg: Record<string, unknown> = {
            name: "Ya Vinculado",
            email: "linked@example.com",
            image: "https://lh3.googleusercontent.com/new.png",
        };

        const result = await signIn({
            user: userArg,
            account: { provider: "google", providerAccountId: "google-sub-already" },
            profile: {
                email: "linked@example.com",
                email_verified: true,
                sub: "google-sub-already",
                name: "Ya Vinculado",
                picture: "https://lh3.googleusercontent.com/new.png",
            },
        });

        expect(result).toBe(true);
        expect(updateMock).not.toHaveBeenCalled();
        expect(createGooglePreRegistrationTokenMock).not.toHaveBeenCalled();

        // Even when no write happens, the user object is enriched with the
        // role from DB so that `jwt()` downstream gets the right values.
        expect(userArg.id).toBe("user-existing-2");
        expect(userArg.email).toBe("linked@example.com");
        expect(userArg.role).toBe("CLIENTE");
    });

    it("retorna la URL /google-register?token=... cuando el usuario no existe", async () => {
        findUniqueMock.mockResolvedValueOnce(null);
        createGooglePreRegistrationTokenMock.mockReturnValueOnce("signed.token.here");

        const signIn = getSignIn();

        const result = await signIn({
            user: { name: "Nuevo Usuario" },
            account: { provider: "google", providerAccountId: "google-sub-new" },
            profile: {
                email: "nuevo@example.com",
                email_verified: true,
                sub: "google-sub-new",
                name: "Nuevo Usuario",
                picture: "https://lh3.googleusercontent.com/new-user.png",
            },
        });

        expect(result).toBe(
            `/google-register?token=${encodeURIComponent("signed.token.here")}`,
        );

        expect(updateMock).not.toHaveBeenCalled();
        expect(createGooglePreRegistrationTokenMock).toHaveBeenCalledTimes(1);
        expect(createGooglePreRegistrationTokenMock).toHaveBeenCalledWith({
            email: "nuevo@example.com",
            googleSub: "google-sub-new",
            fullName: "Nuevo Usuario",
            picture: "https://lh3.googleusercontent.com/new-user.png",
        });
    });
});
