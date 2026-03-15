/**
 * PROJECT LANDING SYSTEM — Adapter / Service Layer
 *
 * This module is the ONLY place that talks to the Prisma Proyecto model
 * for public-facing pages. Pages and components must use these functions
 * instead of querying the DB directly.
 *
 * Isolation strategy:
 * - Internal model changes are absorbed here, not in pages.
 * - All output conforms to ProjectPublicView (stable contract).
 * - Visibility logic lives here — never in pages.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
    ProjectPublicView,
    ProjectPublicUnit,
    ProjectPublicImage,
    ProjectPublicTour,
    ProjectLandingConfig,
    ProjectBrandingConfig,
} from "./types";
import {
    PROJECT_VISIBILITY,
    UNIT_ESTADO,
    DEFAULT_SIMULATION_CONFIG,
} from "./types";

// ─── Visibility Rule — Single Source of Truth ─────────────────────────────────

/**
 * Central visibility check for a project.
 * ALL public pages must gate on this — never repeat the conditions.
 */
export function isProjectPubliclyVisible(project: {
    visibilityStatus: string;
    estado: string;
    deletedAt: Date | null;
    isDemo: boolean;
    demoExpiresAt: Date | null;
}): boolean {
    if (project.visibilityStatus !== PROJECT_VISIBILITY.PUBLICADO) return false;
    if (project.estado === "SUSPENDIDO") return false;
    if (project.deletedAt !== null) return false;
    // Demo rule: requires an explicit future expiry date.
    // isDemo=true with demoExpiresAt=null → NOT visible (no expiry configured).
    // isDemo=true with a past demoExpiresAt → NOT visible (expired).
    if (project.isDemo && (!project.demoExpiresAt || project.demoExpiresAt < new Date())) return false;
    return true;
}

/**
 * Prisma where clause — derived from the visibility rule.
 * NOTE: returned as a plain object (not `as const`) so Prisma can accept
 * the mutable array type for `OR`.
 */
export function getPublicProjectWhere(): Prisma.ProyectoWhereInput {
    return {
        visibilityStatus: PROJECT_VISIBILITY.PUBLICADO,
        estado: { not: "SUSPENDIDO" },
        deletedAt: null,
        OR: [
            { isDemo: false },
            { isDemo: true, demoExpiresAt: { gt: new Date() } },
        ],
    };
}

/**
 * @deprecated DO NOT USE in runtime query code — `demoExpiresAt` comparison uses
 * a Date frozen at module load time and becomes stale in long-running processes.
 * Use `getPublicProjectWhere()` instead, which evaluates `new Date()` per call.
 * This export exists only for static analysis / tests that don't involve Date logic.
 */
export const PUBLIC_PROJECT_WHERE: Prisma.ProyectoWhereInput = {
    visibilityStatus: PROJECT_VISIBILITY.PUBLICADO,
    estado: { not: "SUSPENDIDO" },
    deletedAt: null,
    OR: [
        { isDemo: false },
        { isDemo: true, demoExpiresAt: { gt: new Date() } },
    ],
};

// ─── Mapping Helpers ──────────────────────────────────────────────────────────

function mapImages(
    imagenes: Array<{
        id: string;
        url: string;
        categoria: string;
        esPrincipal: boolean;
        orden: number;
    }>
): ProjectPublicImage[] {
    return imagenes.map((img) => ({
        id: img.id,
        url: img.url,
        categoria: img.categoria,
        descripcion: null,          // ProyectoImagen has no descripcion field
        esPrincipal: img.esPrincipal,
        orden: img.orden,
    }));
}

function mapTours(
    tours: Array<{
        id: string;
        nombre: string;             // Tour360.nombre (not titulo)
        notasAdmin: string | null;
        scenes: Array<{
            id: string;
            title: string;
            imageUrl: string;
            isDefault: boolean;
            order: number;
        }>;
    }>
): ProjectPublicTour[] {
    return tours.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        scenes: t.scenes,
    }));
}

