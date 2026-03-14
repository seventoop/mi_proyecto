import { callAI } from "../ai/client";
import { nodeRegistry } from "../nodes/nodeRegistry";
import { initNodeRegistry } from "../nodes";

export interface ParsedIntent {
  orgId: string;
  rawIntent: string;
  type: string;
  targetEntity: string;
  businessGoal: string;
  inferredTrigger: string;
  inferredActions: any[];
  confidence: number;
  explanation: string;
}

const INTENT_SYSTEM_PROMPT = (availableNodes: string) => `
Eres el Cerebro de Orquestación de LogicToop v2.
Tu objetivo es traducir la intención de automatización de un usuario a una estructura técnica de workflow.

NODOS DISPONIBLES:
${availableNodes}

TRIGGERS OFICIALES SOPORTADOS:
- NEW_LEAD: Se dispara cuando entra un lead nuevo.
- LEAD_UPDATE: Se dispara cuando cambia el estado de un lead.
- LEAD_NO_RESPONSE: Se dispara cuando un lead no es contactado.
- RESERVA_CREATED: Se dispara al crear una reserva.
- PROYECTO_PUBLISHED: Se dispara al publicar un proyecto.

REGLAS CRÍTICAS:
1. NO USES TRIGGERS GENÉRICOS como "SCHEDULED" o "MANUAL". Solo usa los TRIGGERS OFICIALES.
2. REPRESENTACIÓN DEL TIEMPO: Los retrasos o esperas (ej: "después de 24h") DEBEN mapearse usando el nodo "WAIT" en la secuencia de acciones, o configuraciones de tiempo dentro de los nodos soportados.
3. EJEMPLO: "Follow up stale leads after 24 hours" -> Trigger: LEAD_NO_RESPONSE, Acciones: [WAIT {duration: 24h}, AI_AGENT {objective: followup}].
4. Responde ÚNICAMENTE en JSON.
5. El orgId debe preservarse.
6. Si la confianza es < 0.7, explica claramente las dudas.

JSON Schema:
{
  "type": "string (categoría de automatización)",
  "targetEntity": "string (lead, investor, etc.)",
  "businessGoal": "string (resumen del objetivo)",
  "inferredTrigger": "string (tipo de trigger)",
  "inferredActions": [
    { "type": "string (tipo de nodo)", "config": { "revelant_config": "..." } }
  ],
  "confidence": number (0-1),
  "explanation": "Breve explicación de por qué elegiste esta estructura"
}
`;

export async function parseIntent(orgId: string, rawIntent: string): Promise<ParsedIntent> {
  // Ensure registry is ready
  initNodeRegistry();
  
  const nodes = nodeRegistry.list().map(n => 
    `- ${n.type}: ${n.description} (Category: ${n.category})`
  ).join("\n");

  const systemPrompt = INTENT_SYSTEM_PROMPT(nodes);
  
  const result = await callAI(
    `INTENCIÓN: "${rawIntent}"\nOrgId: ${orgId}`,
    systemPrompt,
    { jsonMode: true, temperature: 0.3 }
  );

  return {
    orgId,
    rawIntent,
    ...result
  };
}
