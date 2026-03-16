export const BANNER_ESTADOS = {
    DRAFT: "DRAFT",
    PENDING_APPROVAL: "PENDING_APPROVAL",
    PUBLISHED: "PUBLISHED",
    REJECTED: "REJECTED",
    PAUSED: "PAUSED",
    ARCHIVED: "ARCHIVED",
} as const;

export const BANNER_CONTEXT = {
    /** Banners de plataforma — visibles en la landing principal de SevenToop */
    SEVENTOOP_GLOBAL: "SEVENTOOP_GLOBAL",
    /** Banners de una organización — visibles en su landing propia */
    ORG_LANDING: "ORG_LANDING",
    /** Banners de un proyecto específico — visibles en la página del proyecto */
    PROJECT_LANDING: "PROJECT_LANDING",
} as const;

/**
 * Máximo de banners PUBLISHED simultáneos por (context + orgId) para SEVENTOOP_GLOBAL y ORG_LANDING.
 * Al publicar el 4to, el más antiguo pasa a PAUSED automáticamente.
 */
export const MAX_PUBLISHED_PER_CONTEXT = 3;

/**
 * Para PROJECT_LANDING: solo 1 banner PUBLISHED por projectId.
 * Al publicar uno nuevo, el anterior pasa a PAUSED.
 */
export const MAX_PROJECT_BANNERS = 1;

/**
 * Guía de límites de contenido para banners.
 * Aplicada tanto en el editor (UI warnings) como en los prompts de IA.
 */
export const BANNER_CONTENT_LIMITS = {
    headline: { max: 60, label: "Headline", hint: "Corto, fuerte — máx 10 palabras" },
    subheadline: { max: 120, label: "Subheadline", hint: "Apoyo comercial breve — máx 20 palabras" },
    tagline: { max: 30, label: "Tagline", hint: "Badge pequeño — máx 4 palabras (ej: PREVENTA · PILAR)" },
    ctaText: { max: 30, label: "CTA", hint: "Accionable — máx 4 palabras (ej: Ver proyecto)" },
} as const;
