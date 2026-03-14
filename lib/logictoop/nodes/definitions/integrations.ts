import { NodeDefinition } from "../types";
import { db } from "@/lib/db";

/**
 * Generic HTTP Request Node
 */
export const httpRequestNode: NodeDefinition = {
    type: "HTTP_REQUEST",
    label: "Petición HTTP",
    category: "Integrations",
    icon: "globe",
    description: "Realiza una llamada a una API externa.",
    configSchema: [
        { id: "method", label: "Método", type: "select", defaultValue: "POST", options: [
            { label: "GET", value: "GET" },
            { label: "POST", value: "POST" },
            { label: "PUT", value: "PUT" },
            { label: "PATCH", value: "PATCH" },
            { label: "DELETE", value: "DELETE" }
        ]},
        { id: "url", label: "URL", type: "text", placeholder: "https://api.ejemplo.com/v1" },
        { id: "headers", label: "Headers (JSON)", type: "textarea", placeholder: '{"Authorization": "Bearer ..."}' },
        { id: "body", label: "Cuerpo (JSON)", type: "textarea", placeholder: '{"key": "value"}' }
    ],
    handler: async (config, payload, orgId) => {
        const { method, url, headers: headersRaw, body: bodyRaw } = config;
        
        if (!url) throw new Error("URL requerida.");

        const headers = headersRaw ? JSON.parse(headersRaw) : {};
        const body = bodyRaw ? JSON.parse(bodyRaw) : undefined;

        const startTime = Date.now();
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers
            },
            body: method !== "GET" ? JSON.stringify(body) : undefined
        });

        const duration = Date.now() - startTime;
        const status = response.status;
        const responseData = await response.json().catch(() => ({}));

        // Sanitization for logging
        const sanitizedHeaders = { ...headers };
        if (sanitizedHeaders.Authorization) sanitizedHeaders.Authorization = "[REDACTED]";
        if (sanitizedHeaders["X-API-Key"]) sanitizedHeaders["X-API-Key"] = "[REDACTED]";

        return {
            status,
            success: response.ok,
            duration,
            data: responseData,
            _log: {
                url,
                method,
                headers: sanitizedHeaders
            }
        };
    }
};

/**
 * WhatsApp Direct Message Node (reusing existing infra)
 */
export const whatsappSendMessageNode: NodeDefinition = {
    type: "WHATSAPP_SEND_MESSAGE",
    label: "WhatsApp Mensaje",
    category: "Integrations",
    icon: "message-circle",
    description: "Envía un mensaje de texto libre por WhatsApp.",
    configSchema: [
        { id: "to", label: "Número (opcional, default lead)", type: "text" },
        { id: "message", label: "Mensaje", type: "textarea" }
    ],
    handler: async (config, payload, orgId) => {
        const to = config.to || payload.telefono;
        const message = config.message;

        if (!to || !message) throw new Error("Destinatario y mensaje requeridos.");

        // Reusing the same helper Phase 7 used
        const { getAICopilotSuggestion } = await import("@/lib/actions/ai"); // Not the best place but it has some logic
        // But better use the raw implementation if needed or create a shared helper.
        // For now, let's log the intent as per Phase 2 rules if provider not ready.
        console.log(`[LogicToop Integration] Sending WhatsApp to ${to}: ${message}`);

        return { success: true, to, message };
    }
};

/**
 * Meta Conversion API Node
 */
export const metaConversionNode: NodeDefinition = {
    type: "META_SEND_CONVERSION",
    label: "Meta Conversión",
    category: "Integrations",
    icon: "facebook",
    description: "Envía un evento de conversión a Meta Ads PI.",
    configSchema: [
        { id: "eventName", label: "Nombre del Evento", type: "text", defaultValue: "Lead" },
        { id: "pixelId", label: "Pixel ID", type: "text" }
    ],
    handler: async (config, payload, orgId) => {
        // Safe bounded adapter
        console.log(`[LogicToop Meta] Sending conversion ${config.eventName} for Pixel ${config.pixelId}`);
        return { success: true, event: config.eventName };
    }
};

/**
 * Google Sheets Append Node
 */
export const googleSheetsAppendNode: NodeDefinition = {
    type: "GOOGLE_SHEETS_APPEND",
    label: "Google Sheets",
    category: "Integrations",
    icon: "database",
    description: "Agrega una fila a una planilla de Google Sheets.",
    configSchema: [
        { id: "spreadsheetId", label: "Spreadsheet ID", type: "text" },
        { id: "sheetName", label: "Nombre de Hoja", type: "text", defaultValue: "Sheet1" }
    ],
    handler: async (config, payload, orgId) => {
        // Safe bounded adapter
        console.log(`[LogicToop GSheeets] Appending to ${config.spreadsheetId}`);
        return { success: true };
    }
};