function mapUnidades(
    etapas: Array<{
        nombre: string;
        manzanas: Array<{
            nombre: string;
            unidades: Array<{
                id: string;
                numero: string;
                tipo: string;
                estado: string;
                superficie: number | null;
                frente: number | null;
                fondo: number | null;
                esEsquina: boolean;
                orientacion: string | null;
                precio: number | null;
                moneda: string;
            }>;
        }>;
    }>
): { disponibles: ProjectPublicUnit[]; total: number } {
    const disponibles: ProjectPublicUnit[] = [];
    let total = 0;

    for (const etapa of etapas) {
        for (const manzana of etapa.manzanas) {
            for (const u of manzana.unidades) {
                total++;
                if (u.estado === UNIT_ESTADO.DISPONIBLE) {
                    disponibles.push({
                        id: u.id,
                        numero: u.numero,
                        tipo: u.tipo,
                        estado: u.estado as ProjectPublicUnit["estado"],
                        superficie: u.superficie,
                        frente: u.frente,
                        fondo: u.fondo,
                        esEsquina: u.esEsquina,
                        orientacion: u.orientacion,
                        precio: u.precio,
                        moneda: u.moneda,
                        etapaNombre: etapa.nombre,
                        manzanaNombre: manzana.nombre,
                    });
                }
            }
        }
    }

    return { disponibles, total };
}

function buildBranding(orgName: string | null): ProjectBrandingConfig {
    return {
        primaryColor: null,     // Phase 2: ProjectBrandingOverride table
        heroGradient: null,     // Phase 2: ProjectBrandingOverride table
        logoUrl: null,          // Phase 2: org settings
        orgName,
    };
}

function buildLandingConfig(opts: {
    hasMasterplan: boolean;
    hasTour360Url: boolean;
    orgName: string | null;
}): ProjectLandingConfig {
    return {
        showGallery: true,
        showMasterplan: opts.hasMasterplan,
        showTour360: opts.hasTour360Url,
        showUnidades: true,
        showSimulator: true,
        showContactForm: true,
        maxUnidadesPublicas: 12,
        branding: buildBranding(opts.orgName),
        simulation: DEFAULT_SIMULATION_CONFIG,
    };
}

// ─── Full query helper ────────────────────────────────────────────────────────

