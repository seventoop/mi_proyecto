import { db } from "@/lib/db";
import {
    buildPublicProjectWhere,
    isUnitAvailableForPublic,
    NORMALIZED_UNIT_ESTADO,
    normalizeUnitEstado,
} from "@/lib/public-projects";
import { normalizeTourMediaCategory } from "@/lib/tour-media";

const fallbackImage =
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop";

export type ProjectShowcaseData = {
    id: string;
    slug: string;
    nombre: string;
    descripcion: string | null;
    ubicacion: string | null;
    tipo: string;
    estado: string;
    imageUrl: string;
    imageAlt: string;
    imageCount: number;
    mapCenterLat: number | null;
    mapCenterLng: number | null;
    mapZoom: number | null;
    masterplanSvg: string | null;
    overlayUrl: string | null;
    overlayBounds: string | null;
    overlayRotation: number | null;
    masterplanAvailable: boolean;
    leadCaptureEnabled: boolean;
    reservationEnabled: boolean;
    documentationStatus: string;
    organizationName: string | null;
    stats: {
        totalUnits: number;
        availableUnits: number;
        reservedUnits: number;
        soldUnits: number;
        soldPct: number;
        avgTicket: number | null;
        minPrice: number | null;
        maxPrice: number | null;
        minSurface: number | null;
        maxSurface: number | null;
    };
    inventoryPreview: Array<{
        id: string;
        numero: string;
        estado: string;
        superficie: number | null;
        precio: number | null;
        moneda: string;
        frente: number | null;
        fondo: number | null;
        esEsquina: boolean;
        orientacion: string | null;
    }>;
    units: Array<{
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
        coordenadasMasterplan: string | null;
        manzanaId: string;
        manzanaNombre: string;
        etapaId: string;
        etapaNombre: string;
        tour360Url: string | null;
    }>;
    images: Array<{
        id: string;
        url: string;
        categoria: string;
        esPrincipal: boolean;
    }>;
    mapImages: Array<{
        id: string;
        url: string;
        tipo: string;
        titulo: string | null;
        lat: number;
        lng: number;
        orden: number;
        altitudM: number | null;
        imageHeading: number | null;
        unidadId: string | null;
        unidadNumero: string | null;
    }>;
    tours: Array<{
        id: string;
        nombre: string;
        sceneCount: number;
        previewImages: string[];
        scenes: Array<{
            id: string;
            title: string;
            imageUrl: string;
            thumbnailUrl: string | null;
            isDefault: boolean;
            order: number;
            category: string;
            masterplanOverlay: unknown;
            hotspots: Array<{
                id: string;
                type: string;
                pitch: number;
                yaw: number;
                text: string | null;
                targetSceneId: string | null;
                unidad: {
                    id: string;
                    numero: string;
                    estado: string;
                    precio: number | null;
                    moneda: string;
                } | null;
            }>;
        }>;
    }>;
    infrastructures: Array<{
        id: string;
        nombre: string;
        categoria: string;
        tipo: string;
        estado: string;
        porcentajeAvance: number;
        descripcion?: string | null;
    }>;
    stages: Array<{
        id: string;
        nombre: string;
        estado: string;
        orden: number;
        unitCount: number;
        availableCount: number;
    }>;
    documents: Array<{
        id: string;
        title: string;
        url: string;
        type: string;
        source: string;
    }>;
    testimonials: Array<{
        id: string;
        author: string;
        role: string;
        text: string;
        rating: number;
        mediaUrl?: string | null;
    }>;
    relatedProjects: Array<{
        id: string;
        slug: string | null;
        nombre: string;
        tipo: string;
        ubicacion: string | null;
        descripcion: string | null;
        imagenPortada: string | null;
        precioM2Mercado: number | null;
    }>;
};

export type ProjectWorkspaceSnapshot = {
    id: string;
    slug: string | null;
    nombre: string;
    descripcion: string | null;
    ubicacion: string | null;
    estado: string;
    tipo: string;
    imagenPortada: string | null;
    precioM2Mercado: number | null;
    mapCenterLat: number | null;
    mapCenterLng: number | null;
    mapZoom: number | null;
    visibilityStatus: string | null;
};

