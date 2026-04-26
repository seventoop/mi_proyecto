import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Scope-guard coverage for `requestPasswordSetup` (task #26).
 *
 * `requestPasswordSetup` short-circuits before doing any work when the
 * caller is outside the population this endpoint was designed for:
 *
 *   - Users who already have a password (`previouslyHadPassword`) —
 *     they belong on the `/forgot-password` flow, which has the
 *     anti-enumeration protections this self-service endpoint skips.
 *   - Users who don't have Google linked (`!hasGoogle`) — they are
 *     pure email/password accounts and must rotate via the same
 *     `/forgot-password` flow rather than an authenticated shortcut.
 *
 * Both rejections are intentionally observational no-ops: no token is
 * issued, no email is sent, no audit row is written, and no Sentry
 * event is emitted. If somebody ever loosens the guard (e.g. flips
 * `||` to `&&`) one of these populations would gain an unintended path
 * to issue a reset token from inside the app, bypassing the protections
 * of the canonical reset flow. These tests pin the guard down so that
 * regression shows up red.
 *
 * Lives in its own module (like the happy-path suite) so it never has
 * to share the rate-limit Map maintained at module scope by
 * `shouldEmitAuthEmailAlert` with the failure suite — neither of these
 * rejections touches that helper, but keeping the suites isolated
 * removes any chance of test-ordering interactions.
 */
const mocks = vi.hoisted(() => ({
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    resendSend: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    auditFn: vi.fn(),
    requireAuth: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
    captureMessage: (...args: unknown[]) => mocks.captureMessage(...args),
    captureException: (...args: unknown[]) => mocks.captureException(...args),
}));

vi.mock("resend", () => ({
    // Must be a `function` (not an arrow) so the action's `new Resend(...)`
    // call works — vitest's mock spy refuses to be invoked with `new`
    // unless the underlying implementation is a constructable function.
    Resend: vi.fn().mockImplementation(function ResendMock(this: unknown) {
        return {
            emails: {
                send: (...args: unknown[]) => mocks.resendSend(...args),
            },
        };
    }),
}));

vi.mock("@/lib/db", () => ({
    default: {
        user: {
            findUnique: (...args: unknown[]) => mocks.findUnique(...args),
            update: (...args: unknown[]) => mocks.update(...args),
        },
    },
}));

vi.mock("@/lib/guards", () => ({
    requireAuth: (...args: unknown[]) => mocks.requireAuth(...args),
}));

vi.mock("@/lib/mail", () => ({
    sendTransactionalEmail: vi.fn(),
}));

vi.mock("@/lib/actions/audit", () => ({
    audit: (...args: unknown[]) => mocks.auditFn(...args),
}));

import { requestPasswordSetup } from "@/lib/actions/auth-actions";

const ORIGINAL_ENV = { ...process.env };

const USER_ID = "user-1";

describe("requestPasswordSetup — scope rejections (task #26 contract)", () => {
    beforeEach(() => {
        mocks.captureMessage.mockReset();
        mocks.captureException.mockReset();
        mocks.resendSend.mockReset();
        mocks.findUnique.mockReset();
        mocks.update.mockReset();
        mocks.auditFn.mockReset();
        mocks.requireAuth.mockReset();

        mocks.requireAuth.mockResolvedValue({ id: USER_ID });
        mocks.update.mockResolvedValue({});

        process.env = { ...ORIGINAL_ENV };
        process.env.NEXTAUTH_URL = "https://app.test";
        // RESEND_API_KEY is intentionally set: the scope guard runs
        // before the missing-key check, so even with delivery
        // configured these requests must still be rejected without
        // any side effects. Setting the key here makes sure we are
        // testing the guard and not accidentally hitting the
        // RESEND_API_KEY_MISSING short-circuit for a different reason.
        process.env.RESEND_API_KEY = "re_test_key";
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("user already has a password → rejects with the '¿Olvidaste tu contraseña?' hint and emits no side effects", async () => {
        // Hybrid account: has a password AND Google linked. The user
        // is authenticated (requireAuth resolved), so they already
        // know their password — wanting a fresh one is a rotation,
        // which belongs on /forgot-password, not on this endpoint.
        mocks.findUnique.mockResolvedValue({
            id: USER_ID,
            email: "hybrid@example.com",
            password: "argon2-hash-already-set",
            googleId: "google-id-123",
        });

        const result = await requestPasswordSetup();

        expect(result.success).toBe(false);
        // The user-facing copy MUST point them at the canonical
        // "rotate" surface. If this string ever stops mentioning the
        // forgot-password flow, the user gets a dead end with no idea
        // where to go next.
        expect((result as { error?: string }).error).toBeDefined();
        expect((result as { error: string }).error).toMatch(
            /Olvidaste tu contraseña/i,
        );

        // Pure no-op: no token write, no rollback, no email, no
        // audit, no Sentry. This is what the task calls an
        // "observational no-op" — the guard is invisible to
        // monitoring on purpose, because legitimate UI flows never
        // hit it (the profile page hides the "add password" button
        // for users who already have one).
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.resendSend).not.toHaveBeenCalled();
        expect(mocks.auditFn).not.toHaveBeenCalled();
        expect(mocks.captureMessage).not.toHaveBeenCalled();
        expect(mocks.captureException).not.toHaveBeenCalled();
    });

    it("user has no Google linked → rejects with the '¿Olvidaste tu contraseña?' hint and emits no side effects", async () => {
        // Email-only account: a password is set and no Google ID is
        // linked. This endpoint's whole reason for existing is to
        // give Google-only users an authenticated shortcut to ALSO
        // get a password; an email-only user already has the only
        // credential type they could get from this flow, so they
        // belong on /forgot-password too.
        //
        // Note: the spec calls for `password === null, googleId === null`
        // here. With password=null this user technically has zero
        // working credentials, but the guard still routes them to the
        // forgot-password flow because that's the canonical surface
        // for issuing a reset token to an email-only address — and
        // crucially, this endpoint must NOT serve them, otherwise an
        // attacker who steals the session of a no-credentials account
        // could mint reset tokens here without going through the
        // anti-enumeration path.
        mocks.findUnique.mockResolvedValue({
            id: USER_ID,
            email: "email-only@example.com",
            password: null,
            googleId: null,
        });

        const result = await requestPasswordSetup();

        expect(result.success).toBe(false);
        expect((result as { error?: string }).error).toBeDefined();
        expect((result as { error: string }).error).toMatch(
            /Olvidaste tu contraseña/i,
        );

        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.resendSend).not.toHaveBeenCalled();
        expect(mocks.auditFn).not.toHaveBeenCalled();
        expect(mocks.captureMessage).not.toHaveBeenCalled();
        expect(mocks.captureException).not.toHaveBeenCalled();
    });
});
