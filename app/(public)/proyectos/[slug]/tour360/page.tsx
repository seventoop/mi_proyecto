import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/db";
import TourViewer, { Scene, Hotspot } from "@/components/tour360/tour-viewer";

async function getProjectWithTour(slug: string) {
    let project = await (prisma.proyecto as any).findUnique({
        where: { slug },
        select: {
            id: true,
            nombre: true,
            slug: true,
            estado: true,
            visibilityStatus: true,
            tours: {
                include: {
                    scenes: {
                        include: {
                            hotspots: {
                                include: {
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
                        orderBy: { order: "asc" },
                    },
                },
                take: 1,
            },
        },
    });

    if (!project && slug.length === 25) {
        project = await (prisma.proyecto as any).findUnique({
            where: { id: slug },
            select: {
                id: true,
                nombre: true,
                slug: true,
                estado: true,
                visibilityStatus: true,
                tours: {
                    include: {
                        scenes: {
                            include: {
                                hotspots: {
                                    include: {
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
                            orderBy: { order: "asc" },
                        },
                    },
                    take: 1,
                },
            },
        });
    }

    return project;
}

function parseSceneExtras(rawValue: unknown) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
        return {};
    }

    const value = rawValue as {
        hotspots?: unknown;
        polygons?: unknown;
        floatingLabels?: unknown;
        masterplanOverlay?: unknown;
        thumbnailUrl?: unknown;
    };

    return {
        hotspots: Array.isArray(value.hotspots) ? value.hotspots : [],
        polygons: Array.isArray(value.polygons) ? value.polygons : [],
        floatingLabels: Array.isArray(value.floatingLabels) ? value.floatingLabels : [],
        masterplanOverlay:
            value.masterplanOverlay && typeof value.masterplanOverlay === "object" && !Array.isArray(value.masterplanOverlay)
                ? value.masterplanOverlay
                : undefined,
        thumbnailUrl: typeof value.thumbnailUrl === "string" ? value.thumbnailUrl : undefined,
    };
}

function normalizeHotspot(hs: any): Hotspot {
    return {
        id: hs.id,
        type: hs.type?.toLowerCase() || "info",
        pitch: hs.pitch,
        yaw: hs.yaw,
        text: hs.text || "",
        unidad: hs.unidad || undefined,
        targetSceneId: hs.targetSceneId || undefined,
        targetUrl: hs.targetUrl || undefined,
        targetThumbnail: hs.targetThumbnail || undefined,
        icon: hs.icon || undefined,
    };
}

function dbTourToScenes(tour: any): Scene[] {
    if (!tour?.scenes?.length) return [];

    return tour.scenes.map((dbScene: any) => {
        const extras = parseSceneExtras(dbScene.pannellumHotspots);
        const dbHotspots = (dbScene.hotspots || []).map((hs: any): Hotspot => normalizeHotspot(hs));
        const extraHotspots = (extras.hotspots || []).map((hs: any): Hotspot => normalizeHotspot(hs));

        return {
            id: dbScene.id,
            title: dbScene.title,
            imageUrl: dbScene.imageUrl,
            thumbnailUrl: dbScene.thumbnailUrl || extras.thumbnailUrl,
            isDefault: dbScene.isDefault,
            category: dbScene.category?.toLowerCase() || "raw",
            hotspots: [...dbHotspots, ...extraHotspots],
            polygons: extras.polygons as Scene["polygons"],
            floatingLabels: extras.floatingLabels as Scene["floatingLabels"],
            masterplanOverlay: (dbScene.masterplanOverlay || extras.masterplanOverlay) as Scene["masterplanOverlay"],
        };
    });
}

export const metadata: Metadata = {
    title: "Tour Virtual 360 | Seventoop",
    description: "Recorre el proyecto con un tour virtual inmersivo 360",
};

export default async function PublicTour360Page({ params }: { params: { slug: string } }) {
    const project = await getProjectWithTour(params.slug);

    if (!project) {
        notFound();
    }

    const isPublished = project.visibilityStatus === "PUBLICADO" || project.estado === "PUBLICADO";
    if (!isPublished) {
        notFound();
    }

    if (!project.tours || project.tours.length === 0) {
        notFound();
    }

    const defaultTour = project.tours[0];
    const scenes = dbTourToScenes(defaultTour);

    if (scenes.length === 0) {
        notFound();
    }

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950">
            <div className="z-50 flex h-16 items-center justify-between border-b border-white/10 bg-slate-900 px-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/proyectos/${params.slug}`}
                        className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-white">{project.nombre}</h1>
                        <p className="text-xs text-slate-400">Tour Virtual 360</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/proyectos/${params.slug}#contacto`}
                        className="gradient-brand rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-glow"
                    >
                        Consultar
                    </Link>
                </div>
            </div>

            <div className="relative flex-1">
                <TourViewer
                    scenes={scenes}
                    proyectoId={project.id}
                    proyectoSlug={project.slug || params.slug}
                    proyectoNombre={project.nombre}
                    className="h-full w-full rounded-none"
                    autoRotate={true}
                />
            </div>
        </div>
    );
}
