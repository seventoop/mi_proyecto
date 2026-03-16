import { NodeDefinition } from "../types";
import { runAgent } from "../../agents/agentRuntime";
import { db } from "@/lib/db";

const AGENT_BASE_PROMPT = `Eres un agente de IA para Seventoop LogicToop. 
Tu misión es ayudar a gestionar leads inmobiliarios de manera eficiente.
Siempre respeta el orgId del contexto y usa las herramientas disponibles para actuar.
Sé profesional, conciso y orientado a resultados.`;

export const aiAgentSalesNode: NodeDefinition = {
    type: "AI_AGENT_SALES",
    label: "Agente de Ventas",
    category: "Agents",
    icon: "user-check",
    description: "Agente autónomo orientado a la conversión y venta.",
    configSchema: [
        { id: "instructions", label: "Instrucciones Específicas", type: "textarea", placeholder: "Ej: Enfócate en inversores de pozo." },
        { id: "maxSteps", label: "Pasos máximos", type: "number", defaultValue: 3 }
    ],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        if (!leadId) throw new Error("Falta leadId.");

        const lead = await db.lead.findUnique({ where: { id: leadId }, include: { proyecto: true } });
        if (!lead) throw new Error("Lead no encontrado.");

        const systemPrompt = `${AGENT_BASE_PROMPT}\n\nROL: AGENTE DE VENTAS\nINSTRUCCIONES: ${config.instructions || 'Ayuda al lead en su proceso de compra.'}`;
        const userPrompt = `Analiza al lead ${lead.nombre} interesado en ${lead.proyecto?.nombre || 'desconocido'}. Mensaje inicial: ${lead.mensaje || 'Interesado'}. Toma las acciones necesarias para avanzar la venta.`;

        return runAgent(systemPrompt, userPrompt, { orgId, leadId, executionId: payload.executionId || "manual", payload }, { maxIterations: config.maxSteps });
    }
};

export const aiAgentFollowupNode: NodeDefinition = {
    type: "AI_AGENT_FOLLOWUP",
    label: "Agente Seguimiento",
    category: "Agents",
    icon: "repeat",
    description: "Agente encargado de reactivar leads y programar seguimientos.",
    configSchema: [
        { id: "instructions", label: "Instrucciones Específicas", type: "textarea" }
    ],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        if (!leadId) throw new Error("Falta leadId.");

        const lead = await db.lead.findUnique({ where: { id: leadId } });
        const systemPrompt = `${AGENT_BASE_PROMPT}\n\nROL: AGENTE DE SEGUIMIENTO\nINSTRUCCIONES: ${config.instructions || 'Reactiva al lead cordialmente.'}`;
        const userPrompt = `El lead ${lead?.nombre} no ha respondido. Analiza su situación y programa un seguimiento o envía un mensaje si es apropiado.`;

        return runAgent(systemPrompt, userPrompt, { orgId, leadId, executionId: payload.executionId || "manual", payload });
    }
};

export const aiAgentRouterNode: NodeDefinition = {
    type: "AI_AGENT_ROUTER",
    label: "Agente Ruteador",
    category: "Agents",
    icon: "shuffle",
    description: "Agente que decide el mejor camino para un lead basado en razonamiento complejo.",
    configSchema: [
        { id: "instructions", label: "Reglas de Ruteo", type: "textarea" }
    ],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        const systemPrompt = `${AGENT_BASE_PROMPT}\n\nROL: AGENTE RUTEADOR\nINSTRUCCIONES: ${config.instructions || 'Rutea el lead al departamento correcto.'}`;
        const userPrompt = `Analiza los datos del lead y decide si debe ir a Ventas, Inversores o Soporte. Justifica y asigna si es posible.`;

        return runAgent(systemPrompt, userPrompt, { orgId, leadId, executionId: payload.executionId || "manual", payload });
    }
};
