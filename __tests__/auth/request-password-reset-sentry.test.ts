import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Shared mocks across all tests in this file. We intentionally do NOT
 * call `vi.resetModules()` between tests because:
 *
 *   1. `requestPasswordReset` keeps its rate-limit Map in module scope
 *      (one alert per hour per `key`), and the contract we are testing
 *      is precisely that two consecutive failures of the *same kind*
 *      only emit one Sentry event.
 *
 *   2. The three Sentry call sites use namespaced keys
 *      (`reset:RESEND_API_KEY_MISSING`, `reset:RESEND_SEND_ERROR`,
 *      `reset:RESEND_THREW`), so a hit on one branch cannot silence
 *      another. That means each branch can be exercised exactly once
 *      across the whole file without any extra reset machinery.
 *
 * Each test below picks one branch and asserts both halves of the
 * contract (alert tags + rate-limit dedup) in a single run.
 */
const mocks = vi.hoisted(() => ({
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    resendSend: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    auditFn: vi.fn(),
    requireAuth: vi.fn(),
    getSystemConfig: vi.fn(),
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

vi.mock("@/lib/actions/configuration", () => ({
    getSystemConfig: (...args: unknown[]) => mocks.getSystemConfig(...args),
}));

import { requestPasswordReset } from "@/lib/actions/auth-actions";

const ORIGINAL_ENV = { ...process.env };

describe("requestPasswordReset — Sentry alerts (task #8 contract)", () => {
    beforeEach(() => {
        mocks.captureMessage.mockReset();
        mocks.captureException.mockReset();
        mocks.resendSend.mockReset();
        mocks.findUnique.mockReset();
        mocks.update.mockReset();
        mocks.auditFn.mockReset();
        mocks.requireAuth.mockReset();
        mocks.getSystemConfig.mockReset();

        process.env = { ...ORIGINAL_ENV };
        process.env.NEXTAUTH_URL = "https://app.test";
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("RESEND_API_KEY missing → captureMessage with area=auth.reset, reason=RESEND_API_KEY_MISSING + rate-limited to 1/hour", async () => {
        delete process.env.RESEND_API_KEY;

        const first = await requestPasswordReset("user-a@example.com");
        const second = await requestPasswordReset("user-b@example.com");

        // The user-facing answer is intentionally generic; the alert
        // is the only signal the team gets that email is misconfigured.
        expect(first.success).toBe(true);
        expect(second.success).toBe(true);

        expect(mocks.captureMessage).toHaveBeenCalledTimes(1);

        const [message, options] = mocks.captureMessage.mock.calls[0] as [
            string,
            { level?: string; tags?: Record<string, string> },
        ];
        expect(message).toMatch(/RESEND_API_KEY/);
        expect(options.level).toBe("error");
        expect(options.tags).toEqual({
            area: "auth.reset",
            reason: "RESEND_API_KEY_MISSING",
        });

        // The missing-key path must short-circuit before touching the DB
        // or Resend. Otherwise the test would also hit the SEND_ERROR /
        // THREW branches and pollute their alert budgets for the rest
        // of this file.
        expect(mocks.findUnique).not.toHaveBeenCalled();
        expect(mocks.resendSend).not.toHaveBeenCalled();
        expect(mocks.captureException).not.toHaveBeenCalled();
    });

    it('RESEND_API_KEY="" (empty string) goes through the same missing-key short-circuit', async () => {
        // The runbook §5.1 says "vacía" (empty) — ops can both leave the
        // var unset and explicitly set it to "" in a .env, and the action
        // must treat both identically. We can't re-assert the captureMessage
        // count here because the previous test already consumed this
        // process's per-hour budget for `reset:RESEND_API_KEY_MISSING`
        // (which is exactly the rate-limit invariant we want preserved).
        // Instead we verify the short-circuit fingerprint: no DB lookup,
        // no Resend call, no exception alert — proof the empty string
        // followed the missing-key branch and not the happy path.
        process.env.RESEND_API_KEY = "";

        const result = await requestPasswordReset("empty@example.com");

        expect(result.success).toBe(true);
        expect(mocks.findUnique).not.toHaveBeenCalled();
        expect(mocks.resendSend).not.toHaveBeenCalled();
        expect(mocks.captureException).not.toHaveBeenCalled();
    });

    it("resend.emails.send returns { error } → captureException with reason=RESEND_SEND_ERROR + rate-limited to 1/hour", async () => {
        process.env.RESEND_API_KEY = "re_test_key";
        mocks.findUnique.mockResolvedValue({
            id: "user-1",
            email: "send-error@example.com",
        });
        mocks.update.mockResolvedValue({});

        const sendError = { name: "ResendError", message: "rejected by provider" };
        mocks.resendSend.mockResolvedValue({ data: null, error: sendError });

        const first = await requestPasswordReset("send-error@example.com");
        const second = await requestPasswordReset("send-error@example.com");

        expect(first.success).toBe(true);
        expect(second.success).toBe(true);

        // Resend was attempted both times; only one alert should escape.
        expect(mocks.resendSend).toHaveBeenCalledTimes(2);
        expect(mocks.captureException).toHaveBeenCalledTimes(1);

        const [capturedError, options] = mocks.captureException.mock.calls[0] as [
            unknown,
            { tags?: Record<string, string> },
        ];
        expect(capturedError).toBe(sendError);
        expect(options.tags).toEqual({
            area: "auth.reset",
            reason: "RESEND_SEND_ERROR",
        });
        expect(mocks.captureMessage).not.toHaveBeenCalled();
    });

    it("resend.emails.send throws → captureException with reason=RESEND_THREW + rate-limited to 1/hour", async () => {
        process.env.RESEND_API_KEY = "re_test_key";
        mocks.findUnique.mockResolvedValue({
            id: "user-2",
            email: "thrower@example.com",
        });
        mocks.update.mockResolvedValue({});

        const thrown = new Error("network blew up");
        mocks.resendSend.mockRejectedValue(thrown);

        const first = await requestPasswordReset("thrower@example.com");
        const second = await requestPasswordReset("thrower@example.com");

        expect(first.success).toBe(true);
        expect(second.success).toBe(true);

        expect(mocks.resendSend).toHaveBeenCalledTimes(2);
        expect(mocks.captureException).toHaveBeenCalledTimes(1);

        const [capturedError, options] = mocks.captureException.mock.calls[0] as [
            unknown,
            { tags?: Record<string, string> },
        ];
        expect(capturedError).toBe(thrown);
        expect(options.tags).toEqual({
            area: "auth.reset",
            reason: "RESEND_THREW",
        });
        expect(mocks.captureMessage).not.toHaveBeenCalled();
    });
});