async function fetchProjectForPublicView(
    where: Prisma.ProyectoWhereInput
): Promise<ProjectPublicView | null> {
    const project = await db.proyecto.findFirst({
        where,
        include: {
            imagenes: { orderBy: { orden: "asc" } },
            tours: {
                include: {
                    scenes: {
                        orderBy: { order: "asc" },
                        select: {
                            id: true,
                            title: true,
                            imageUrl: true,
                            isDefault: true,
                            order: true,
                        },
                    },
                },
            },
            etapas: {
                include: {
                    manzanas: {
                        include: {
                            unidades: {
                                where: { estado: { not: UNIT_ESTADO.BLOQUEADA } },
                                select: {
                                    id: true,
                                    numero: true,
                                    tipo: true,
                                    estado: true,
                                    superficie: true,
                                    frente: true,
                                    fondo: true,
                                    esEsquina: true,
                                    orientacion: true,
                                    precio: true,
                                    moneda: true,
                                },
                            },
                        },
                    },
                },
            },
            organization: { select: { nombre: true } },
        },
    });

    if (!project) return null;
    if (!isProjectPubliclyVisible(project)) return null;

    const imagenes = mapImages(project.imagenes ?? []);
    const tours = mapTours(project.tours ?? []);
    const { disponibles, total } = mapUnidades(
        (project.etapas ?? []).map((etapa) => ({
            nombre: etapa.nombre,
            manzanas: (etapa.manzanas ?? []).map((m) => ({
                nombre: m.nombre,
                unidades: m.unidades ?? [],
            })),
        }))
    );

    const primaryImage = imagenes.find((i) => i.esPrincipal)?.url ?? imagenes[0]?.url ?? null;
    const heroImageUrl = project.imagenPortada ?? primaryImage;
    const hasMasterplan = !!project.masterplanSVG;
    const hasTour360Url = !!project.tour360Url;
    const orgName = project.organization?.nombre ?? null;

    return {
        id: project.id,
        nombre: project.nombre,
        slug: project.slug,
        descripcion: project.descripcion,
        ubicacion: project.ubicacion,
        tipo: project.tipo,
        estado: project.estado,
        heroImageUrl,
        hasMasterplan,
        hasTour360Url,
        tour360Url: project.tour360Url,
        imagenes,
        tours,
        unidadesDisponibles: disponibles,
        totalUnidades: total,
        config: buildLandingConfig({ hasMasterplan, hasTour360Url, orgName }),
        mapCenterLat: project.mapCenterLat ?? -34.6037,
        mapCenterLng: project.mapCenterLng ?? -58.3816,
        orgId: project.orgId,
    };
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch a single project's public view by slug (or cuid ID as fallback).
 * Returns null if the project does not exist or is not publicly visible.
 */
export async function getProjectPublicViewBySlug(
    slug: string
): Promise<ProjectPublicView | null> {
    const base = getPublicProjectWhere();

    // Try slug first
    const bySlug = await fetchProjectForPublicView({ ...base, slug });
    if (bySlug) return bySlug;

    // Fallback: cuid-style ID (24–26 chars)
    if (slug.length >= 24 && slug.length <= 26) {
        return fetchProjectForPublicView({ ...base, id: slug });
    }

    return null;
}

/**
 * List all publicly visible projects.
 * Returns a lightweight subset suitable for directory/grid views.
 * Does NOT include full unit trees — uses a separate count query for performance.
 */
export async function listPublicProjects(): Promise<
    Array<{
        id: string;
        nombre: string;
        slug: string | null;
        descripcion: string | null;
        ubicacion: string | null;
        tipo: string;
        estado: string;
        heroImageUrl: string | null;
        hasMasterplan: boolean;
        hasTour360Url: boolean;
        imagenPortada: string | null;
        orgId: string | null;
    }>
> {
    try {
        const projects = await db.proyecto.findMany({
            where: getPublicProjectWhere(),
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                nombre: true,
                slug: true,
                descripcion: true,
                ubicacion: true,
                tipo: true,
                estado: true,
                imagenPortada: true,
                masterplanSVG: true,
                tour360Url: true,
                orgId: true,
                isDemo: true,
                demoExpiresAt: true,
                deletedAt: true,
                visibilityStatus: true,
            },
        });

        return projects.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            slug: p.slug,
            descripcion: p.descripcion,
            ubicacion: p.ubicacion,
            tipo: p.tipo,
            estado: p.estado,
            heroImageUrl: p.imagenPortada,
            hasMasterplan: !!p.masterplanSVG,
            hasTour360Url: !!p.tour360Url,
            imagenPortada: p.imagenPortada,
            orgId: p.orgId,
        }));
    } catch {
        return [];
    }
}

/**
 * Count available units for multiple projects in a single query (avoids N+1).
 * Returns a Map<projectId, unitCount>.
 */
export async function getUnidadCountsByProject(
    projectIds: string[]
): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map();

    try {
        const rows = await db.$queryRaw<{ proyectoId: string; count: number }[]>`
            SELECT e."proyectoId", COUNT(u.id)::int AS count
            FROM unidades u
            JOIN manzanas m ON u."manzanaId" = m.id
            JOIN etapas e ON m."etapaId" = e.id
            WHERE e."proyectoId" IN (${Prisma.join(projectIds)})
            GROUP BY e."proyectoId"
        `;

        return new Map(rows.map((r) => [r.proyectoId, Number(r.count)]));
    } catch {
        return new Map();
    }
}
