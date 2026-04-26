import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Coverage for Task #16: every successful `resetPassword` must dispatch
 * a "your password was changed" email to the account owner with the
 * right context (IP, user-agent, source) and must NOT propagate any
 * mailing failure back to the caller.
 *
 * Mocking strategy:
 *
 *   - We mock `resend` and `@sentry/nextjs` but deliberately leave
 *     `lib/email/password-changed-notification` UNMOCKED. That way the
 *     test exercises the real helper end-to-end (including its IP / UA
 *     formatting and source-line copy) so a future refactor that
 *     accidentally drops a field is caught here instead of in
 *     production logs.
 *
 *   - We mock `next/headers` to provide a deterministic forwarded-for
 *     and user-agent. The action only keeps the first hop of
 *     `x-forwarded-for`, which is the contract the audit row relies
 *     on, so we assert both halves: the kept hop is in the email body
 *     and the dropped hop is not.
 *
 *   - The helper keeps its own per-process rate-limit map keyed by
 *     `pwd-changed:<reason>`. The two failure tests below use distinct
 *     reasons (RESEND_SEND_ERROR vs RESEND_THREW), so each one gets a
 *     fresh budget within this file. This is the same pattern used by
 *     `request-password-reset-sentry.test.ts`.
 */
const mocks = vi.hoisted(() => ({
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    resendSend: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    auditFn: vi.fn(),
    requireAuth: vi.fn(),
    headersGet: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
    captureMessage: (...args: unknown[]) => mocks.captureMessage(...args),
    captureException: (...args: unknown[]) => mocks.captureException(...args),
}));

