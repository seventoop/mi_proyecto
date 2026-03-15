/**
 * PROJECT LANDING SYSTEM — Public Contract
 *
 * These types represent the stable public interface for project data.
 * They are intentionally decoupled from the Prisma Proyecto model so that
 * internal schema changes do not break public-facing pages.
 *
 * All public pages and components must depend on these types,
 * never on Prisma types directly.
 */

// ─── Visibility & Status ────────────────────────────────────────────────────

/**
 * Canonical values for public visibility. Single source of truth.
 * Pages must never hardcode "PUBLICADO" — import this constant.
 */
export const PROJECT_VISIBILITY = {
    PUBLICADO: "PUBLICADO",
    BORRADOR: "BORRADOR",
    PRIVADO: "PRIVADO",
    SUSPENDIDO: "SUSPENDIDO",
} as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[keyof typeof PROJECT_VISIBILITY];

/** Unit availability states that should be visible to the public. */
export const UNIT_ESTADO = {
    DISPONIBLE: "DISPONIBLE",
    RESERVADA: "RESERVADA",
    VENDIDA: "VENDIDA",
    BLOQUEADA: "BLOQUEADA",
} as const;
export type UnitEstado = (typeof UNIT_ESTADO)[keyof typeof UNIT_ESTADO];

// ─── Public Unit ─────────────────────────────────────────────────────────────

/** Minimal public representation of a lot/unit. */
export interface ProjectPublicUnit {
    id: string;
    numero: string;
    tipo: string;
    estado: UnitEstado;
    /** Surface area in m² */
    superficie: number | null;
    frente: number | null;
    fondo: number | null;
    esEsquina: boolean;
    orientacion: string | null;
    precio: number | null;
    moneda: string;
    /** Source: Manzana → Etapa → Proyecto chain */
    etapaNombre: string | null;
    manzanaNombre: string | null;
}

// ─── Public Image ─────────────────────────────────────────────────────────────

export interface ProjectPublicImage {
    id: string;
    url: string;
    categoria: string | null;
    descripcion: string | null;
    esPrincipal: boolean;
    orden: number;
}

// ─── Public Tour ──────────────────────────────────────────────────────────────

export interface ProjectPublicTour {
    id: string;
    titulo: string;
    descripcion: string | null;
    scenes: Array<{
        id: string;
        title: string;
        imageUrl: string;
        isDefault: boolean;
        order: number;
    }>;
}

// ─── Branding Config ─────────────────────────────────────────────────────────

/**
 * Visual branding configuration for the project landing.
 * Phase 1: derived from Proyecto fields with safe fallbacks.
 * Phase 2: will support DB-persisted overrides per project.
 */
export interface ProjectBrandingConfig {
    /** Primary color for CTAs. Falls back to brand-600. */
    primaryColor: string | null;
    /** Hero overlay gradient. Falls back to standard dark gradient. */
    heroGradient: string | null;
    /** Optional logo URL. Falls back to org logo or platform logo. */
    logoUrl: string | null;
    /** Organization name for display. */
    orgName: string | null;
}

// ─── Payment Simulation Config ───────────────────────────────────────────────

/**
 * Configuration for the commercial payment simulator block.
 * Defines presets and limits for the simulation UI.
 */
export interface ProjectPaymentSimulationConfig {
    /** Whether the simulator is enabled for this project. Default: true. */
    enabled: boolean;
    /** Minimum down payment as a percentage of unit price. Default: 10. */
    minDownPaymentPct: number;
    /** Maximum down payment as a percentage of unit price. Default: 80. */
    maxDownPaymentPct: number;
    /** Available installment plan options (months). */
    plazoOptions: number[];
    /** Currency for display. Default: "USD". */
    currency: string;
    /** Legal disclaimer text. Always shown. */
    disclaimer: string;
}

