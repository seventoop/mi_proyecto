import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

/**
 * Coverage for the `POST /api/auth/google-register` route handler
 * (`app/api/auth/google-register/route.ts`).
 *
 * Why this suite exists (task #27):
 * the unit suite for `verifyGooglePreRegistrationToken`
 * (`__tests__/auth/google-pre-registration.test.ts`) already pins down
 * that the verifier throws `INVALID_GOOGLE_PRE_REG_TOKEN` /
 * `EXPIRED_GOOGLE_PRE_REG_TOKEN` for tampered or expired tokens. What it
 * does NOT cover is whether the route handler that consumes that
 * function correctly:
 *   (a) catches those two error codes and turns them into a visible
 *       4xx response for the user instead of leaking a 500, and
 *   (b) actually short-circuits BEFORE creating a user row when the
 *       token is rejected.
 *
 * A regression that, for example, swallowed the throw and continued to
 * `prisma.user.create` would silently let an attacker register with a
 * forged or stale token. We assert here that `prisma.user.create` is
 * never invoked on the rejection branches.
 *
 * Following the pattern from `google-pre-registration.test.ts`, we use
 * REAL signed tokens against the same `NEXTAUTH_SECRET` used at runtime
 * — no mocking of the verifier — so this suite would catch a
 * regression in either the verifier or the handler.
 */

const mocks = vi.hoisted(() => ({
    findUnique: vi.fn(),
    create: vi.fn(),
    auditFn: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    default: {
        user: {
            findUnique: (...args: unknown[]) => mocks.findUnique(...args),
            create: (...args: unknown[]) => mocks.create(...args),
        },
    },
}));

vi.mock("@/lib/actions/audit", () => ({
    audit: (...args: unknown[]) => mocks.auditFn(...args),
}));

const TEST_SECRET = "test-nextauth-secret-for-google-register-route";

function encodeBase64Url(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(encodedPayload: string, secret: string) {
    return crypto
        .createHmac("sha256", secret)
        .update(encodedPayload)
        .digest("base64url");
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

function makeRequest(body: unknown) {
    // The route only calls `req.json()`. A plain object that satisfies
    // that single call is enough — we deliberately do NOT pull in
    // next/server's NextRequest because that would force pulling in
    // a lot of Next runtime infra for a unit test of a handler.
    return {
        json: async () => body,
    } as unknown as Parameters<
        typeof import("@/app/api/auth/google-register/route").POST
    >[0];
}

describe("POST /api/auth/google-register — token validation", () => {
    const originalSecret = process.env.NEXTAUTH_SECRET;

    beforeEach(() => {
        mocks.findUnique.mockReset();
        mocks.create.mockReset();
        mocks.auditFn.mockReset();
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

    it("crea el usuario y responde success cuando el token es válido y vigente", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        const validPayload: ValidPayload = {
            email: "nuevo@example.com",
            googleSub: "google-sub-new",
            fullName: "Nuevo Usuario",
            picture: "https://lh3.googleusercontent.com/avatar.png",
            exp: Date.now() + 5 * 60 * 1000,
        };
        const token = buildSignedToken(validPayload);

        // Email is not in DB yet → the handler proceeds to create a user.
        mocks.findUnique.mockResolvedValueOnce(null);
        mocks.create.mockResolvedValueOnce({
            id: "user-created-1",
            email: validPayload.email,
        });
        mocks.auditFn.mockResolvedValueOnce(undefined);

        const { POST } = await import("@/app/api/auth/google-register/route");
        const res = await POST(
            makeRequest({ token, role: "INVERSOR" }),
        );

        expect(res.status).toBe(200);
        const json = (await res.json()) as { success?: boolean };
        expect(json.success).toBe(true);

        // The user MUST be created exactly once with the data taken from
        // the verified token payload — not from the request body.
        expect(mocks.create).toHaveBeenCalledTimes(1);
        const [createArgs] = mocks.create.mock.calls[0] as [
            { data: Record<string, unknown> },
        ];
        expect(createArgs.data.email).toBe("nuevo@example.com");
        expect(createArgs.data.googleId).toBe("google-sub-new");
        expect(createArgs.data.nombre).toBe("Nuevo Usuario");
        expect(createArgs.data.avatar).toBe(
            "https://lh3.googleusercontent.com/avatar.png",
        );
        expect(createArgs.data.rol).toBe("INVERSOR");

        // Successful registration also produces an audit row.
        expect(mocks.auditFn).toHaveBeenCalledTimes(1);
    });

    it("rechaza con 400 y NO crea usuario cuando la firma del token fue alterada", async () => {
        const validPayload: ValidPayload = {
            email: "nuevo@example.com",
            googleSub: "google-sub-new",
            fullName: "Nuevo Usuario",
            picture: null,
            exp: Date.now() + 5 * 60 * 1000,
        };
        const validToken = buildSignedToken(validPayload);
        const [encoded, signature] = validToken.split(".");
        // Flip the last character of the signature so the HMAC no longer
        // matches. Using an A↔B swap keeps the length identical, which is
        // important: the verifier checks length BEFORE timing-safe equal,
        // and we want to exercise the cryptographic-mismatch branch, not
        // the length-mismatch one.
        const tamperedSignature =
            signature.slice(0, -1) + (signature.slice(-1) === "A" ? "B" : "A");
        const tamperedToken = `${encoded}.${tamperedSignature}`;

        const { POST } = await import("@/app/api/auth/google-register/route");
        const res = await POST(
            makeRequest({ token: tamperedToken, role: "INVERSOR" }),
        );

        expect(res.status).toBe(400);
        const json = (await res.json()) as { error?: string };
        // The handler maps both INVALID and EXPIRED to the same
        // user-facing message. We assert on the message string itself
        // (not just the status) so that a regression which silently
        // changed the copy — e.g. leaking "Internal Server Error" or
        // the raw `INVALID_GOOGLE_PRE_REG_TOKEN` code to the user —
        // would be caught here.
        expect(json.error).toBe(
            "La sesión de Google expiró. Volvé a intentarlo.",
        );

        // Critical security invariant: a tampered token must NEVER reach
        // the user-creation path.
        expect(mocks.findUnique).not.toHaveBeenCalled();
        expect(mocks.create).not.toHaveBeenCalled();
        expect(mocks.auditFn).not.toHaveBeenCalled();
    });

    it("rechaza con 400 y NO crea usuario cuando el token está vencido", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        // Build a token whose `exp` is already in the past. We sign it
        // ourselves (instead of going through createGooglePreRegistrationToken)
        // because the helper always sets `exp = now + TTL`, which would
        // require an extra clock advance. Signing an explicitly-stale exp
        // is more direct and just as faithful: same secret, same HMAC,
        // same payload shape.
        const expiredPayload: ValidPayload = {
            email: "nuevo@example.com",
            googleSub: "google-sub-new",
            fullName: "Nuevo Usuario",
            picture: null,
            exp: Date.now() - 60 * 1000, // expired 1 minute ago
        };
        const expiredToken = buildSignedToken(expiredPayload);

        const { POST } = await import("@/app/api/auth/google-register/route");
        const res = await POST(
            makeRequest({ token: expiredToken, role: "INVERSOR" }),
        );

        expect(res.status).toBe(400);
        const json = (await res.json()) as { error?: string };
        expect(json.error).toBe(
            "La sesión de Google expiró. Volvé a intentarlo.",
        );

        // Same security invariant as the tampered case.
        expect(mocks.findUnique).not.toHaveBeenCalled();
        expect(mocks.create).not.toHaveBeenCalled();
        expect(mocks.auditFn).not.toHaveBeenCalled();
    });
});