vi.mock("resend", () => ({
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

vi.mock("next/headers", () => ({
    headers: () => ({
        get: (key: string) => mocks.headersGet(key),
    }),
}));

import { resetPassword } from "@/lib/actions/auth-actions";

const ORIGINAL_ENV = { ...process.env };

const validResetInput = {
    token: "valid-token-from-email",
    password: "newSecurePassword!",
};

describe("resetPassword — password-changed notification (task #16 contract)", () => {
    beforeEach(() => {
        mocks.captureMessage.mockReset();
        mocks.captureException.mockReset();
        mocks.resendSend.mockReset();
        mocks.findUnique.mockReset();
        mocks.update.mockReset();
        mocks.auditFn.mockReset();
        mocks.requireAuth.mockReset();
        mocks.headersGet.mockReset();

        process.env = { ...ORIGINAL_ENV };
        process.env.NEXTAUTH_URL = "https://app.test";
        process.env.RESEND_API_KEY = "re_test_key";

        // Default header values used by every test unless overridden.
        // `x-forwarded-for` carries multiple hops; the action must keep
        // only the first one (closest to the original client) — that is
        // also what `audit()` records.
        mocks.headersGet.mockImplementation((key: string) => {
            if (key === "x-forwarded-for") return "203.0.113.42, 10.0.0.1";
            if (key === "user-agent") return "Mozilla/5.0 (TestBrowser)";
            return null;
        });
        mocks.update.mockResolvedValue({});
        mocks.auditFn.mockResolvedValue({});
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("user already had a password → notification dispatched with email, IP, UA and source=SELFSERVICE_RESET", async () => {
        mocks.findUnique.mockResolvedValue({
            id: "user-reset-1",
            email: "rotator@example.com",
            password: "$2a$10$existinghash",
            googleId: null,
            passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
        });
        mocks.resendSend.mockResolvedValue({
            data: { id: "resend-id-1" },
            error: null,
        });

        const result = await resetPassword(validResetInput);

        expect(result.success).toBe(true);
        expect(mocks.resendSend).toHaveBeenCalledTimes(1);

        const [payload] = mocks.resendSend.mock.calls[0] as [
            { to: string; subject: string; html: string; text: string },
        ];
        // The notification must reach the account owner, not the requester.
        expect(payload.to).toBe("rotator@example.com");
        expect(payload.subject).toMatch(/contraseña/i);
        // Only the first hop of x-forwarded-for is kept; this matches what
        // the audit row records, so the email and the audit agree on
        // "where did the change come from".
        expect(payload.html).toContain("203.0.113.42");
        expect(payload.text).toContain("203.0.113.42");
        expect(payload.html).not.toContain("10.0.0.1");
        // The user-agent must be passed through verbatim — when an owner
        // says "that wasn't my browser" the device string is the only
        // breadcrumb support has.
        expect(payload.html).toContain("Mozilla/5.0 (TestBrowser)");
        expect(payload.text).toContain("Mozilla/5.0 (TestBrowser)");
        // SELFSERVICE_RESET source line.
        expect(payload.html).toContain("Olvidé mi contraseña");
        expect(payload.html).not.toContain("Agregaste una contraseña");

        // The mailer failing or succeeding must not produce extra Sentry
        // alerts on the happy path.
        expect(mocks.captureException).not.toHaveBeenCalled();
        expect(mocks.captureMessage).not.toHaveBeenCalled();
    });

    it("user had no password yet (Google-only) → notification dispatched with source=SELFSERVICE_SET", async () => {
        mocks.findUnique.mockResolvedValue({
            id: "user-set-1",
            email: "google-only@example.com",
            password: null,
            googleId: "google-uid-1",
            passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
        });
        mocks.resendSend.mockResolvedValue({
            data: { id: "resend-id-2" },
            error: null,
        });

        const result = await resetPassword(validResetInput);

        expect(result.success).toBe(true);
        expect(mocks.resendSend).toHaveBeenCalledTimes(1);

        const [payload] = mocks.resendSend.mock.calls[0] as [
            { to: string; html: string; text: string },
        ];
        expect(payload.to).toBe("google-only@example.com");
        // SELFSERVICE_SET source line — distinct copy from the rotate
        // case so the user can tell apart "your password was reset" vs
        // "a password was added to your previously Google-only account".
        expect(payload.html).toContain("Agregaste una contraseña");
        expect(payload.html).not.toContain("Olvidé mi contraseña");
        // Headers still flow through on the first-time-set path.
        expect(payload.text).toContain("203.0.113.42");
        expect(payload.text).toContain("Mozilla/5.0 (TestBrowser)");

        expect(mocks.captureException).not.toHaveBeenCalled();
        expect(mocks.captureMessage).not.toHaveBeenCalled();
    });

    it("Resend returns { error } → resetPassword still returns success and Sentry alert is area=auth.password_changed reason=RESEND_SEND_ERROR", async () => {
        mocks.findUnique.mockResolvedValue({
            id: "user-failure-1",
            email: "send-error@example.com",
            password: "$2a$10$existinghash",
            googleId: null,
            passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
        });
        const sendError = {
            name: "ResendError",
            message: "rejected by provider",
        };
        mocks.resendSend.mockResolvedValue({ data: null, error: sendError });

        const result = await resetPassword(validResetInput);

        // The user's password change DID happen — the mailer is purely
        // a defense-in-depth notice. A mail-provider hiccup must never
        // surface as "your password was not reset".
        expect(result.success).toBe(true);
        expect(mocks.update).toHaveBeenCalledTimes(1);

        expect(mocks.captureException).toHaveBeenCalledTimes(1);
        const [captured, options] = mocks.captureException.mock.calls[0] as [
            unknown,
            {
                tags?: Record<string, string>;
                extra?: Record<string, unknown>;
            },
        ];
        expect(captured).toBe(sendError);
        // The `area` namespace is what the on-call dashboards filter by.
        // Mixing it with `auth.reset` (used by the request-link flow)
        // would silence the wrong alert budget.
        expect(options.tags).toMatchObject({
            area: "auth.password_changed",
            reason: "RESEND_SEND_ERROR",
            source: "SELFSERVICE_RESET",
        });
        expect(options.extra).toMatchObject({ userId: "user-failure-1" });
    });

    it("Resend throws → resetPassword still returns success and Sentry alert is area=auth.password_changed reason=RESEND_THREW", async () => {
        mocks.findUnique.mockResolvedValue({
            id: "user-failure-2",
            email: "thrower@example.com",
            password: null,
            googleId: "google-uid-2",
            passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
        });
        const thrown = new Error("network blew up");
        mocks.resendSend.mockRejectedValue(thrown);

        const result = await resetPassword(validResetInput);

        expect(result.success).toBe(true);
        expect(mocks.update).toHaveBeenCalledTimes(1);

        expect(mocks.captureException).toHaveBeenCalledTimes(1);
        const [captured, options] = mocks.captureException.mock.calls[0] as [
            unknown,
            {
                tags?: Record<string, string>;
                extra?: Record<string, unknown>;
            },
        ];
        expect(captured).toBe(thrown);
        // First-time-set path → source must be SELFSERVICE_SET, NOT
        // SELFSERVICE_RESET. Getting this backwards would mislabel the
        // alert and hide that the failure happened on the more sensitive
        // "first password ever on this account" branch.
        expect(options.tags).toMatchObject({
            area: "auth.password_changed",
            reason: "RESEND_THREW",
            source: "SELFSERVICE_SET",
        });
        expect(options.extra).toMatchObject({ userId: "user-failure-2" });
    });
});
