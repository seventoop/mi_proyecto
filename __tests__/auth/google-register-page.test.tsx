import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

/**
 * Coverage for the `/google-register` server-side page
 * (`app/(auth)/google-register/page.tsx`).
 *
 * Why this suite exists (task #27):
 * the page is what the user actually lands on after Google sign-in for
 * a brand-new account. It runs `verifyGooglePreRegistrationToken` on
 * the incoming `?token=...` and decides — server-side — whether to
 * render the role-picker form or to redirect to /login with a
 * specific error code so the login page can show a meaningful message.
 *
 * Two regressions would silently break this:
 *   1. mapping both INVALID and EXPIRED to the same redirect, which
 *      would lose the "expired" diagnostic that the login page uses
 *      to tell the user "your session timed out, just try again";
 *   2. catching the error too broadly and rendering the form anyway,
 *      which would let a forged or stale token through to the form
 *      submission step.
 *
 * As with the route suite, we use REAL signed tokens against the test
 * `NEXTAUTH_SECRET` so the assertions also exercise the real verifier
 * end-to-end (same pattern as `__tests__/auth/google-pre-registration.test.ts`).
 */

const mocks = vi.hoisted(() => ({
    redirect: vi.fn((url: string) => {
        // Mirror next/navigation's real behaviour: `redirect()` throws
        // a special error so the rest of the function never runs. We
        // throw a plain Error tagged with the URL so each test can
        // intercept it and assert the destination.
        const err = new Error(`__REDIRECT__:${url}`);
        (err as { __isRedirect?: boolean }).__isRedirect = true;
        throw err;
    }),
}));

vi.mock("next/navigation", () => ({
    redirect: (url: string) => mocks.redirect(url),
}));

const TEST_SECRET = "test-nextauth-secret-for-google-register-page";

function encodeBase64Url(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(encoded: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
}

type ValidPayload = {
    email: string;
    googleSub: string;
    fullName: string;
    picture: string | null;
    exp: number;
};

function buildSignedToken(payload: ValidPayload, secret: string = TEST_SECRET) {
    const encoded = encodeBase64Url(JSON.stringify(payload));
    const signature = signPayload(encoded, secret);
    return `${encoded}.${signature}`;
}

function captureRedirectUrl(fn: () => unknown): string {
    try {
        fn();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.startsWith("__REDIRECT__:")) {
            return message.slice("__REDIRECT__:".length);
        }
        throw err;
    }
    throw new Error("Expected the function to redirect, but it returned normally");
}

describe("GoogleRegisterPage — token validation (server component)", () => {
    const originalSecret = process.env.NEXTAUTH_SECRET;

    beforeEach(() => {
        mocks.redirect.mockClear();
        process.env.NEXTAUTH_SECRET = TEST_SECRET;
    });

    afterEach(() => {
        vi.useRealTimers();
        if (originalSecret === undefined) {
            delete process.env.NEXTAUTH_SECRET;
        } else {
            process.env.NEXTAUTH_SECRET = originalSecret;
        }
    });

    it("renderiza el formulario con email/nombre del payload cuando el token es válido y vigente", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        const payload: ValidPayload = {
            email: "nuevo@example.com",
            googleSub: "google-sub-new",
            fullName: "Nuevo Usuario",
            picture: "https://lh3.googleusercontent.com/avatar.png",
            exp: Date.now() + 5 * 60 * 1000,
        };
        const token = buildSignedToken(payload);

        const { default: GoogleRegisterPage } = await import(
            "@/app/(auth)/google-register/page"
        );

        const result = GoogleRegisterPage({ searchParams: { token } });

        // The page must not have redirected at all on the happy path.
        expect(mocks.redirect).not.toHaveBeenCalled();

        // The page returns a React element for GoogleRegisterForm with
        // the verified payload's data threaded through. We don't render
        // the tree (would pull in client-only deps); inspecting the
        // element's props is enough to prove the page handed the
        // verified data — and not the request data — to the form.
        const element = result as {
            props: {
                token: string;
                email: string;
                name: string;
                options: Array<{ value: string }>;
            };
        };
        expect(element.props.token).toBe(token);
        expect(element.props.email).toBe("nuevo@example.com");
        expect(element.props.name).toBe("Nuevo Usuario");
        // Role options come from getPublicGoogleRegistrationRoles(); we
        // just sanity-check the shape so an accidental empty list would
        // be caught.
        expect(Array.isArray(element.props.options)).toBe(true);
        expect(element.props.options.length).toBeGreaterThan(0);
    });

    it("redirige a /login?error=google_pre_registration cuando la firma del token fue alterada", async () => {
        const payload: ValidPayload = {
            email: "nuevo@example.com",
            googleSub: "google-sub-new",
            fullName: "Nuevo Usuario",
            picture: null,
            exp: Date.now() + 5 * 60 * 1000,
        };
        const validToken = buildSignedToken(payload);
        const [encoded, signature] = validToken.split(".");
        const tamperedSignature =
            signature.slice(0, -1) + (signature.slice(-1) === "A" ? "B" : "A");
        const tamperedToken = `${encoded}.${tamperedSignature}`;

        const { default: GoogleRegisterPage } = await import(
            "@/app/(auth)/google-register/page"
        );

        const url = captureRedirectUrl(() =>
            GoogleRegisterPage({ searchParams: { token: tamperedToken } }),
        );

        // For a tampered (invalid) token the page must use the
        // generic `google_pre_registration` error code — NOT the
        // `_expired` variant. This is the discriminator the login
        // page uses to render different copy ("invalid session" vs
        // "your session expired"); collapsing the two would silently
        // worsen the UX of the most common case (forged / corrupted
        // token from a copy-paste, browser extension, etc.).
        expect(url).toBe("/login?error=google_pre_registration");
    });

    it("redirige a /login?error=google_pre_registration_expired cuando el token está vencido", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        const expiredPayload: ValidPayload = {
            email: "nuevo@example.com",
            googleSub: "google-sub-new",
            fullName: "Nuevo Usuario",
            picture: null,
            exp: Date.now() - 60 * 1000,
        };
        const expiredToken = buildSignedToken(expiredPayload);

        const { default: GoogleRegisterPage } = await import(
            "@/app/(auth)/google-register/page"
        );

        const url = captureRedirectUrl(() =>
            GoogleRegisterPage({ searchParams: { token: expiredToken } }),
        );

        // Expired-specific destination so the login page can show a
        // "your session timed out, try again" message instead of the
        // generic invalid-token copy.
        expect(url).toBe("/login?error=google_pre_registration_expired");
    });

    it("redirige a /login?error=google_pre_registration cuando no llega ningún token", async () => {
        const { default: GoogleRegisterPage } = await import(
            "@/app/(auth)/google-register/page"
        );

        const url = captureRedirectUrl(() =>
            GoogleRegisterPage({ searchParams: {} }),
        );

        // Missing token is treated like an invalid token — the user
        // arrived at this page by accident or via a stale link, so we
        // bounce them back to /login with the generic error.
        expect(url).toBe("/login?error=google_pre_registration");
    });
});
