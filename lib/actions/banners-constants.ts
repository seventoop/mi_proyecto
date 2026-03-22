export const BANNER_ESTADOS = {
    DRAFT: "DRAFT",
    PENDING_APPROVAL: "PENDING_APPROVAL",
    PUBLISHED: "PUBLISHED",
    REJECTED: "REJECTED",
    PAUSED: "PAUSED",
    ARCHIVED: "ARCHIVED",
} as const;

export const BANNER_CONTEXT = {
    /** Banners de plataforma - visibles en la landing principal de SevenToop */
    SEVENTOOP_GLOBAL: "SEVENTOOP_GLOBAL",
    /** Banners de una organizacion - visibles en su landing propia */
    ORG_LANDING: "ORG_LANDING",
    /** Banners de un proyecto especifico - visibles en la pagina del proyecto */
    PROJECT_LANDING: "PROJECT_LANDING",
} as const;

/**
 * Maximo de banners PUBLISHED simultaneos por (context + orgId) para SEVENTOOP_GLOBAL y ORG_LANDING.
 * Al publicar el 4to, el mas antiguo pasa a PAUSED automaticamente.
 */
export const MAX_PUBLISHED_PER_CONTEXT = 3;

/**
 * Para PROJECT_LANDING: solo 1 banner PUBLISHED por projectId.
 * Al publicar uno nuevo, el anterior pasa a PAUSED.
 */
export const MAX_PROJECT_BANNERS = 1;

/**
 * Guia de limites de contenido para banners.
 * Aplicada tanto en el editor (UI warnings) como en los prompts de IA.
 */
export const BANNER_CONTENT_LIMITS = {
    headline: { max: 60, label: "Headline", hint: "Corto, fuerte - max 10 palabras" },
    subheadline: { max: 120, label: "Subheadline", hint: "Apoyo comercial breve - max 20 palabras" },
    tagline: { max: 60, label: "Tagline", hint: "Badge corto - ideal hasta 6 palabras (ej: PREVENTA · PILAR NORTE)" },
    ctaText: { max: 60, label: "CTA", hint: "Accionable - ideal hasta 6 palabras (ej: Ver proyecto ahora)" },
} as const;
