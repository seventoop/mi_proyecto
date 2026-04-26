import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Unit tests for `sendPasswordChangedNotification`, the helper that
 * fires the post-change "your password was updated" email introduced
 * by Task #16.
 *
 * The integration test in `__tests__/auth/reset-password-notification.test.ts`
 * already proves the helper is wired into `resetPassword` with the right
 * email / IP / UA / source. This file pins down the helper's own
 * misconfiguration contract: when `RESEND_API_KEY` is absent we must
 *
 *   - not attempt to send (no leaked Resend SDK calls),
 *   - emit a Sentry alert namespaced as `pwd-changed:RESEND_API_KEY_MISSING`
 *     with `area=auth.password_changed`, and
 *   - rate-limit that alert to 1/hour per key per process so a
 *     misconfigured deploy doesn't page once per password change.
 *
 * The rate-limit Map lives in module scope, so we deliberately do NOT
 * call `vi.resetModules()` between tests — that's the whole point of
 * the second test, which re-enters the same branch and verifies the
 * budget was already consumed.
 */
const mocks = vi.hoisted(() => ({
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    resendSend: vi.fn(),
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

import { sendPasswordChangedNotification } from "@/lib/email/password-changed-notification";

const ORIGINAL_ENV = { ...process.env };

describe("sendPasswordChangedNotification — RESEND_API_KEY missing (task #16 contract)", () => {
    beforeEach(() => {
        mocks.captureMessage.mockReset();
        mocks.captureException.mockReset();
        mocks.resendSend.mockReset();

        process.env = { ...ORIGINAL_ENV };
        delete process.env.RESEND_API_KEY;
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("RESEND_API_KEY missing → returns { sent: false }, emits one Sentry alert with pwd-changed:RESEND_API_KEY_MISSING tags, and rate-limits a second call within the hour", async () => {
        const first = await sendPasswordChangedNotification({
            email: "victim-a@example.com",
            userId: "user-a",
            ip: "203.0.113.10",
            userAgent: "Mozilla/5.0",
            source: "SELFSERVICE_RESET",
        });
        // Same alert key on the second call — rate-limit MUST suppress
        // the duplicate Sentry event even though the helper is invoked
        // for a different user.
        const second = await sendPasswordChangedNotification({
            email: "victim-b@example.com",
            userId: "user-b",
            ip: "203.0.113.11",
            userAgent: "Mozilla/5.0",
            source: "SELFSERVICE_RESET",
        });

        // The helper never throws and never falls through to Resend
        // when the API key is missing — the user-facing flow above it
        // (resetPassword) relies on this contract.
        expect(first).toEqual({ sent: false });
        expect(second).toEqual({ sent: false });
        expect(mocks.resendSend).not.toHaveBeenCalled();
        expect(mocks.captureException).not.toHaveBeenCalled();

        // Exactly one alert in the rate-limit window proves the
        // `pwd-changed:RESEND_API_KEY_MISSING` budget is honored.
        expect(mocks.captureMessage).toHaveBeenCalledTimes(1);
        const [message, options] = mocks.captureMessage.mock.calls[0] as [
            string,
            { level?: string; tags?: Record<string, string> },
        ];
        expect(message).toMatch(/RESEND_API_KEY/);
        expect(options.level).toBe("error");
        // The `area` tag is what the on-call dashboards filter by, and
        // it MUST be `auth.password_changed` (not `auth.reset` /
        // `auth.setup`) so a misconfigured notifier doesn't get billed
        // against the wrong alert budget.
        expect(options.tags).toMatchObject({
            area: "auth.password_changed",
            reason: "RESEND_API_KEY_MISSING",
            source: "SELFSERVICE_RESET",
        });
    });

    it('RESEND_API_KEY="" (empty string) is treated as missing too', async () => {
        // Ops sometimes leave the var explicitly empty in a `.env` file
        // instead of deleting it. The helper must take the same
        // short-circuit branch in both cases.
        //
        // We can't re-assert `captureMessage` was called once here
        // because the previous test already consumed this process's
        // per-hour budget for `pwd-changed:RESEND_API_KEY_MISSING` —
        // which is exactly the rate-limit invariant we want preserved.
        // Instead we verify the short-circuit fingerprint: no Resend
        // call, no exception alert, and no NEW captureMessage call.
        process.env.RESEND_API_KEY = "";

        const result = await sendPasswordChangedNotification({
            email: "empty@example.com",
            userId: "user-empty",
            ip: null,
            userAgent: null,
            source: "ADMIN_CLI",
        });

        expect(result).toEqual({ sent: false });
        expect(mocks.resendSend).not.toHaveBeenCalled();
        expect(mocks.captureException).not.toHaveBeenCalled();
        expect(mocks.captureMessage).not.toHaveBeenCalled();
    });
});
