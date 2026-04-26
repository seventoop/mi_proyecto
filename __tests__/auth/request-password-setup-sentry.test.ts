import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Shared mocks across all tests in this file. We intentionally do NOT
 * call `vi.resetModules()` between tests because:
 *
 *   1. `requestPasswordSetup` shares its rate-limit Map (in module scope)
 *      with `requestPasswordReset` via the helper `shouldEmitAuthEmailAlert`.
 *      The contract we are testing is precisely that
 *        a) two consecutive failures of the *same kind* only emit one
 *           Sentry event per hour per key, and
 *        b) the `reset:` and `setup:` namespaces don't accidentally
 *           collide and silence each other.
 *
 *   2. Each branch (RESEND_API_KEY_MISSING, RESEND_SEND_ERROR,
 *      RESEND_THREW) uses a distinct `setup:`-prefixed key, so each one
 *      can be exercised exactly once in this file without stepping on
 *      another branch's alert budget.
 *
 *   3. There are TWO namespacing tests, one per direction:
 *        - reset → setup, exercising RESEND_THREW (placed first so it
 *          owns the THREW budget for both flows).
 *        - setup → reset, exercising RESEND_SEND_ERROR (owns the
 *          SEND_ERROR budget for both flows and folds in the rollback
 *          + audit assertions for the setup SEND_ERROR branch).
 *      The remaining setup branch (RESEND_API_KEY_MISSING) gets its
 *      own dedicated test in between.
 *
 *   4. The order matters: this suite must NOT be run with randomized
 *      test order. Vitest preserves source order by default, which is
 *      what we rely on.
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

import { requestPasswordReset, requestPasswordSetup } from "@/lib/actions/auth-actions";

const ORIGINAL_ENV = { ...process.env };

const GOOGLE_ONLY_USER = {
    id: "user-1",
    email: "google-only@example.com",
    name: "Google Only",
    password: null,
    googleId: "google-id-123",
};

