import { NodeDefinition } from "../types";

export const sendEmailNode: NodeDefinition = {
    type: "SEND_EMAIL_TEMPLATE",
    label: "Enviar Email",
    category: "Messaging",
    icon: "mail",
    description: "Envía un correo electrónico usando un template.",
    configSchema: [
        { id: "email", label: "Email Destino", type: "text", placeholder: "Dejar vacío para usar lead.email" },
        { id: "subject", label: "Asunto", type: "text", required: true },
        { id: "body", label: "Mensaje", type: "textarea", required: true }
    ],
    handler: async (config, payload, orgId) => {
        const { subject, body, email } = config;
        const targetEmail = email || payload.email;

        if (!targetEmail) throw new Error("No hay email de destino");

        const { sendTransactionalEmail } = await import("@/lib/mail");
        await sendTransactionalEmail({
            to: targetEmail,
            subject: subject || "Notificación",
            text: body,
            html: `<p>${body}</p>`
        });

        return { status: "SENT", target: targetEmail };
    }
};

export const sendWhatsAppNode: NodeDefinition = {
    type: "SEND_WHATSAPP_TEMPLATE",
    label: "WhatsApp Template",
    category: "Messaging",
    icon: "message-circle",
    description: "Envía un mensaje de WhatsApp (STUB).",
    configSchema: [
        { id: "templateName", label: "Template", type: "text", required: true },
        { id: "phone", label: "Teléfono", type: "text" }
    ],
    handler: async (config, payload, orgId) => {
        const { templateName, phone } = config;
        const targetPhone = phone || payload.telefono;

        if (!targetPhone) throw new Error("No hay teléfono de destino");

        console.log(`[LogicToop] [WhatsApp STUB] Sending ${templateName} to ${targetPhone}`);
        return { status: "SENT_STUB", target: targetPhone, template: templateName };
    }
};
