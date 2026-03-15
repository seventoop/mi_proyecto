
export interface BannerAIContent {
  headlineOptions: string[];
  subheadlineOptions: string[];
  taglineOptions: string[];
  ctaOptions: string[];
  campaignHook: string;
  tone: string;
  visualSuggestion: string;
  videoScript?: string;
  scenePlan?: { scene: number; duration: string; description: string; overlay: string }[];
  overlayTexts?: string[];
}

export interface BannerAIRequest {
  prompt: string;
  mediaType: "IMAGEN" | "VIDEO";
  context?: string;
}

export interface BannerAIProvider {
  name: string;
  generateContent(request: BannerAIRequest): Promise<{ success: boolean; data?: BannerAIContent; error?: string }>;
}

export const CONTENT_RULES = `
REGLAS DE CONTENIDO (CRÍTICAS — NO violar):
- headline: máximo 60 caracteres. Corto, fuerte, impactante. Máx 10 palabras.
- subheadline: máximo 120 caracteres. Apoyo comercial claro. Máx 20 palabras.
- tagline: máximo 30 caracteres. Badge corto. Máx 4 palabras. Ej: "PREVENTA · PILAR"
- ctaText: máximo 30 caracteres. Accionable. Máx 4 palabras. Ej: "Ver proyecto", "Invertí ahora"
- Idioma: español rioplatense (uso de 'voseo', tono cercano pero profesional).
- Tono: Comercial, Premium, Persuasivo. Evitar generalidades corporativas vacías.
- Enfoque: Desarrollos inmobiliarios, barrios privados, loteos, departamentos, inversión. 
- NO uses comillas en los valores de texto.
- NO inventes datos técnicos (precios, m2, rendimientos) que no estén en el prompt.
`;

export const BANNER_AI_SYSTEM_PROMPT = `Eres un experto en Marketing Inmobiliario de alto nivel en Argentina (especialista en Real Estate).
Tu objetivo es generar contenido publicitario para banners de la plataforma SevenToop, orientados a desarrolladoras inmobiliarias y compradores finales.
Debes crear copys que transmitan exclusividad, oportunidad de inversión y confianza.
SevenToop es el ecosistema líder para digitalizar y acelerar lanzamientos inmobiliarios.
${CONTENT_RULES}
Respondé SIEMPRE con JSON válido y nada más.`;

export function getBannerAIUserPrompt(request: BannerAIRequest): string {
  const { prompt, mediaType, context } = request;
  const isVideo = mediaType === "VIDEO";
  const duration = isVideo ? "30-35 segundos" : "20-25 segundos";

  if (isVideo) {
    return `Generá contenido para un banner de VIDEO de alto impacto (${duration}) basándote en esta idea: "${prompt}"
${context ? `Contexto estratégico adicional: ${context}` : ""}

Estructura requerida para VIDEO:
1. Apertura fuerte (Hook): Llamar la atención del inversor/comprador en los primeros 5 segundos.
2. Desarrollo: Mostrar beneficios clave y valor del proyecto.
3. Cierre: CTA directo y comercial.

Devolvé este JSON exacto:
{
  "headlineOptions": ["3 opciones de título potente - máx 60 car."],
  "subheadlineOptions": ["2 opciones de apoyo comercial - máx 120 car."],
  "taglineOptions": ["3 badges cortos (ej: LANZAMIENTO, CUOTAS EN PESOS) - máx 30 car."],
  "ctaOptions": ["3 frases de acción claras - máx 30 car."],
  "campaignHook": "Idea central de marketing que conecta con el deseo del cliente",
  "tone": "Descripción del tono (ej: Exclusivo + Urgencia, Innovador + Seguro)",
  "visualSuggestion": "Sugerencia cinematográfica para las escenas",
  "videoScript": "Guión narrativo o texto en placa para los ${duration}",
  "scenePlan": [
    { "scene": 1, "duration": "0-8s", "description": "Escena de apertura", "overlay": "Texto fuerte en pantalla" },
    { "scene": 2, "duration": "8-20s", "description": "Cuerpo del video", "overlay": "Beneficios clave" },
    { "scene": 3, "duration": "20-30s", "description": "Cierre visual", "overlay": "Información de contacto/web" },
    { "scene": 4, "duration": "30-35s", "description": "CTA Final", "overlay": "Texto de acción" }
  ],
  "overlayTexts": ["4 frases cortas para superponer en el video"]
}`;
  }

  return `Generá contenido para un banner de IMAGEN (estático) basándote en: "${prompt}"
${context ? `Contexto estratégico: ${context}` : ""}

El copy para IMAGEN debe ser extremadamente conciso y legible a simple vista.

Devolvé este JSON exacto:
{
  "headlineOptions": ["3 opciones de títulos cortos y fuertes - máx 60 car."],
  "subheadlineOptions": ["3 opciones de texto complementario - máx 120 car."],
  "taglineOptions": ["3 badges de oportunidad - máx 30 car."],
  "ctaOptions": ["3 llamadas a la acción directas - máx 30 car."],
  "campaignHook": "El diferencial comercial de esta pieza",
  "tone": "Tono sugerido (ej: Premium, Oportunidad, Confianza)",
  "visualSuggestion": "Cómo componer la imagen para que venda mejor"
}`;
}
