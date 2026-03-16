import { NodeDefinition } from "../types";

export const webhookTriggerNode: NodeDefinition = {
    type: "WEBHOOK_TRIGGER",
    label: "Webhook External",
    category: "Triggers",
    icon: "zap",
    description: "Dispara el flujo mediante una llamada HTTP externa.",
    configSchema: [
        { id: "secret", label: "Webhook Secret", type: "text", placeholder: "clave-secreta-para-validar" },
        { id: "allowedIps", label: "IPs Permitidas (comma separated)", type: "text", placeholder: "* (todas)" }
    ],
    handler: async (config, payload, orgId) => {
        // Triggers don't execute logic in dispatcher, they just provide metadata
        return payload;
    }
};
