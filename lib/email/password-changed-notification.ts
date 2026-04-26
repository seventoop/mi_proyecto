/**
 * Sends a "your password was changed" confirmation email to the account
 * owner whenever the password is updated successfully.
 *
 * This closes the security loop opened by Task #16: the dashboard already
 * shows the "last password change" timestamp, but the user only sees it
 * if they navigate there. This notification reaches them automatically so
 * an unauthorized change (admin CLI, attacker who hijacked the reset flow)
 * surfaces in their inbox in real time.
 *
 * Design notes:
 *   - This file deliberately uses Resend directly (mirroring the pattern
 *     in `lib/actions/auth-actions.ts`) instead of `lib/mail.ts`. Security
 *     notifications must NEVER be silenced by the
 *     `EMAIL_NOTIFICATIONS_ENABLED` SystemConfig flag — a deployment
 *     that disabled marketing notifications must still warn the user
 *     about a password change.
 *   - The function NEVER throws. It logs to Sentry (rate-limited per
 *     process to avoid alert storms) and returns to the caller, so a
 *     mail-provider outage cannot break the password-change flow.
 *   - Sentry alerts are namespaced with `pwd-changed:` keys so failures
 *     here cannot silence the alert budgets used by `auth.reset` /
 *     `auth.setup` (and vice versa).
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Indicates which surface triggered the password change. Used to render
 * a human-readable line in the email and as a Sentry tag for triage.
 */
export type PasswordChangeSource =
    | "SELFSERVICE_RESET" // user used /forgot-password and the token-reset page
    | "SELFSERVICE_SET" // Google-only user added a password via /dashboard/configuracion
    | "ADMIN_CLI"; // operator ran scripts/set-user-password.ts

interface SendPasswordChangedNotificationParams {
    email: string;
    userId: string;
    ip: string | null;
    userAgent: string | null;
    /** When the change was applied. Defaults to `new Date()`. */
    when?: Date;
    source: PasswordChangeSource;
}

const ALERT_RATE_LIMIT_MS = 60 * 60 * 1000;
const lastAlertAt = new Map<string, number>();

function shouldEmitAlert(key: string): boolean {
    const now = Date.now();
    const last = lastAlertAt.get(key) ?? 0;
    if (now - last < ALERT_RATE_LIMIT_MS) {
        return false;
    }
    lastAlertAt.set(key, now);
    return true;
}

function describeSource(source: PasswordChangeSource): string {
    switch (source) {
        case "SELFSERVICE_RESET":
            return "Usaste el enlace de \"Olvidé mi contraseña\".";
        case "SELFSERVICE_SET":
            return "Agregaste una contraseña a tu cuenta de Google desde tu perfil.";
        case "ADMIN_CLI":
            return "Un administrador la actualizó desde la consola interna de SevenToop.";
    }
}

function formatWhen(when: Date): string {
    // ISO-like in UTC plus a humanized hint. We do not know the user's
    // timezone here, so UTC is the only honest answer; the dashboard
    // shows the local-time version.
    return `${when.toISOString()} (UTC)`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Best-effort delivery of the password-changed notification.
 *
 * This function is fire-and-forget from the caller's perspective: it
 * resolves to `{ sent: boolean }` but the password-change flow must NOT
 * branch on the result. A failure here is a monitoring concern, not a
 * user-facing error.
 */
export async function sendPasswordChangedNotification(
    params: SendPasswordChangedNotificationParams,
): Promise<{ sent: boolean }> {
    const { email, userId, ip, userAgent, source } = params;
    const when = params.when ?? new Date();
    const emailMask = email.substring(0, 3) + "***";

    if (!process.env.RESEND_API_KEY) {
        console.warn(
            `[pwd-changed] RESEND_API_KEY missing — notification not sent for email=${emailMask} source=${source}`,
        );
        if (shouldEmitAlert("pwd-changed:RESEND_API_KEY_MISSING")) {
            Sentry.captureMessage(
                "RESEND_API_KEY missing — password-changed notification not sent",
                {
                    level: "error",
                    tags: {
                        area: "auth.password_changed",
                        reason: "RESEND_API_KEY_MISSING",
                        source,
                    },
                },
            );
        }
        return { sent: false };
    }

    const ipDisplay = ip ?? "desconocida";
    const uaDisplay = userAgent ?? "desconocido";
    const safeIp = escapeHtml(ipDisplay);
    const safeUa = escapeHtml(uaDisplay);
    const safeWhen = escapeHtml(formatWhen(when));
    const safeSourceLine = escapeHtml(describeSource(source));

    const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                    <h2>Tu contraseña fue actualizada</h2>
                    <p>Te avisamos que la contraseña de tu cuenta de SevenToop fue actualizada.</p>
                    <ul style="line-height: 1.6;">
                        <li><strong>Fecha:</strong> ${safeWhen}</li>
                        <li><strong>IP:</strong> ${safeIp}</li>
                        <li><strong>Dispositivo / navegador:</strong> ${safeUa}</li>
                    </ul>
                    <p>${safeSourceLine}</p>
                    <p style="margin-top: 16px;">
                        <strong>¿No fuiste vos?</strong> Escribinos cuanto antes a
                        <a href="mailto:soporte@seventoop.com">soporte@seventoop.com</a>
                        para recuperar el acceso y revisar la actividad de tu cuenta.
                    </p>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        Si fuiste vos, podés ignorar este aviso.
                    </p>
                    <p>— Equipo SevenToop</p>
                </div>
                `;

    const text =
        `Tu contraseña de SevenToop fue actualizada.\n\n` +
        `Fecha: ${formatWhen(when)}\n` +
        `IP: ${ipDisplay}\n` +
        `Dispositivo / navegador: ${uaDisplay}\n\n` +
        `${describeSource(source)}\n\n` +
        `Si no fuiste vos, escribinos a soporte@seventoop.com cuanto antes ` +
        `para recuperar el acceso y revisar la actividad de tu cuenta.\n\n` +
        `— Equipo SevenToop`;

    try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error: sendError } = await resend.emails.send({
            from: "SevenToop <noreply@seventoop.com>",
            to: email,
            subject: "Tu contraseña fue actualizada — SevenToop",
            html,
            text,
        });

        if (sendError) {
            console.error(
                `[pwd-changed] resend.emails.send failed for email=${emailMask} source=${source}:`,
                sendError,
            );
            if (shouldEmitAlert("pwd-changed:RESEND_SEND_ERROR")) {
                Sentry.captureException(sendError, {
                    tags: {
                        area: "auth.password_changed",
                        reason: "RESEND_SEND_ERROR",
                        source,
                    },
                    extra: { userId },
                });
            }
            return { sent: false };
        }

        console.log(
            `[pwd-changed] notification sent for email=${emailMask} source=${source} resendId=${data?.id ?? "(none)"}`,
        );
        return { sent: true };
    } catch (sendErr) {
        console.error(
            `[pwd-changed] resend.emails.send threw for email=${emailMask} source=${source}:`,
            sendErr,
        );
        if (shouldEmitAlert("pwd-changed:RESEND_THREW")) {
            Sentry.captureException(sendErr, {
                tags: {
                    area: "auth.password_changed",
                    reason: "RESEND_THREW",
                    source,
                },
                extra: { userId },
            });
        }
        return { sent: false };
    }
}
