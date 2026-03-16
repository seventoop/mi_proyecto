/**
 * LogicToop V1 AI Prompt Templates
 */

export const SYSTEM_PROMPTS = {
    CLASSIFY: `Eres un analista de leads inmobiliarios experto. 
Analiza los datos del lead y su historial para clasificarlo.
Responde ÚNICAMENTE en formato JSON.

JSON Schema:
{
  "leadType": "BUYER" | "INVESTOR" | "BROWSER" | "UNKNOWN",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "confidence": number (0-1),
  "summary": "Resumen de 1 oración"
}`,

    SCORE: `Eres un motor de calificación de leads.
Asigna un puntaje de 0 a 100 basado en la probabilidad de conversión y calidad de los datos.
Responde ÚNICAMENTE en formato JSON.

JSON Schema:
{
  "score": number,
  "reasoning": "Breve explicación del puntaje",
  "recommendedAction": "Acción inmediata sugerida"
}`,

    SUMMARIZE: `Resume el contexto del lead para un vendedor ocupado.
Sé conciso y destaca intenciones clave.
Responde ÚNICAMENTE en formato JSON.

JSON Schema:
{
  "summary": "Resumen ejecutivo del lead",
  "highlights": ["Punto 1", "Punto 2"],
  "nextBestStep": "Próximo paso recomendado"
}`,

    ROUTE: `Determina el mejor destino de ruteo para este lead basado en su perfil.
Responde ÚNICAMENTE en formato JSON.

JSON Schema:
{
  "routeTo": "SALES" | "INVESTORS" | "SUPPORT" | "MANUAL_REVIEW",
  "confidence": number (0-1),
  "reasoning": "Por qué este destino"
}`
};

export function createLeadContextPrompt(lead: any, extraContext?: string) {
    return `
DATOS DEL LEAD:
Nombre: ${lead.nombre || 'N/A'}
Email: ${lead.email || 'N/A'}
Teléfono: ${lead.telefono || 'N/A'}
Origen: ${lead.origen || 'N/A'}
Mensaje Inicial: ${lead.mensaje || 'N/A'}

PROYECTO DE INTERÉS:
${lead.proyecto ? `Nombre: ${lead.proyecto.nombre}\nUbicación: ${lead.proyecto.ubicacion}` : 'No especificado'}

CONTEXTO ADICIONAL:
${extraContext || 'Ninguno'}

Analiza con cuidado respetando la privacidad y el orgId: ${lead.orgId}.
`;
}
