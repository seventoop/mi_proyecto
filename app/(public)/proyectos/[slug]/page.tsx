import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ProjectDetailShowcase from "@/components/public/project-detail-showcase";

const fallbackImage =
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop";

async function getProject(slugOrId: string) {
    const project = await db.proyecto.findFirst({
        where: {
            OR: [{ slug: slugOrId }, { id: slugOrId }],
            visibilityStatus: "PUBLICADO",
            deletedAt: null,
        },
        include: {
            organization: {
                select: {
                    nombre: true,
                },
            },
            imagenes: {
                orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
                select: {
                    id: true,
                    url: true,
                    categoria: true,
                    esPrincipal: true,
                },
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
                                    estado: true,
                                    superficie: true,
                                    precio: true,
                                    moneda: true,
                                    frente: true,
                                    fondo: true,
                                    esEsquina: true,
                                    orientacion: true,
                                },
                            },
                        },
                    },
                },
            },
            infraestructuras: {
                where: { visible: true },
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
                where: {
                    OR: [{ estado: "APROBADO" }, { estado: "PENDIENTE" }],
                },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    tipo: true,
                    archivoUrl: true,
                },
            },
            proyecto_archivos: {
                where: { visiblePublicamente: true },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    nombre: true,
                    tipo: true,
                    url: true,
                },
            },
            testimonios: {
                where: { estado: "APROBADO" },
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
            visibilityStatus: "PUBLICADO",
            deletedAt: null,
            OR: project.orgId
                ? [{ orgId: project.orgId }, { tipo: project.tipo }]
                : [{ tipo: project.tipo }],
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

    return { project, relatedProjects };
}

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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const payload = await getProject(params.slug);
    if (!payload) {
        return { title: "Proyecto no encontrado | Seventoop" };
    }

    const { project } = payload;
    const imageUrl =
        project.imagenes.find((image) => image.esPrincipal)?.url ||
        project.imagenPortada ||
        fallbackImage;

    return {
        title: `${project.nombre} | Seventoop`,
        description:
            project.descripcion?.slice(0, 160) ||
            `Conoce ${project.nombre} en ${project.ubicacion || "una ubicacion destacada"}.`,
        openGraph: {
            title: `${project.nombre} | Seventoop`,
            description:
                project.descripcion?.slice(0, 160) ||
                `Conoce ${project.nombre} en ${project.ubicacion || "una ubicacion destacada"}.`,
            images: [{ url: imageUrl }],
        },
    };
}

export default async function ProjectLandingPage({ params }: { params: { slug: string } }) {
    const payload = await getProject(params.slug);

    if (!payload) {
        notFound();
    }

    const { project, relatedProjects } = payload;
    const principalImage =
        project.imagenes.find((image) => image.esPrincipal)?.url ||
        project.imagenPortada ||
        fallbackImage;

    const units = project.etapas.flatMap((stage) =>
        stage.manzanas.flatMap((block) =>
            block.unidades.map((unit) => ({
                ...unit,
                superficie: toNumber(unit.superficie),
                precio: toNumber(unit.precio),
            }))
        )
    );

    const totalUnits = units.length;
    const availableUnits = units.filter((unit) => unit.estado === "DISPONIBLE").length;
    const reservedUnits = units.filter((unit) => unit.estado === "RESERVADA").length;
    const soldUnits = units.filter((unit) => unit.estado === "VENDIDA").length;
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
            const aAvailable = a.estado === "DISPONIBLE" ? 0 : 1;
            const bAvailable = b.estado === "DISPONIBLE" ? 0 : 1;
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

    const showcaseData = {
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
        masterplanAvailable: Boolean(project.masterplanSVG) || totalUnits > 0,
        leadCaptureEnabled: project.puedeCaptarLeads,
        reservationEnabled: project.puedeReservarse,
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
        images: project.imagenes,
        tours: project.tours.map((tour) => ({
            id: tour.id,
            nombre: tour.nombre,
            sceneCount: tour.scenes.length,
            previewImages: tour.scenes
                .map((scene) => scene.thumbnailUrl || scene.imageUrl)
                .filter((value): value is string => Boolean(value))
                .slice(0, 4),
        })),
        infrastructures: project.infraestructuras,
        stages: project.etapas.map((stage) => ({
            id: stage.id,
            nombre: stage.nombre,
            estado: stage.estado,
            orden: stage.orden,
            unitCount: stage.manzanas.reduce((sum, block) => sum + block.unidades.length, 0),
            availableCount: stage.manzanas.reduce(
                (sum, block) => sum + block.unidades.filter((unit) => unit.estado === "DISPONIBLE").length,
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
    };

    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || null;
    const userId = session?.user?.id || null;
    const canEditProject = userRole === "ADMIN" || userRole === "DESARROLLADOR" || (userId && project.creadoPorId === userId);

    return (
        <ProjectDetailShowcase
            project={showcaseData}
            mode="public"
            authContext={canEditProject ? {
                projectId: project.id,
                userRole: userRole!,
                canEdit: true,
            } : undefined}
        />
    );
}
