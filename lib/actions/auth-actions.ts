"use server";

import prisma from "@/lib/db";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { sendTransactionalEmail } from "@/lib/mail";

const resetRequestSchema = z.object({
    email: z.string().email("Email inválido"),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token requerido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

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

        const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
        });

        if (!user) {
            // Return success even if user not found to prevent user enumeration
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

        // ACTIVAR: requiere RESEND_API_KEY en .env
        /*
        const emailRes = await sendTransactionalEmail({
          to: user.email,
          subject: "Restablecer tu contraseña - SevenToop",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
              <h2>Restablecer Contraseña</h2>
              <p>Has solicitado restablecer tu contraseña en SevenToop.</p>
              <p>Haz clic en el siguiente botón para continuar:</p>
              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Restablecer Contraseña
              </a>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                Si no solicitaste este cambio, puedes ignorar este correo. El link expira en 1 hora.
              </p>
            </div>
          `,
        });
        */

        console.log(`[AUTH] Password reset requested for ${email}. Link: ${resetLink}`);
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

        return { success: true, message: "Contraseña actualizada exitosamente" };

    } catch (error) {
        console.error("[AUTH_RESET_PASSWORD_ERROR]", error);
        return { success: false, error: "Error al restablecer la contraseña" };
    }
}
