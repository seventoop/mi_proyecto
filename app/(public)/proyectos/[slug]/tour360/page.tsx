import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import prisma from "@/lib/db";
import TourViewer, { Scene, Hotspot } from "@/components/tour360/tour-viewer";

// ─── Data Fetching (Server-Side) ───

async function getProjectWithTour(slug: string) {
    // Try by slug first, then by ID
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
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { order: "asc" }
                    }
                },
                take: 1
            }
        }
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
                                            }
                                        }
                                    }
                                }
                            },
                            orderBy: { order: "asc" }
                        }
                    },
                    take: 1
                }
            }
        });
    }

    return project;
}

// ─── Security: Transform DB data to viewer-compatible format ───

function dbTourToScenes(tour: any): Scene[] {
    if (!tour?.scenes?.length) return [];

    return tour.scenes.map((dbScene: any) => ({
        id: dbScene.id,
        title: dbScene.title,
        imageUrl: dbScene.imageUrl,
        isDefault: dbScene.isDefault,
        category: dbScene.category?.toLowerCase() || "raw",
        hotspots: (dbScene.hotspots || []).map((hs: any): Hotspot => ({
            id: hs.id,
            type: hs.type?.toLowerCase() || "info",
            pitch: hs.pitch,
            yaw: hs.yaw,
            text: hs.text || "",
            unidad: hs.unidad || undefined,
            targetSceneId: hs.targetSceneId || undefined,
        })),
        polygons: [],
        floatingLabels: [],
    }));
}

// ─── Metadata ───

export const metadata: Metadata = {
    title: "Tour Virtual 360° | Seventoop",
    description: "Recorre el proyecto con un tour virtual inmersivo 360°",
};

// ─── Page Component ───

export default async function PublicTour360Page({ params }: { params: { slug: string } }) {
    const project = await getProjectWithTour(params.slug);

    // Security: Only published projects are accessible
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
        <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
            {/* Minimal Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900 z-50">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/proyectos/${params.slug}`}
                        className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-white">{project.nombre}</h1>
                        <p className="text-xs text-slate-400">Tour Virtual 360°</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/proyectos/${params.slug}#contacto`}
                        className="px-4 py-2 rounded-lg gradient-brand text-white text-sm font-semibold shadow-glow"
                    >
                        Consultar
                    </Link>
                </div>
            </div>

            <div className="flex-1 relative">
                <TourViewer
                    scenes={scenes}
                    proyectoId={project.id}
                    className="w-full h-full rounded-none"
                    autoRotate={true}
                />
            </div>
        </div>
    );
}