export const DEFAULT_SIMULATION_CONFIG: ProjectPaymentSimulationConfig = {
    enabled: true,
    minDownPaymentPct: 10,
    maxDownPaymentPct: 80,
    plazoOptions: [12, 24, 36, 48, 60, 72, 84, 96],
    currency: "USD",
    disclaimer:
        "Esta simulación es orientativa y no constituye una oferta comercial vinculante. " +
        "Los montos, plazos e intereses son estimativos y están sujetos a aprobación " +
        "de la desarrolladora. Consultá con un asesor para obtener una propuesta definitiva.",
};

// ─── Landing Config ───────────────────────────────────────────────────────────

/**
 * Configuration that controls which blocks/sections are visible
 * on the project landing page.
 * Phase 1: computed from project state. Phase 2: per-project overrides.
 */
export interface ProjectLandingConfig {
    showGallery: boolean;
    showMasterplan: boolean;
    showTour360: boolean;
    showUnidades: boolean;
    showSimulator: boolean;
    showContactForm: boolean;
    /** Max units shown in the public inventory grid. */
    maxUnidadesPublicas: number;
    branding: ProjectBrandingConfig;
    simulation: ProjectPaymentSimulationConfig;
}

// ─── Full Public View ─────────────────────────────────────────────────────────

/**
 * The complete public representation of a project.
 * This is the stable contract all public pages depend on.
 * Produced by the adapter — never construct from Prisma types directly in pages.
 */
export interface ProjectPublicView {
    id: string;
    nombre: string;
    slug: string | null;
    descripcion: string | null;
    ubicacion: string | null;
    tipo: string;
    estado: string;
    /** Resolved hero image URL (banner > imagenPortada > gallery primary > null) */
    heroImageUrl: string | null;
    /** Whether the project has an interactive masterplan */
    hasMasterplan: boolean;
    /** Whether the project has an external 360° tour URL */
    hasTour360Url: boolean;
    tour360Url: string | null;
    imagenes: ProjectPublicImage[];
    tours: ProjectPublicTour[];
    /** Available units (DISPONIBLE only) */
    unidadesDisponibles: ProjectPublicUnit[];
    /** Total unit count across all etapas */
    totalUnidades: number;
    config: ProjectLandingConfig;
    /** Map center for potential map display */
    mapCenterLat: number;
    mapCenterLng: number;
    /** OrgId needed for CRM routing */
    orgId: string | null;
}

// ─── Simulation Lead Payload ──────────────────────────────────────────────────

/**
 * Payload for a commercial simulation submission.
 * Sent to the CRM as a structured lead event.
 */
export interface SimulationLeadPayload {
    proyectoId: string;
    proyectoNombre: string;
    /** Optional: specific unit the user is interested in */
    unidadId?: string;
    unidadNumero?: string;
    /** Contact info */
    nombre: string;
    whatsapp: string;
    email?: string;
    /** Simulation inputs */
    anticipoDisponible: number;
    cuotaMensualPosible: number;
    plazoMeses: number;
    /** Preferences */
    quiereVisita: boolean;
    quiereWhatsApp: boolean;
    /** Free-text message if any */
    mensaje?: string;
    /** Origin context for CRM attribution */
    origen: "SIMULADOR_LANDING" | "SIMULADOR_UNIDAD";
    /** Currency context */
    moneda: string;
}

// ─── CRM Event Metadata ───────────────────────────────────────────────────────

/**
 * Structured metadata stored in Lead.notas as JSON.
 * Designed to be consumed by LogicToop automations.
 */
export interface SimulationCRMMetadata {
    eventoTipo: "SIMULACION_FINANCIACION";
    anticipoDisponible: number;
    cuotaMensualPosible: number;
    plazoMeses: number;
    unidadId?: string;
    unidadNumero?: string;
    quiereVisita: boolean;
    quiereWhatsApp: boolean;
    origen: string;
    moneda: string;
    generadoEn: string; // ISO timestamp
}