describe("requestPasswordSetup — Sentry alerts (task #18 contract)", () => {
    beforeEach(() => {
        mocks.captureMessage.mockReset();
        mocks.captureException.mockReset();
        mocks.resendSend.mockReset();
        mocks.findUnique.mockReset();
        mocks.update.mockReset();
        mocks.auditFn.mockReset();
        mocks.requireAuth.mockReset();

        mocks.requireAuth.mockResolvedValue({ id: GOOGLE_ONLY_USER.id });
        mocks.update.mockResolvedValue({});

        process.env = { ...ORIGINAL_ENV };
        process.env.NEXTAUTH_URL = "https://app.test";
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("namespacing: a reset:RESEND_THREW alert does NOT silence the next setup:RESEND_THREW alert (and rate-limit holds for both)", async () => {
        // This single test owns the RESEND_THREW budget for *both* flows
        // in this file. Placing it first lets us prove two things at once
        // without resetting module state:
        //
        //   (a) Each flow is rate-limited independently to 1 alert/hour
        //       (two consecutive throws on the same flow → one alert).
        //   (b) The `reset:` and `setup:` keys live in separate buckets:
        //       after `reset:RESEND_THREW` already fired, the next
        //       `setup:RESEND_THREW` MUST still fire. If somebody ever
        //       drops the namespace prefix in `shouldEmitAuthEmailAlert`,
        //       this test breaks.
        process.env.RESEND_API_KEY = "re_test_key";
        mocks.findUnique.mockResolvedValue(GOOGLE_ONLY_USER);

        const thrown = new Error("network blew up");
        mocks.resendSend.mockRejectedValue(thrown);

        // ---- reset side: two throws → one reset alert ----
        const resetA = await requestPasswordReset(GOOGLE_ONLY_USER.email);
        const resetB = await requestPasswordReset(GOOGLE_ONLY_USER.email);
        expect(resetA.success).toBe(true);
        expect(resetB.success).toBe(true);

        expect(mocks.captureException).toHaveBeenCalledTimes(1);
        const [resetCaptured, resetOpts] = mocks.captureException.mock.calls[0] as [
            unknown,
            { tags?: Record<string, string> },
        ];
        expect(resetCaptured).toBe(thrown);
        expect(resetOpts.tags).toEqual({
            area: "auth.reset",
            reason: "RESEND_THREW",
        });

        // ---- setup side: two throws → one ADDITIONAL setup alert ----
        // If the namespacing were broken (e.g. if the helper key were
        // just "RESEND_THREW" without the `reset:` / `setup:` prefix),
        // the call below would be silenced by the reset hit above and
        // captureException would still be at 1.
        const setupA = await requestPasswordSetup();
        const setupB = await requestPasswordSetup();
        expect(setupA.success).toBe(false);
        expect(setupB.success).toBe(false);

        expect(mocks.captureException).toHaveBeenCalledTimes(2);
        const [setupCaptured, setupOpts] = mocks.captureException.mock.calls[1] as [
            unknown,
            { tags?: Record<string, string> },
        ];
        expect(setupCaptured).toBe(thrown);
        expect(setupOpts.tags).toEqual({
            area: "auth.setup",
            reason: "RESEND_THREW",
        });

        // The setup THREW branch must also roll back the token and emit
        // an AUTH_PASSWORD_SET_REQUEST_FAILED audit row each time, even
        // when the Sentry alert is rate-limited. Operators rely on the
        // audit trail (not Sentry) to count failed attempts per user.
        const rollbackUpdates = mocks.update.mock.calls.filter(
            ([arg]) =>
                (arg as { data?: { passwordResetToken?: unknown } }).data
                    ?.passwordResetToken === null,
        );
        expect(rollbackUpdates.length).toBe(2);

        const failedAudits = mocks.auditFn.mock.calls.filter(
            ([arg]) =>
                (arg as { action?: string }).action ===
                "AUTH_PASSWORD_SET_REQUEST_FAILED",
        );
        expect(failedAudits.length).toBe(2);
        expect(
            (failedAudits[0][0] as { details?: { reason?: string } }).details
                ?.reason,
        ).toBe("RESEND_THREW");

        expect(mocks.captureMessage).not.toHaveBeenCalled();
    });

    it("RESEND_API_KEY missing → captureMessage with area=auth.setup, reason=RESEND_API_KEY_MISSING + rate-limited to 1/hour", async () => {
        delete process.env.RESEND_API_KEY;
        mocks.findUnique.mockResolvedValue(GOOGLE_ONLY_USER);

        const first = await requestPasswordSetup();
        const second = await requestPasswordSetup();

        // Unlike the reset flow, setup is invoked from an authenticated
        // session, so it returns success:false with an honest error
        // message instead of pretending it sent the email. The Sentry
        // alert is still the team's only signal that email delivery is
        // misconfigured for *every* authenticated Google-only user.
        expect(first.success).toBe(false);
        expect(second.success).toBe(false);

        expect(mocks.captureMessage).toHaveBeenCalledTimes(1);

        const [message, options] = mocks.captureMessage.mock.calls[0] as [
            string,
            { level?: string; tags?: Record<string, string> },
        ];
        expect(message).toMatch(/RESEND_API_KEY/);
        expect(options.level).toBe("error");
        expect(options.tags).toEqual({
            area: "auth.setup",
            reason: "RESEND_API_KEY_MISSING",
        });

        // The missing-key path must short-circuit BEFORE issuing the
        // token (no `update` writing a token, no Resend call), otherwise
        // we'd leak a valid 1-hour token with no email to deliver it.
        expect(mocks.resendSend).not.toHaveBeenCalled();
        expect(mocks.captureException).not.toHaveBeenCalled();
        const tokenWrites = mocks.update.mock.calls.filter(
            ([arg]) =>
                typeof (arg as { data?: { passwordResetToken?: unknown } })
                    .data?.passwordResetToken === "string",
        );
        expect(tokenWrites.length).toBe(0);
    });

    it("namespacing (viceversa): a setup:RESEND_SEND_ERROR alert does NOT silence the next reset:RESEND_SEND_ERROR alert (and covers setup SEND_ERROR rollback + audit)", async () => {
        // Symmetric to the THREW test above: this one owns the
        // RESEND_SEND_ERROR budget for both flows. Firing setup FIRST
        // and reset SECOND validates the "y viceversa" half of the
        // namespacing contract — if somebody collapsed the helper key
        // back to a single "RESEND_SEND_ERROR" string, the reset alert
        // would be silenced by the earlier setup hit and this would
        // break.
        process.env.RESEND_API_KEY = "re_test_key";
        mocks.findUnique.mockResolvedValue(GOOGLE_ONLY_USER);

        const sendError = { name: "ResendError", message: "rejected by provider" };
        mocks.resendSend.mockResolvedValue({ data: null, error: sendError });

        // ---- setup side: two failures → one setup alert ----
        const setupA = await requestPasswordSetup();
        const setupB = await requestPasswordSetup();
        expect(setupA.success).toBe(false);
        expect(setupB.success).toBe(false);

        expect(mocks.resendSend).toHaveBeenCalledTimes(2);
        expect(mocks.captureException).toHaveBeenCalledTimes(1);

        const [setupCaptured, setupOpts] = mocks.captureException.mock.calls[0] as [
            unknown,
            { tags?: Record<string, string> },
        ];
        expect(setupCaptured).toBe(sendError);
        expect(setupOpts.tags).toEqual({
            area: "auth.setup",
            reason: "RESEND_SEND_ERROR",
        });

        // Even when the Sentry alert is rate-limited on the second call,
        // the per-user side effects MUST still run on every attempt:
        //   - the freshly issued token is rolled back so an undelivered
        //     link can't be replayed later,
        //   - an AUTH_PASSWORD_SET_REQUEST_FAILED audit row is written
        //     so the team can count failures per user from the DB.
        const setupRollbacks = mocks.update.mock.calls.filter(
            ([arg]) =>
                (arg as { data?: { passwordResetToken?: unknown } }).data
                    ?.passwordResetToken === null,
        );
        expect(setupRollbacks.length).toBe(2);

        const setupFailedAudits = mocks.auditFn.mock.calls.filter(
            ([arg]) =>
                (arg as { action?: string }).action ===
                "AUTH_PASSWORD_SET_REQUEST_FAILED",
        );
        expect(setupFailedAudits.length).toBe(2);
        expect(
            (setupFailedAudits[0][0] as { details?: { reason?: string } })
                .details?.reason,
        ).toBe("RESEND_SEND_ERROR");

        // ---- reset side: two failures → one ADDITIONAL reset alert ----
        // If the namespacing were broken, the call below would be
        // silenced by the setup hit above and captureException would
        // still be at 1.
        const resetA = await requestPasswordReset(GOOGLE_ONLY_USER.email);
        const resetB = await requestPasswordReset(GOOGLE_ONLY_USER.email);
        expect(resetA.success).toBe(true);
        expect(resetB.success).toBe(true);

        expect(mocks.captureException).toHaveBeenCalledTimes(2);
        const [resetCaptured, resetOpts] = mocks.captureException.mock.calls[1] as [
            unknown,
            { tags?: Record<string, string> },
        ];
        expect(resetCaptured).toBe(sendError);
        expect(resetOpts.tags).toEqual({
            area: "auth.reset",
            reason: "RESEND_SEND_ERROR",
        });

        expect(mocks.captureMessage).not.toHaveBeenCalled();
    });
});