export type ProjectShowcasePayload = {
    project: ProjectShowcaseData;
    editorSnapshot: ProjectWorkspaceSnapshot;
};

export type PublicProjectShowcase = ProjectShowcasePayload["project"];
export type PublicProjectCard = Pick<
    PublicProjectShowcase,
    "id" | "slug" | "nombre" | "descripcion" | "ubicacion" | "tipo" | "estado" | "imageUrl" | "inventoryPreview"
> & {
    availableUnits: number;
    publicPath: string;
};

function toNumber(value: unknown): number | null {
    if (value == null) return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function getMinPositive(values: Array<number | null | undefined>): number | null {
    const filtered = values.filter((value): value is number => typeof value === "number" && value > 0);
    if (filtered.length === 0) return null;
    return Math.min(...filtered);
}

function getMaxPositive(values: Array<number | null | undefined>): number | null {
    const filtered = values.filter((value): value is number => typeof value === "number" && value > 0);
    if (filtered.length === 0) return null;
    return Math.max(...filtered);
}

export async function getProjectShowcasePayload(options: {
    slugOrId: string;
    includeUnpublished?: boolean;
}) {
    const { slugOrId, includeUnpublished = false } = options;

    const where: any = includeUnpublished
        ? {
            id: slugOrId,
            deletedAt: null,
        }
        : {
            id: slugOrId,
            ...buildPublicProjectWhere(),
        };

    const project = await db.proyecto.findUnique({
        where,
        include: {
            organization: { select: { nombre: true } },
            imagenesMapa: {
                orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
                select: {
                    id: true,
                    url: true,
                    tipo: true,
                    titulo: true,
                    lat: true,
                    lng: true,
                    orden: true,
                    altitudM: true,
                    imageHeading: true,
                    unidadId: true,
                    unidad: { select: { numero: true } },
                },
            },
            imagenes: {
                orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
                select: { id: true, url: true, categoria: true, esPrincipal: true },
            },
            tours: {
                include: {
                    scenes: {
                        orderBy: { order: "asc" },
                        select: {
                            id: true,
                            title: true,
                            imageUrl: true,
                            thumbnailUrl: true,
                            isDefault: true,
                            order: true,
                            category: true,
                            masterplanOverlay: true,
                            hotspots: {
                                select: {
                                    id: true,
                                    type: true,
                                    pitch: true,
                                    yaw: true,
                                    text: true,
                                    targetSceneId: true,
                                    unidad: {
                                        select: {
                                            id: true,
                                            numero: true,
                                            estado: true,
                                            precio: true,
                                            moneda: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            },
            etapas: {
                orderBy: { orden: "asc" },
                select: {
                    id: true,
                    nombre: true,
                    estado: true,
                    orden: true,
                    manzanas: {
                        select: {
                            id: true,
                            nombre: true,
                            unidades: {
                                select: {
                                    id: true,
                                    numero: true,
                                    tipo: true,
                                    estado: true,
                                    superficie: true,
                                    precio: true,
                                    moneda: true,
                                    frente: true,
                                    fondo: true,
                                    esEsquina: true,
                                    orientacion: true,
                                    coordenadasMasterplan: true,
                                    tour360Url: true,
                                },
                            },
                        },
                    },
                },
            },
            infraestructuras: {
                where: includeUnpublished ? undefined : { visible: true },
                orderBy: [{ orden: "asc" }, { nombre: "asc" }],
                select: {
                    id: true,
                    nombre: true,
                    categoria: true,
                    tipo: true,
                    estado: true,
                    porcentajeAvance: true,
                    descripcion: true,
                },
            },
            documentacion: {
                where: includeUnpublished ? undefined : { OR: [{ estado: "APROBADO" }, { estado: "PENDIENTE" }] },
                orderBy: { createdAt: "desc" },
                select: { id: true, tipo: true, archivoUrl: true },
            },
            proyecto_archivos: {
                where: includeUnpublished ? undefined : { visiblePublicamente: true },
                orderBy: { createdAt: "desc" },
                select: { id: true, nombre: true, tipo: true, url: true },
            },
            testimonios: {
                where: includeUnpublished ? undefined : { estado: "APROBADO" },
                orderBy: [{ destacado: "desc" }, { createdAt: "desc" }],
                select: {
                    id: true,
                    autorNombre: true,
                    autorTipo: true,
                    texto: true,
                    rating: true,
                    mediaUrl: true,
                },
            },
        },
    });

    if (!project) return null;

    const relatedProjects = await db.proyecto.findMany({
        where: {
            id: { not: project.id },
            ...(includeUnpublished ? { deletedAt: null } : buildPublicProjectWhere()),
            OR: project.orgId ? [{ orgId: project.orgId }, { tipo: project.tipo }] : [{ tipo: project.tipo }],
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
            id: true,
            slug: true,
            nombre: true,
            tipo: true,
            ubicacion: true,
            descripcion: true,
            imagenPortada: true,
            precioM2Mercado: true,
        },
    });

    const principalImage =
        project.imagenes.find((image) => image.esPrincipal)?.url ||
        project.imagenPortada ||
        fallbackImage;

    const units = project.etapas.flatMap((stage) =>
        stage.manzanas.flatMap((block) =>
            block.unidades.map((unit) => ({
                ...unit,
                estado: normalizeUnitEstado(unit.estado),
                superficie: toNumber(unit.superficie),
                precio: toNumber(unit.precio),
                coordenadasMasterplan: unit.coordenadasMasterplan,
                tour360Url: unit.tour360Url,
                manzanaId: block.id,
                manzanaNombre: block.nombre,
                etapaId: stage.id,
                etapaNombre: stage.nombre,
            }))
        )
    );

    const totalUnits = units.length;
    const availableUnits = units.filter((unit) => isUnitAvailableForPublic(unit.estado)).length;
    const reservedUnits = units.filter((unit) => unit.estado === NORMALIZED_UNIT_ESTADO.RESERVADA).length;
    const soldUnits = units.filter((unit) => unit.estado === NORMALIZED_UNIT_ESTADO.VENDIDA).length;
    const soldPct = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;

    const positivePrices = units.map((unit) => unit.precio);
    const positiveSurfaces = units.map((unit) => unit.superficie);
    const priceMin = getMinPositive(positivePrices) ?? toNumber(project.precioM2Mercado);
    const priceMax = getMaxPositive(positivePrices);
    const surfaceMin = getMinPositive(positiveSurfaces);
    const surfaceMax = getMaxPositive(positiveSurfaces);
    const validPrices = positivePrices.filter((value): value is number => typeof value === "number" && value > 0);
    const avgTicket =
        validPrices.length > 0
            ? Math.round(validPrices.reduce((sum, value) => sum + value, 0) / validPrices.length)
            : null;

    const inventoryPreview = [...units]
        .sort((a, b) => {
            const aAvailable = isUnitAvailableForPublic(a.estado) ? 0 : 1;
            const bAvailable = isUnitAvailableForPublic(b.estado) ? 0 : 1;
            if (aAvailable !== bAvailable) return aAvailable - bAvailable;
            return (a.precio || 0) - (b.precio || 0);
        })
        .slice(0, 4)
        .map((unit) => ({
            id: unit.id,
            numero: unit.numero,
            estado: unit.estado,
            superficie: unit.superficie,
            precio: unit.precio,
            moneda: unit.moneda,
            frente: toNumber(unit.frente),
            fondo: toNumber(unit.fondo),
            esEsquina: unit.esEsquina,
            orientacion: unit.orientacion,
        }));

    return {
        project: {
            id: project.id,
            slug: project.slug || project.id,
            nombre: project.nombre,
            descripcion: project.descripcion,
            ubicacion: project.ubicacion,
            tipo: project.tipo,
            estado: project.estado,
            imageUrl: principalImage,
            imageAlt: project.nombre,
            imageCount: project.imagenes.length,
            mapCenterLat: project.mapCenterLat,
            mapCenterLng: project.mapCenterLng,
            mapZoom: project.mapZoom,
            masterplanSvg: project.masterplanSVG,
            overlayUrl: project.overlayUrl,
            overlayBounds: project.overlayBounds,
            overlayRotation: project.overlayRotation,
            masterplanAvailable: Boolean(project.masterplanSVG) || totalUnits > 0,
            leadCaptureEnabled: Boolean((project as any).puedeCaptarLeads),
            reservationEnabled: Boolean((project as any).puedeReservarse),
            documentationStatus: project.documentacionEstado,
            organizationName: project.organization?.nombre || null,
            stats: {
                totalUnits,
                availableUnits,
                reservedUnits,
                soldUnits,
                soldPct,
                avgTicket,
                minPrice: priceMin,
                maxPrice: priceMax,
                minSurface: surfaceMin,
                maxSurface: surfaceMax,
            },
            inventoryPreview,
            units,
            images: project.imagenes,
            mapImages: project.imagenesMapa.map((image) => ({
                id: image.id,
                url: image.url,
                tipo: image.tipo,
                titulo: image.titulo,
                lat: image.lat,
                lng: image.lng,
                orden: image.orden,
                altitudM: image.altitudM,
                imageHeading: image.imageHeading,
                unidadId: image.unidadId,
                unidadNumero: image.unidad?.numero ?? null,
            })),
            tours: project.tours.map((tour) => ({
                id: tour.id,
                nombre: tour.nombre,
                sceneCount: tour.scenes.length,
                previewImages: tour.scenes
                    .map((scene) => scene.thumbnailUrl || scene.imageUrl)
                    .filter((value): value is string => Boolean(value))
                    .slice(0, 4),
                scenes: tour.scenes.map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                    imageUrl: scene.imageUrl,
                    thumbnailUrl: scene.thumbnailUrl,
                    isDefault: scene.isDefault,
                    order: scene.order,
                    category: normalizeTourMediaCategory(scene),
                    masterplanOverlay:
                        scene.masterplanOverlay && typeof scene.masterplanOverlay === "object"
                            ? scene.masterplanOverlay
                            : null,
                    hotspots: scene.hotspots.map((hotspot) => ({
                        id: hotspot.id,
                        type: hotspot.type,
                        pitch: hotspot.pitch,
                        yaw: hotspot.yaw,
                        text: hotspot.text,
                        targetSceneId: hotspot.targetSceneId,
                        unidad: hotspot.unidad ? {
                            id: hotspot.unidad.id,
                            numero: hotspot.unidad.numero,
                            estado: normalizeUnitEstado(hotspot.unidad.estado),
                            precio: toNumber(hotspot.unidad.precio),
                            moneda: hotspot.unidad.moneda,
                        } : null,
                    })),
                })),
            })),
            infrastructures: project.infraestructuras,
            stages: project.etapas.map((stage) => ({
                id: stage.id,
                nombre: stage.nombre,
                estado: stage.estado,
                orden: stage.orden,
                unitCount: stage.manzanas.reduce((sum, block) => sum + block.unidades.length, 0),
                availableCount: stage.manzanas.reduce(
                    (sum, block) => sum + block.unidades.filter((unit) => isUnitAvailableForPublic(unit.estado)).length,
                    0
                ),
            })),
            documents: [
                ...project.documentacion.map((document) => ({
                    id: document.id,
                    title: document.tipo,
                    url: document.archivoUrl,
                    type: document.tipo,
                    source: "documentacion",
                })),
                ...project.proyecto_archivos.map((file) => ({
                    id: file.id,
                    title: file.nombre,
                    url: file.url,
                    type: file.tipo,
                    source: "archivo",
                })),
            ],
            testimonials: project.testimonios.map((testimonial) => ({
                id: testimonial.id,
                author: testimonial.autorNombre,
                role: testimonial.autorTipo,
                text: testimonial.texto,
                rating: testimonial.rating || 5,
                mediaUrl: testimonial.mediaUrl,
            })),
            relatedProjects: relatedProjects.map((related) => ({
                id: related.id,
                slug: related.slug,
                nombre: related.nombre,
                tipo: related.tipo,
                ubicacion: related.ubicacion,
                descripcion: related.descripcion,
                imagenPortada: related.imagenPortada,
                precioM2Mercado: toNumber(related.precioM2Mercado),
            })),
        },
        editorSnapshot: {
            id: project.id,
            slug: project.slug,
            nombre: project.nombre,
            descripcion: project.descripcion,
            ubicacion: project.ubicacion,
            estado: project.estado,
            tipo: project.tipo,
            imagenPortada: project.imagenPortada,
            precioM2Mercado: toNumber(project.precioM2Mercado),
            mapCenterLat: project.mapCenterLat,
            mapCenterLng: project.mapCenterLng,
            mapZoom: project.mapZoom,
            visibilityStatus: project.visibilityStatus,
        },
    } satisfies ProjectShowcasePayload;
}

export async function getPublicProjectShowcaseBySlug(
    slugOrId: string
): Promise<PublicProjectShowcase | null> {
    const trimmed = slugOrId.trim();
    if (!trimmed) return null;

    console.info("[public-project] resolve:start", { input: trimmed });

    const looksLikeId = /^[a-z0-9]{20,}$/i.test(trimmed) || /^[0-9a-f-]{24,}$/i.test(trimmed);

    if (looksLikeId) {
        const payloadById = await getProjectShowcasePayload({
            slugOrId: trimmed,
            includeUnpublished: false,
        });
        if (payloadById?.project?.id === trimmed) {
            console.info("[public-project] resolve:by-id", {
                input: trimmed,
                id: payloadById.project.id,
                slug: payloadById.project.slug,
                nombre: payloadById.project.nombre,
            });
            return payloadById.project;
        }
    }

    const duplicateSlugs = await db.proyecto.groupBy({
        by: ["slug"],
        where: {
            ...buildPublicProjectWhere(),
            slug: trimmed,
        },
        _count: { slug: true },
    });

    const project = await db.proyecto.findFirst({
        where: {
            ...buildPublicProjectWhere(),
            slug: trimmed,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, slug: true, nombre: true },
    });

    console.info("[public-project] resolve:by-slug", {
        input: trimmed,
        duplicateSlugCount: duplicateSlugs[0]?._count.slug ?? 0,
        found: project ? { id: project.id, slug: project.slug, nombre: project.nombre } : null,
    });

    if (!project) return null;

    const payload = await getProjectShowcasePayload({
        slugOrId: project.id,
        includeUnpublished: false,
    });

    if (payload?.project) {
        console.info("[public-project] resolve:final", {
            input: trimmed,
            id: payload.project.id,
            slug: payload.project.slug,
            nombre: payload.project.nombre,
        });
    }

    return payload?.project ?? null;
}

export async function listPublicProjectShowcases(): Promise<PublicProjectShowcase[]> {
    const projects = await db.proyecto.findMany({
        where: buildPublicProjectWhere(),
        orderBy: { createdAt: "desc" },
        select: { id: true },
    });

    const payloads = await Promise.all(
        projects.map((project) => getPublicProjectShowcaseBySlug(project.id))
    );

    return payloads.filter((project): project is PublicProjectShowcase => project !== null);
}

export async function listPublicProjectCards(): Promise<PublicProjectCard[]> {
    const projects = await listPublicProjectShowcases();

    return projects.map((project) => ({
        id: project.id,
        slug: project.slug,
        nombre: project.nombre,
        descripcion: project.descripcion,
        ubicacion: project.ubicacion,
        tipo: project.tipo,
        estado: project.estado,
        imageUrl: project.imageUrl,
        inventoryPreview: project.inventoryPreview,
        availableUnits: project.stats.availableUnits,
        publicPath: `/proyectos/${project.id}`,
    }));
}
