/**
 * Seed seguro de proyectos base para producción.
 *
 * - Idempotente: usa upsert por slug
 * - dry-run por defecto. Para escribir en DB: pasar --apply
 * - NO borra nada
 * - NO toca planos / masterplan / overlays
 * - NO pisa campos importantes si el proyecto ya existe (ver `update`)
 *
 * Uso:
 *   npm run seed:base-projects:dry-run
 *   npm run seed:base-projects:apply   # solo después de revisar el dry-run
 */

import { PrismaClient } from "@prisma/client";

type BaseProject = {
    slug: string;
    nombre: string;
    descripcion: string;
    ubicacion: string;
    tipo: string;
    estado: string;
    visibilityStatus: string;
    mapCenterLat: number;
    mapCenterLng: number;
    mapZoom: number;
    invertible: boolean;
    requireKyc: boolean;
};

const BASE_PROJECTS: BaseProject[] = [
    {
        slug: "valles-del-pino",
        nombre: "Valles del Pino",
        descripcion:
            "Urbanización privada con amenities, espacios verdes y lotes amplios pensados para familias.",
        ubicacion: "Pilar, Buenos Aires",
        tipo: "URBANIZACION",
        estado: "ACTIVO",
        visibilityStatus: "PUBLICADO",
        mapCenterLat: -34.4587,
        mapCenterLng: -58.9142,
        mapZoom: 16,
        invertible: false,
        requireKyc: true,
    },
    {
        slug: "barrio-capinota",
        nombre: "Barrio Capinota",
        descripcion:
            "Barrio cerrado de baja densidad con foco en seguridad, conectividad y servicios premium.",
        ubicacion: "Córdoba Capital, Córdoba",
        tipo: "URBANIZACION",
        estado: "ACTIVO",
        visibilityStatus: "PUBLICADO",
        mapCenterLat: -31.4201,
        mapCenterLng: -64.1888,
        mapZoom: 16,
        invertible: false,
        requireKyc: true,
    },
    {
        slug: "valles-del-pilar",
        nombre: "Valles del Pilar",
        descripcion:
            "Desarrollo de lotes con financiación directa, club house y red de servicios soterrados.",
        ubicacion: "Pilar, Buenos Aires",
        tipo: "URBANIZACION",
        estado: "ACTIVO",
        visibilityStatus: "PUBLICADO",
        mapCenterLat: -34.4396,
        mapCenterLng: -58.9526,
        mapZoom: 16,
        invertible: true,
        requireKyc: true,
    },
    {
        slug: "altos-del-lago",
        nombre: "Altos del Lago",
        descripcion:
            "Lotes premium con vista al lago, amenities deportivos y acceso controlado 24/7.",
        ubicacion: "Nordelta, Tigre, Buenos Aires",
        tipo: "URBANIZACION",
        estado: "ACTIVO",
        visibilityStatus: "PUBLICADO",
        mapCenterLat: -34.3998,
        mapCenterLng: -58.6483,
        mapZoom: 16,
        invertible: false,
        requireKyc: true,
    },
];

function isApply(): boolean {
    return process.argv.includes("--apply") || process.env.APPLY === "true";
}

