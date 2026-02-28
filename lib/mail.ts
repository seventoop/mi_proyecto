import { Resend } from 'resend';
import { getSystemConfig } from './actions/configuration';

const resend = new Resend(process.env.RESEND_API_KEY || "re_123");

interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

/**
 * Sends a transactional email using Resend.
 * Checks for EMAIL_NOTIFICATIONS_ENABLED in SystemConfig.
 */
export async function sendTransactionalEmail({ to, subject, html, text }: SendEmailParams) {
    try {
        // 1. Check Feature Flag
        const config = await getSystemConfig("EMAIL_NOTIFICATIONS_ENABLED");
        const isEnabled = config.success ? config.value === "true" : process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";

        if (!isEnabled) {
            console.log(`[MAIL_DISABLED] Email to ${to} not sent (Feature flag off)`);
            return { success: false, error: "Notificaciones por email deshabilitadas" };
        }

        if (!process.env.RESEND_API_KEY) {
            console.warn("[MAIL_ERROR] RESEND_API_KEY not found");
            return { success: false, error: "Configuración de email incompleta" };
        }

        // 2. Send
        const { data, error } = await resend.emails.send({
            from: process.env.MAIL_FROM || 'SevenToop <notificaciones@seventoop.com>',
            to,
            subject,
            html,
            text: text || "Notificación de SevenToop",
        });

        if (error) {
            console.error("[RESEND_ERROR]", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("[SEND_EMAIL_EXCEPTION]", error);
        return { success: false, error: "Error interno al enviar email" };
    }
}
