import type { Prisma } from "@prisma/client";

type PublicProjectWhereOptions = {
    invertible?: boolean;
};

export const PUBLIC_PROJECT_VISIBILITY = {
    PUBLICADO: "PUBLICADO",
    BORRADOR: "BORRADOR",
    PRIVADO: "PRIVADO",
    SUSPENDIDO: "SUSPENDIDO",
} as const;

const HIDDEN_PROJECT_STATES = ["SUSPENDIDO", "CANCELADO", "ELIMINADO", "DESACTIVADO"] as const;

export const NORMALIZED_UNIT_ESTADO = {
    DISPONIBLE: "DISPONIBLE",
    RESERVADA: "RESERVADA",
    VENDIDA: "VENDIDA",
    BLOQUEADA: "BLOQUEADA",
    SUSPENDIDO: "SUSPENDIDO",
} as const;

export type NormalizedUnitEstado =
    (typeof NORMALIZED_UNIT_ESTADO)[keyof typeof NORMALIZED_UNIT_ESTADO];

export function normalizeUnitEstado(value: string | null | undefined): NormalizedUnitEstado {
    switch ((value ?? "").trim().toUpperCase()) {
        case NORMALIZED_UNIT_ESTADO.RESERVADA:
        case "RESERVADO":
        case "RESERVADA_PENDIENTE":
            return NORMALIZED_UNIT_ESTADO.RESERVADA;
        case NORMALIZED_UNIT_ESTADO.VENDIDA:
        case "VENDIDO":
            return NORMALIZED_UNIT_ESTADO.VENDIDA;
        case NORMALIZED_UNIT_ESTADO.BLOQUEADA:
        case "BLOQUEADO":
            return NORMALIZED_UNIT_ESTADO.BLOQUEADA;
        case NORMALIZED_UNIT_ESTADO.SUSPENDIDO:
        case "SUSPENDIDA":
            return NORMALIZED_UNIT_ESTADO.SUSPENDIDO;
        case NORMALIZED_UNIT_ESTADO.DISPONIBLE:
        default:
            return NORMALIZED_UNIT_ESTADO.DISPONIBLE;
    }
}

export function isUnitAvailableForPublic(value: string | null | undefined): boolean {
    return normalizeUnitEstado(value) === NORMALIZED_UNIT_ESTADO.DISPONIBLE;
}

export function isProjectPubliclyVisible(project: {
    visibilityStatus: string;
    estado: string;
    deletedAt: Date | null;
    isDemo: boolean;
    demoExpiresAt: Date | null;
}): boolean {
    if (project.visibilityStatus !== PUBLIC_PROJECT_VISIBILITY.PUBLICADO) return false;
    if (HIDDEN_PROJECT_STATES.includes(project.estado as (typeof HIDDEN_PROJECT_STATES)[number])) return false;
    if (project.deletedAt !== null) return false;
    if (project.isDemo && (!project.demoExpiresAt || project.demoExpiresAt < new Date())) return false;
    return true;
}

export function buildPublicProjectWhere(
    options: PublicProjectWhereOptions = {}
): Prisma.ProyectoWhereInput {
    const where: Prisma.ProyectoWhereInput = {
        deletedAt: null,
        visibilityStatus: PUBLIC_PROJECT_VISIBILITY.PUBLICADO,
        estado: { notIn: [...HIDDEN_PROJECT_STATES] },
        OR: [
            { isDemo: false },
            { isDemo: true, demoExpiresAt: { gt: new Date() } },
        ],
    };

    if (typeof options.invertible === "boolean") {
        where.invertible = options.invertible;
    }

    return where;
}

export const getPublicProjectWhere = buildPublicProjectWhere;