function maskUrl(url: string | undefined): string {
    if (!url) return "(no DATABASE_URL)";
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.username ? "***@" : ""}${u.hostname}:${u.port || "?"}${u.pathname}`;
    } catch {
        return "(invalid url)";
    }
}

async function main() {
    const apply = isApply();
    const dbUrl = process.env.DATABASE_URL;

    console.log("─────────────────────────────────────────────");
    console.log(" SevenToop · seed-base-projects");
    console.log(" mode  :", apply ? "APPLY (escribirá en DB)" : "DRY-RUN (no escribe)");
    console.log(" db    :", maskUrl(dbUrl));
    console.log(" count :", BASE_PROJECTS.length, "proyectos base");
    console.log("─────────────────────────────────────────────");

    if (!dbUrl) {
        console.error("ERROR: DATABASE_URL no está definido. Abortando.");
        process.exit(1);
    }

    const prisma = new PrismaClient();
    try {
        let willCreate = 0;
        let willUpdate = 0;
        let unchanged = 0;

        for (const p of BASE_PROJECTS) {
            const existing = await prisma.proyecto.findUnique({
                where: { slug: p.slug },
                select: {
                    id: true,
                    nombre: true,
                    visibilityStatus: true,
                    estado: true,
                    deletedAt: true,
                    isDemo: true,
                    descripcion: true,
                    ubicacion: true,
                },
            });

            if (!existing) {
                willCreate++;
                console.log(`[CREATE] ${p.slug} → "${p.nombre}" (${p.ubicacion})`);
            } else {
                // Solo actualizamos campos seguros y SOLO si están vacíos / divergentes
                // de los mínimos requeridos para que aparezca en landing.
                const patch: Record<string, unknown> = {};
                if (existing.deletedAt !== null) {
                    // No revivimos un proyecto borrado por accidente. Lo logueamos.
                    console.log(`[SKIP]   ${p.slug} → existe pero tiene deletedAt seteado, no se toca.`);
                    unchanged++;
                    continue;
                }
                if (existing.visibilityStatus !== "PUBLICADO") patch.visibilityStatus = "PUBLICADO";
                if (!["ACTIVO", "PLANIFICACION", "EN_OBRA"].includes(existing.estado)) {
                    patch.estado = "ACTIVO";
                }
                if (existing.isDemo === true) patch.isDemo = false;
                if (!existing.descripcion) patch.descripcion = p.descripcion;
                if (!existing.ubicacion) patch.ubicacion = p.ubicacion;

                if (Object.keys(patch).length === 0) {
                    unchanged++;
                    console.log(`[OK]     ${p.slug} → ya cumple mínimos, no se toca.`);
                } else {
                    willUpdate++;
                    console.log(`[UPDATE] ${p.slug} → patch:`, patch);
                }
            }
        }

        console.log("─────────────────────────────────────────────");
        console.log(` plan: create=${willCreate}  update=${willUpdate}  unchanged=${unchanged}`);
        console.log("─────────────────────────────────────────────");

        if (!apply) {
            console.log("DRY-RUN: nada se escribió. Para aplicar, correr con --apply.");
            return;
        }

        for (const p of BASE_PROJECTS) {
            const existing = await prisma.proyecto.findUnique({
                where: { slug: p.slug },
                select: {
                    id: true,
                    visibilityStatus: true,
                    estado: true,
                    deletedAt: true,
                    isDemo: true,
                    descripcion: true,
                    ubicacion: true,
                },
            });

            if (existing?.deletedAt !== undefined && existing?.deletedAt !== null) {
                console.log(`[SKIP]   ${p.slug} (deletedAt seteado)`);
                continue;
            }

            const created = await prisma.proyecto.upsert({
                where: { slug: p.slug },
                create: {
                    slug: p.slug,
                    nombre: p.nombre,
                    descripcion: p.descripcion,
                    ubicacion: p.ubicacion,
                    tipo: p.tipo,
                    estado: p.estado,
                    visibilityStatus: p.visibilityStatus,
                    mapCenterLat: p.mapCenterLat,
                    mapCenterLng: p.mapCenterLng,
                    mapZoom: p.mapZoom,
                    invertible: p.invertible,
                    requireKyc: p.requireKyc,
                    isDemo: false,
                    documentacionEstado: "PENDIENTE",
                },
                update: existing
                    ? {
                          ...(existing.visibilityStatus !== "PUBLICADO" && { visibilityStatus: "PUBLICADO" }),
                          ...(!["ACTIVO", "PLANIFICACION", "EN_OBRA"].includes(existing.estado) && { estado: "ACTIVO" }),
                          ...(existing.isDemo === true && { isDemo: false }),
                          ...(!existing.descripcion && { descripcion: p.descripcion }),
                          ...(!existing.ubicacion && { ubicacion: p.ubicacion }),
                      }
                    : {},
            });
            console.log(`[OK] upsert ${created.slug} (id=${created.id})`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("seed-base-projects failed:", err);
    process.exit(1);
});
