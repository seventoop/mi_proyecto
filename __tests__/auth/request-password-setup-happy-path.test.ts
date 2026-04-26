import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Happy-path coverage for `requestPasswordSetup` (task #25).
 *
 * The Sentry-focused suite (`request-password-setup-sentry.test.ts`)
 * already pins down the three failure branches (RESEND_API_KEY_MISSING,
 * RESEND_SEND_ERROR, RESEND_THREW): for each one it asserts the alert,
 * the token rollback, and the AUTH_PASSWORD_SET_REQUEST_FAILED audit
 * row. What it does NOT cover — and what monitoring + runbooks rely on —
 * is the success branch. Operators read "one row with action
 * AUTH_PASSWORD_SET_REQUESTED" as proof that a real link was delivered
 * to a real inbox; if anybody ever moves the audit call before the email
 * send, or changes the `details` shape, that invariant silently breaks.
 *
 * This file lives in its own module so it never has to share the
 * rate-limit Map maintained at module scope by `shouldEmitAuthEmailAlert`
 * with the failure suite. The happy path doesn't touch that helper, but
 * keeping the suites isolated removes any chance of test-ordering
 * interactions between them.
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

const GOOGLE_ONLY_USER = {
    id: "user-1",
    email: "google-only@example.com",
    name: "Google Only",
    password: null,
    googleId: "google-id-123",
};

describe("requestPasswordSetup — happy path (task #25 contract)", () => {
    beforeEach(() => {
        mocks.captureMessage.mockReset();
        mocks.captureException.mockReset();
        mocks.resendSend.mockReset();
        mocks.findUnique.mockReset();
        mocks.update.mockReset();
        mocks.auditFn.mockReset();
        mocks.requireAuth.mockReset();

        mocks.requireAuth.mockResolvedValue({ id: GOOGLE_ONLY_USER.id });
        mocks.findUnique.mockResolvedValue(GOOGLE_ONLY_USER);
        mocks.update.mockResolvedValue({});

        process.env = { ...ORIGINAL_ENV };
        process.env.NEXTAUTH_URL = "https://app.test";
        process.env.RESEND_API_KEY = "re_test_key";
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("sends the email, writes a single AUTH_PASSWORD_SET_REQUESTED audit row, and never rolls back the token or alerts Sentry", async () => {
        // Resend's success shape: `data` populated, `error` explicitly null.
        // The action code branches on `if (sendError)`, so any non-null
        // `error` would be treated as a failure — using `null` here is
        // what makes this the happy path.
        mocks.resendSend.mockResolvedValue({
            data: { id: "resend-message-id-xyz" },
            error: null,
        });

        const result = await requestPasswordSetup();

        // (a) Neither Sentry channel should fire on the happy path.
        // captureMessage is reserved for RESEND_API_KEY_MISSING and
        // captureException for the two delivery-failure branches.
        expect(mocks.captureException).not.toHaveBeenCalled();
        expect(mocks.captureMessage).not.toHaveBeenCalled();

        // (b) Exactly one user.update call: the one that writes the
        // freshly issued token + 1h expiry. The rollback `update`
        // (data.passwordResetToken === null) belongs only to the failure
        // branches and must never run when the email actually went out.
        expect(mocks.update).toHaveBeenCalledTimes(1);
        const [updateArgs] = mocks.update.mock.calls[0] as [
            {
                where: { id: string };
                data: {
                    passwordResetToken?: unknown;
                    passwordResetExpires?: unknown;
                };
            },
        ];
        expect(updateArgs.where).toEqual({ id: GOOGLE_ONLY_USER.id });
        expect(typeof updateArgs.data.passwordResetToken).toBe("string");
        expect((updateArgs.data.passwordResetToken as string).length).toBeGreaterThan(0);
        expect(updateArgs.data.passwordResetExpires).toBeInstanceOf(Date);

        const rollbackUpdates = mocks.update.mock.calls.filter(
            ([arg]) =>
                (arg as { data?: { passwordResetToken?: unknown } }).data
                    ?.passwordResetToken === null,
        );
        expect(rollbackUpdates.length).toBe(0);

        // The email itself must have been sent to the user's address.
        expect(mocks.resendSend).toHaveBeenCalledTimes(1);
        const [sendArgs] = mocks.resendSend.mock.calls[0] as [
            { to: string; subject: string; html: string },
        ];
        expect(sendArgs.to).toBe(GOOGLE_ONLY_USER.email);

        // (c) Exactly one audit row, action AUTH_PASSWORD_SET_REQUESTED,
        // with the details shape that monitoring queries depend on.
        // Monitoring assumes: one row of this action ⇒ one delivered link.
        expect(mocks.auditFn).toHaveBeenCalledTimes(1);
        const [auditArgs] = mocks.auditFn.mock.calls[0] as [
            {
                userId: string;
                action: string;
                entity: string;
                entityId: string;
                details: {
                    method: string;
                    previouslyHadPassword: boolean;
                    hasGoogle: boolean;
                };
            },
        ];
        expect(auditArgs.action).toBe("AUTH_PASSWORD_SET_REQUESTED");
        expect(auditArgs.userId).toBe(GOOGLE_ONLY_USER.id);
        expect(auditArgs.entity).toBe("User");
        expect(auditArgs.entityId).toBe(GOOGLE_ONLY_USER.id);
        expect(auditArgs.details).toEqual({
            method: "PROFILE_SELFSERVICE",
            previouslyHadPassword: false,
            hasGoogle: true,
        });

        // Call-order invariant: the email send MUST complete before the
        // success audit row is written. The task rationale calls this
        // out explicitly — monitoring queries treat
        // AUTH_PASSWORD_SET_REQUESTED as proof that the link went out,
        // so if anybody ever moves the audit before the resend call, the
        // row could exist for an email that was never delivered. We
        // assert the order via vitest invocationCallOrder rather than
        // restructuring the mocks, so it stays robust to future
        // refactors that add more `update` or `audit` calls around the
        // happy path.
        expect(mocks.resendSend.mock.invocationCallOrder[0]).toBeLessThan(
            mocks.auditFn.mock.invocationCallOrder[0],
        );

        // (d) Returned payload: success + a message that names the
        // user's email. The UI renders this string verbatim, so dropping
        // the email from it would make the "check your inbox" flow
        // confusing for the user.
        expect(result.success).toBe(true);
        expect((result as { message?: string }).message).toBeDefined();
        expect((result as { message: string }).message).toContain(
            GOOGLE_ONLY_USER.email,
        );
    });
});
