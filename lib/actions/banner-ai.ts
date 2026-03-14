"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireAnyRole, handleGuardError } from "@/lib/guards";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface BannerAIContent {
    // Opciones de copy
    headlineOptions: string[];       // máx 60 chars cada opción
    subheadlineOptions: string[];    // máx 120 chars cada opción
    taglineOptions: string[];        // máx 30 chars cada opción
    ctaOptions: string[];            // máx 30 chars cada opción
    // Contexto de campaña
    campaignHook: string;            // frase gancho — la idea central de la campaña
    tone: string;                    // tono detectado/sugerido (ej: "Urgencia + Premium")
    visualSuggestion: string;        // sugerencia visual
    // Solo para VIDEO
    videoScript?: string;
    scenePlan?: { scene: number; duration: string; description: string; overlay: string }[];
    overlayTexts?: string[];
}

const CONTENT_RULES = `
REGLAS DE CONTENIDO (CRÍTICAS — NO violar):
- headline: máximo 60 caracteres. Corto, fuerte, impactante. Máx 10 palabras.
- subheadline: máximo 120 caracteres. Apoyo comercial claro. Máx 20 palabras.
- tagline: máximo 30 caracteres. Badge corto. Máx 4 palabras. Ej: "PREVENTA · PILAR"
- ctaText: máximo 30 caracteres. Accionable. Máx 4 palabras. Ej: "Ver proyecto", "Invertí ahora"
- Idioma: español rioplatense. Tono comercial, directo.
- NO uses comillas en los valores de texto.
- NO inventes datos técnicos (precios, m2, rendimientos) que no estén en el prompt.
`;

export async function generateBannerContent(
    prompt: string,
    mediaType: "IMAGEN" | "VIDEO" = "IMAGEN",
    context?: string
): Promise<{ success: boolean; data?: BannerAIContent; error?: string }> {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        if (!prompt || prompt.trim().length < 10) {
            return { success: false, error: "El prompt debe tener al menos 10 caracteres." };
        }

        const isVideo = mediaType === "VIDEO";
        const duration = isVideo ? "30-35 segundos" : "20-25 segundos";

        const systemPrompt = `Eres un experto en marketing inmobiliario argentino.
Generás contenido publicitario para banners de una plataforma SaaS inmobiliaria.
Los banners se usan para: promociones, lanzamientos, campañas comerciales, urbanizaciones, loteos, barrios privados, departamentos en pozo.
Duración de la pieza: ${duration}.
${CONTENT_RULES}
Respondé SIEMPRE con JSON válido y nada más.`;

        const userPrompt = isVideo
            ? `Generá contenido para un banner de VIDEO (${duration}) basándote en:
"${prompt}"
${context ? `Contexto adicional: ${context}` : ""}

Respondé con este JSON exacto:
{
  "headlineOptions": ["opción 1", "opción 2", "opción 3"],
  "subheadlineOptions": ["opción 1", "opción 2"],
  "taglineOptions": ["PREVENTA", "LANZAMIENTO EXCLUSIVO", "OPORTUNIDAD ÚNICA"],
  "ctaOptions": ["Quiero saber más", "Reservá tu lugar", "Consultá ahora"],
  "campaignHook": "la idea central que guía toda la campaña — 1 oración",
  "tone": "descripción del tono (ej: Urgencia + Premium, Confianza + Aspiracional)",
  "visualSuggestion": "descripción visual sugerida para el video",
  "videoScript": "guión completo del video de ${duration} (narración/texto en pantalla)",
  "scenePlan": [
    { "scene": 1, "duration": "0-8s", "description": "descripción visual de la escena", "overlay": "texto en pantalla" },
    { "scene": 2, "duration": "8-20s", "description": "descripción visual de la escena", "overlay": "texto en pantalla" },
    { "scene": 3, "duration": "20-30s", "description": "descripción visual de la escena", "overlay": "texto en pantalla" },
    { "scene": 4, "duration": "30-35s", "description": "cierre y CTA", "overlay": "texto del CTA en pantalla" }
  ],
  "overlayTexts": ["texto overlay 1", "texto overlay 2", "texto overlay 3", "texto overlay 4"]
}`
            : `Generá contenido para un banner de IMAGEN (display de ${duration}) basándote en:
"${prompt}"
${context ? `Contexto adicional: ${context}` : ""}

Respondé con este JSON exacto:
{
  "headlineOptions": ["opción 1", "opción 2", "opción 3"],
  "subheadlineOptions": ["opción 1", "opción 2", "opción 3"],
  "taglineOptions": ["PREVENTA", "LANZAMIENTO", "OPORTUNIDAD"],
  "ctaOptions": ["Ver proyecto", "Invertí ahora", "Consultá sin compromiso"],
  "campaignHook": "la idea central que guía toda la campaña — 1 oración",
  "tone": "descripción del tono (ej: Urgencia + Premium, Confianza + Aspiracional)",
  "visualSuggestion": "descripción de qué mostrar en la imagen para mayor impacto"
}`;

        const message = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1400,
            messages: [{ role: "user", content: userPrompt }],
            system: systemPrompt,
        });

        const rawText = message.content[0]?.type === "text" ? message.content[0].text : "";

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { success: false, error: "La IA no devolvió un formato válido. Intentá de nuevo." };
        }

        const parsed: BannerAIContent = JSON.parse(jsonMatch[0]);
        return { success: true, data: parsed };
    } catch (error: any) {
        if (error?.name === "AuthError") return handleGuardError(error) as any;
        console.error("[banner-ai] Error:", error);
        return { success: false, error: "Error al generar contenido con IA. Verificá tu API key de Anthropic." };
    }
}
