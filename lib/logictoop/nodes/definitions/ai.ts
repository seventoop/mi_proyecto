import { NodeDefinition } from "../types";
import { callAI } from "../../ai/client";
import { SYSTEM_PROMPTS, createLeadContextPrompt } from "../../ai/prompts";
import { Parsers } from "../../ai/parsers";
import { db } from "@/lib/db";

export const aiClassifyLeadNode: NodeDefinition = {
    type: "AI_CLASSIFY_LEAD",
    label: "IA Clasificar",
    category: "AI",
    icon: "brain",
    description: "Clasifica el lead por tipo, urgencia y sentimiento.",
    configSchema: [
        { id: "useHistory", label: "Usar historial de mensajes", type: "checkbox", defaultValue: true }
    ],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        if (!leadId) throw new Error("Falta leadId en el payload.");

        const lead = await db.lead.findUnique({
            where: { id: leadId },
            include: { proyecto: true }
        });
        if (!lead) throw new Error("Lead no encontrado.");

        let extraContext = "";
        if (config.useHistory) {
            const history = await db.leadMessage.findMany({
                where: { leadId },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            extraContext = history.reverse().map(m => `${m.role}: ${m.content}`).join("\n");
        }

        const prompt = createLeadContextPrompt(lead, extraContext);
        const rawResult = await callAI(prompt, SYSTEM_PROMPTS.CLASSIFY);
        const result = Parsers.validateClassification(rawResult);

        return result;
    }
};

export const aiScoreLeadNode: NodeDefinition = {
    type: "AI_SCORE_LEAD",
    label: "IA Scoring",
    category: "AI",
    icon: "star",
    description: "Calcula un puntaje de calidad para el lead (0-100).",
    configSchema: [],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        if (!leadId) throw new Error("Falta leadId.");

        const lead = await db.lead.findUnique({
            where: { id: leadId },
            include: { proyecto: true }
        });
        if (!lead) throw new Error("Lead no encontrado.");

        const prompt = createLeadContextPrompt(lead);
        const rawResult = await callAI(prompt, SYSTEM_PROMPTS.SCORE);
        const result = Parsers.validateScore(rawResult);

        // Update lead score in DB
        await db.lead.update({
            where: { id: leadId },
            data: { aiQualificationScore: result.score }
        });

        return result;
    }
};

export const aiSummarizeNode: NodeDefinition = {
    type: "AI_SUMMARIZE_LEAD_CONTEXT",
    label: "IA Resumen",
    category: "AI",
    icon: "file-text",
    description: "Genera un resumen ejecutivo del contexto del lead.",
    configSchema: [],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        if (!leadId) throw new Error("Falta leadId.");

        const lead = await db.lead.findUnique({
            where: { id: leadId },
            include: { proyecto: true }
        });
        if (!lead) throw new Error("Lead no encontrado.");

        const history = await db.leadMessage.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        const extraContext = history.reverse().map(m => `${m.role}: ${m.content}`).join("\n");

        const prompt = createLeadContextPrompt(lead, extraContext);
        const rawResult = await callAI(prompt, SYSTEM_PROMPTS.SUMMARIZE);
        const result = Parsers.validateSummary(rawResult);

        // Update lead summary in DB
        await db.lead.update({
            where: { id: leadId },
            data: { lastAiSummary: result.summary }
        });

        return result;
    }
};

export const aiRouteNode: NodeDefinition = {
    type: "AI_ROUTE_LEAD",
    label: "IA Ruteo",
    category: "AI",
    icon: "navigation",
    description: "Recomienda el mejor canal para rutear el lead.",
    configSchema: [],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        if (!leadId) throw new Error("Falta leadId.");

        const lead = await db.lead.findUnique({
            where: { id: leadId },
            include: { proyecto: true }
        });
        if (!lead) throw new Error("Lead no encontrado.");

        const prompt = createLeadContextPrompt(lead);
        const rawResult = await callAI(prompt, SYSTEM_PROMPTS.ROUTE);
        const result = Parsers.validateRoute(rawResult);

        return result;
    }
};
