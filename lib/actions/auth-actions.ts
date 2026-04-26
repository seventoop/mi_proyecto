"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { sendTransactionalEmail } from "@/lib/mail";
import { requireAuth } from "@/lib/guards";

const resetRequestSchema = z.object({
    email: z.string().email("Email inválido"),
});

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
            } else {
                console.log(`[reset] email sent for email=${emailMask} resendId=${data?.id ?? "(none)"}`);
            }
        } catch (sendErr) {
            console.error(`[reset] resend.emails.send threw for email=${emailMask}:`, sendErr);
        }

        return { success: true, message: "Si el email existe, se enviarán las instrucciones." };

    } catch (error) {
        console.error("[AUTH_RESET_REQUEST_ERROR]", error);
        return { success: false, error: "Error al procesar la solicitud" };
    }
}

/**
 * Resets the password using a valid token.
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
            action: "AUTH_PASSWORD_RESET_SUCCESS",
            entity: "User",
            entityId: user.id,
            details: { method: "TOKEN" }
        });

        return { success: true, message: "Contraseña actualizada exitosamente" };

    } catch (error) {
        console.error("[AUTH_RESET_PASSWORD_ERROR]", error);
        return { success: false, error: "Error al restablecer la contraseña" };
    }
}
