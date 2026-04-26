"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { sendTransactionalEmail } from "@/lib/mail";
import { requireAuth } from "@/lib/guards";

const resetRequestSchema = z.object({
    email: z.string().email("Email inválido"),
});

/**
 * Per-process, per-key rate limit for Sentry alerts emitted by the
 * auth email pipelines (password reset and self-service add-password).
 * We don't want a misconfigured staging deploy (or a Resend outage) to
 * fire one Sentry event per user request: the team only needs to know
 * "this is broken right now", not the volume.
 *
 * One alert per hour per `key` per Node process is enough to surface the
 * problem without paging on every retry. The Map lives in module scope
 * so it resets naturally on cold start / redeploy, which is the desired
 * behavior — a fresh deploy should re-alert if the issue persists.
 *
 * Callers MUST namespace the key by flow (e.g. `reset:RESEND_THREW`,
 * `setup:RESEND_THREW`) so a failure in the reset pipeline does not
 * silence the alert from the setup pipeline (or vice versa) for the
 * next hour. Both flows can fail independently and each one needs to
 * page on its own.
 */
const AUTH_EMAIL_ALERT_RATE_LIMIT_MS = 60 * 60 * 1000;
const authEmailAlertLastSentAt = new Map<string, number>();

function shouldEmitAuthEmailAlert(key: string): boolean {
    const now = Date.now();
    const last = authEmailAlertLastSentAt.get(key) ?? 0;
    if (now - last < AUTH_EMAIL_ALERT_RATE_LIMIT_MS) {
        return false;
    }
    authEmailAlertLastSentAt.set(key, now);
    return true;
}

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token requerido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/**
 * Activates a 48-hour demo period for the current user.
 */
export async function activateDemoMode() {
    try {
        const user = await requireAuth();
        const demoEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await prisma.user.update({
            where: { id: user.id },
            data: { demoEndsAt },
        });
        return { success: true };
    } catch (error) {
        console.error("[ACTIVATE_DEMO_ERROR]", error);
        return { success: false, error: "Error al activar el modo demo" };
    }
}

/**
 * Requests a password reset link.
 * Generates a secure token and saves it to the DB.
 */
export async function requestPasswordReset(email: string) {
    try {
        const parsed = resetRequestSchema.safeParse({ email });
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0].message };
        }

        // If email service is not configured, be honest with the user instead
        // of pretending we sent something. Also leave a server-side warning so
        // the team can detect this in production logs.
        if (!process.env.RESEND_API_KEY) {
            console.warn("[reset] RESEND_API_KEY missing — email not sent");
            if (shouldEmitAuthEmailAlert("reset:RESEND_API_KEY_MISSING")) {
                Sentry.captureMessage(
                    "RESEND_API_KEY missing — password reset email not sent",
                    {
                        level: "error",
                        tags: { area: "auth.reset", reason: "RESEND_API_KEY_MISSING" },
                    },
                );
            }
            return {
                success: true,
                message: "El envío automático de emails todavía no está habilitado. Escribinos a soporte@seventoop.com indicando tu email registrado.",
            };
        }

        const normalizedEmail = parsed.data.email.toLowerCase().trim();
        const emailMask = normalizedEmail.substring(0, 3) + "***";
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            // Anti-enumeration: same response whether user exists or not
            console.log(`[reset] request for unknown email=${emailMask} — generic response returned`);
            return { success: true, message: "Si el email existe, se enviarán las instrucciones." };
        }

        // Generate token and expiry (1 hour)
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 3600000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: token,
                passwordResetExpires: expiry,
            },
        });

        const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

        // Send Email via Resend
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        try {
            const { data, error: sendError } = await resend.emails.send({
                from: "SevenToop <noreply@seventoop.com>",
                to: user.email,
                subject: "Recuperá tu contraseña — SevenToop",
                html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                    <h2>Recuperación de contraseña</h2>
                    <p>Hacé click en el siguiente enlace para restablecer tu contraseña. El enlace expira en 1 hora.</p>
                    <a href="${resetLink}"
                       style="background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">
                        Restablecer contraseña
                    </a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        Si no solicitaste esto, ignorá este email.
                    </p>
                    <p>— Equipo SevenToop</p>
                </div>
                `,
            });

            if (sendError) {
                console.error(`[reset] resend.emails.send failed for email=${emailMask}:`, sendError);
                if (shouldEmitAuthEmailAlert("reset:RESEND_SEND_ERROR")) {
                    Sentry.captureException(sendError, {
                        tags: { area: "auth.reset", reason: "RESEND_SEND_ERROR" },
                    });
                }
            } else {
                console.log(`[reset] email sent for email=${emailMask} resendId=${data?.id ?? "(none)"}`);
            }
        } catch (sendErr) {
            console.error(`[reset] resend.emails.send threw for email=${emailMask}:`, sendErr);
            if (shouldEmitAuthEmailAlert("reset:RESEND_THREW")) {
                Sentry.captureException(sendErr, {
                    tags: { area: "auth.reset", reason: "RESEND_THREW" },
                });
            }
        }

        return { success: true, message: "Si el email existe, se enviarán las instrucciones." };

    } catch (error) {
        console.error("[AUTH_RESET_REQUEST_ERROR]", error);
        return { success: false, error: "Error al procesar la solicitud" };
    }
}

/**
 * Resets the password using a valid token.
 *
 * The audit action distinguishes two scenarios so that operators can tell
 * a "first password set" apart from a normal reset, which matters for
 * incident response on accounts that were originally Google-only:
 *
 *   - `AUTH_PASSWORD_SET_BY_USER`  → the user had no password before
 *     (e.g. a Google-only account that just self-served a password from
 *     `/dashboard/configuracion` → `requestPasswordSetup`).
 *   - `AUTH_PASSWORD_RESET_SUCCESS` → the user already had a password and
 *     just rotated it via the standard `/forgot-password` flow.
 */
export async function resetPassword(formData: z.infer<typeof resetPasswordSchema>) {
    try {
        const parsed = resetPasswordSchema.safeParse(formData);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0].message };
        }

        const { token, password } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { passwordResetToken: token },
        });

        if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
            return { success: false, error: "Token inválido o expirado" };
        }

        const previouslyHadPassword = user.password !== null;

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });

        // Centralized Forensic Audit
        const { audit } = await import("@/lib/actions/audit");
        await audit({
            userId: user.id,
            action: previouslyHadPassword ? "AUTH_PASSWORD_RESET_SUCCESS" : "AUTH_PASSWORD_SET_BY_USER",
            entity: "User",
            entityId: user.id,
            details: {
                method: "TOKEN",
                previouslyHadPassword,
                hasGoogle: user.googleId !== null,
            }
        });

        // Security loop (Task #16): notify the account owner that their
        // password just changed. We read the same headers `audit()` uses
        // so the email and the audit row reference the same IP / UA.
        // The notification is best-effort and MUST NOT break this flow.
        try {
            const { headers } = await import("next/headers");
            const { sendPasswordChangedNotification } = await import(
                "@/lib/email/password-changed-notification"
            );
            let ip: string | null = null;
            let userAgent: string | null = null;
            try {
                const h = headers();
                ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
                userAgent = h.get("user-agent") || null;
            } catch {
                // headers() may not be available in all server contexts
            }
            await sendPasswordChangedNotification({
                userId: user.id,
                email: user.email,
                ip,
                userAgent,
                source: previouslyHadPassword ? "SELFSERVICE_RESET" : "SELFSERVICE_SET",
            });
        } catch (notifyErr) {
            // Defense in depth: the helper already swallows errors, but
            // if the dynamic import itself blows up we still don't want
            // to fail the user's password change. Mirror the helper's
            // own observability contract so this edge case still pages.
            console.error("[reset] password-changed notification failed to dispatch:", notifyErr);
            if (shouldEmitAuthEmailAlert("pwd-changed:DISPATCH_THREW")) {
                Sentry.captureException(notifyErr, {
                    tags: {
                        area: "auth.password_changed",
                        reason: "DISPATCH_THREW",
                    },
                });
            }
        }

        return {
            success: true,
            message: previouslyHadPassword
                ? "Contraseña actualizada exitosamente"
                : "Contraseña agregada exitosamente. Ya podés iniciar sesión con email y contraseña."
        };

    } catch (error) {
        console.error("[AUTH_RESET_PASSWORD_ERROR]", error);
        return { success: false, error: "Error al restablecer la contraseña" };
    }
}

/**
 * Self-service: an authenticated user requests a token to set or change
 * their password. Mirrors `requestPasswordReset` but skips the
 * anti-enumeration dance (the user is already authenticated) and emits an
 * `AUTH_PASSWORD_SET_REQUESTED` audit row so the request itself is
 * traceable, even before the user clicks the email link.
 *
 * Designed primarily for Google-only users (`has_password=false`,
 * `has_google=true`) who want to also be able to log in with email +
 * password, replacing the need for the operator-only
 * `npm run set-password` script for that population.
 *
 * The reuse of the existing `passwordResetToken` / `passwordResetExpires`
 * columns and the `/reset-password?token=...` page is intentional — there
 * is one canonical "set password via token" surface, so audit and
 * monitoring queries don't have to special-case a second flow.
 */
export async function requestPasswordSetup() {
    try {
        const sessionUser = await requireAuth();

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: {
                id: true,
                email: true,
                password: true,
                googleId: true,
            },
        });

        if (!user) {
            return { success: false, error: "Usuario no encontrado" };
        }

        const previouslyHadPassword = user.password !== null;
        const hasGoogle = user.googleId !== null;
        const emailMask = user.email.substring(0, 3) + "***";

        // Scope guard: this self-service flow exists specifically for
        // Google-only accounts that want to also be able to log in with
        // email + password (Task #7). Users who already have a password
        // should rotate it via the existing `/forgot-password` flow, which
        // is the canonical "rotate" surface and does not require us to
        // overload this entry point.
        if (previouslyHadPassword || !hasGoogle) {
            return {
                success: false,
                error: "Esta opción es solo para cuentas que entran únicamente con Google. Si ya tenés contraseña y querés cambiarla, usá '¿Olvidaste tu contraseña?' desde el login.",
            };
        }

        // Be honest if email is not configured: the user is authenticated,
        // so there is no enumeration risk and no reason to pretend it worked.
        if (!process.env.RESEND_API_KEY) {
            console.warn(`[set-password] RESEND_API_KEY missing — email not sent for email=${emailMask}`);
            if (shouldEmitAuthEmailAlert("setup:RESEND_API_KEY_MISSING")) {
                Sentry.captureMessage(
                    "RESEND_API_KEY missing — password setup email not sent",
                    {
                        level: "error",
                        tags: { area: "auth.setup", reason: "RESEND_API_KEY_MISSING" },
                    },
                );
            }
            return {
                success: false,
                error: "El envío automático de emails todavía no está habilitado. Escribinos a soporte@seventoop.com y te ayudamos a configurar tu contraseña.",
            };
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: token,
                passwordResetExpires: expiry,
            },
        });

        const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { audit } = await import("@/lib/actions/audit");

        try {
            const { data, error: sendError } = await resend.emails.send({
                from: "SevenToop <noreply@seventoop.com>",
                to: user.email,
                subject: "Agregá una contraseña a tu cuenta — SevenToop",
                html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                    <h2>Agregá una contraseña a tu cuenta</h2>
                    <p>Pediste agregar una contraseña a tu cuenta de Google desde tu perfil. Hacé click en el siguiente enlace para elegir tu contraseña. Después de fijarla, vas a poder iniciar sesión con email + contraseña y también con Google. El enlace expira en 1 hora.</p>
                    <a href="${resetLink}"
                       style="background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">
                        Agregar contraseña
                    </a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        Si no fuiste vos, ignorá este email y revisá la actividad de tu cuenta.
                    </p>
                    <p>— Equipo SevenToop</p>
                </div>
                `,
            });

            if (sendError) {
                console.error(`[set-password] resend.emails.send failed for email=${emailMask}:`, sendError);
                if (shouldEmitAuthEmailAlert("setup:RESEND_SEND_ERROR")) {
                    Sentry.captureException(sendError, {
                        tags: { area: "auth.setup", reason: "RESEND_SEND_ERROR" },
                    });
                }
                // Roll back the token: leaving it valid for 1h with no way
                // to deliver the link only widens the attack surface.
                await prisma.user.update({
                    where: { id: user.id },
                    data: { passwordResetToken: null, passwordResetExpires: null },
                });
                await audit({
                    userId: user.id,
                    action: "AUTH_PASSWORD_SET_REQUEST_FAILED",
                    entity: "User",
                    entityId: user.id,
                    details: {
                        method: "PROFILE_SELFSERVICE",
                        reason: "RESEND_SEND_ERROR",
                        previouslyHadPassword,
                        hasGoogle,
                    },
                });
                return { success: false, error: "No pudimos enviar el email. Intentá de nuevo en unos minutos." };
            }
            console.log(`[set-password] email sent for email=${emailMask} resendId=${data?.id ?? "(none)"}`);
        } catch (sendErr) {
            console.error(`[set-password] resend.emails.send threw for email=${emailMask}:`, sendErr);
            if (shouldEmitAuthEmailAlert("setup:RESEND_THREW")) {
                Sentry.captureException(sendErr, {
                    tags: { area: "auth.setup", reason: "RESEND_THREW" },
                });
            }
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordResetToken: null, passwordResetExpires: null },
            });
            await audit({
                userId: user.id,
                action: "AUTH_PASSWORD_SET_REQUEST_FAILED",
                entity: "User",
                entityId: user.id,
                details: {
                    method: "PROFILE_SELFSERVICE",
                    reason: "RESEND_THREW",
                    previouslyHadPassword,
                    hasGoogle,
                },
            });
            return { success: false, error: "No pudimos enviar el email. Intentá de nuevo en unos minutos." };
        }

        // Audit only after the email actually went out, so the audit trail
        // matches operational reality (a "requested" row implies the user
        // could click a real link).
        await audit({
            userId: user.id,
            action: "AUTH_PASSWORD_SET_REQUESTED",
            entity: "User",
            entityId: user.id,
            details: {
                method: "PROFILE_SELFSERVICE",
                previouslyHadPassword,
                hasGoogle,
            },
        });

        return {
            success: true,
            message: `Te enviamos un email a ${user.email} con un enlace para fijar tu contraseña. Expira en 1 hora.`,
        };
    } catch (error) {
        console.error("[AUTH_PASSWORD_SETUP_REQUEST_ERROR]", error);
        return { success: false, error: "Error al procesar la solicitud" };
    }
}
