import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireProjectOwnership, AuthError } from "@/lib/guards";
import { toStoredTourSceneCategory } from "@/lib/tour-media";

const updateTourSchema = z.object({
    nombre: z.string().min(3).optional(),
    scenes: z.array(z.any()).optional(),
    escenas: z.array(z.any()).optional(),
});

function registerSceneReference(
    sceneRefToDbId: Map<string, string>,
    scene: { id?: string; clientSceneId?: string },
    dbSceneId: string
) {
    if (scene.clientSceneId) {
        sceneRefToDbId.set(scene.clientSceneId, dbSceneId);
    }
    if (scene.id) {
        sceneRefToDbId.set(scene.id, dbSceneId);
    }
}

function resolveHotspotTargetSceneId(
    rawTargetSceneId: string | null | undefined,
    sceneRefToDbId: Map<string, string>
) {
    if (!rawTargetSceneId) return null;
    return sceneRefToDbId.get(rawTargetSceneId) ?? rawTargetSceneId;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const user = await requireAuth();

        const tour = await db.tour360.findUnique({
            where: { id: params.id },
        });

        if (!tour) {
            return NextResponse.json({ message: "Tour no encontrado" }, { status: 404 });
        }

        // Security: Check project ownership/tenant boundary
        await requireProjectOwnership(tour.proyectoId);

        return NextResponse.json(tour);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error fetching tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const validation = updateTourSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        // Fetch tour to check project ownership
        const existing = await db.tour360.findUnique({
            where: { id: params.id },
            select: { proyectoId: true },
        });

        if (!existing) {
            return NextResponse.json({ message: "Tour no encontrado" }, { status: 404 });
        }

        await requireProjectOwnership(existing.proyectoId);

        const { nombre } = validation.data;
        const scenes = validation.data.scenes ?? validation.data.escenas;

        const tour = await db.$transaction(async (tx) => {
            if (scenes) {
                // Simplified sync: delete and recreate
                await tx.tourScene.deleteMany({ where: { tourId: params.id } });
            }

            const updatedTour = await tx.tour360.update({
                where: { id: params.id },
                data: {
                    nombre,
                    estado: "PENDIENTE"
                }
            });

            if (scenes) {
                const sceneRefToDbId = new Map<string, string>();
                const createdScenes: Array<{ sourceScene: any; createdSceneId: string }> = [];

                for (const scene of scenes) {
                    const createdScene = await tx.tourScene.create({
                        data: {
                            tourId: params.id,
                            title: scene.title,
                            imageUrl: scene.imageUrl,
                            thumbnailUrl: scene.thumbnailUrl ?? undefined,
                            category: toStoredTourSceneCategory(scene.category),
                            masterplanOverlay: scene.masterplanOverlay ?? undefined,
                            isDefault: scene.isDefault || false,
                            order: scene.order || 0,
                        },
                    });

                    registerSceneReference(sceneRefToDbId, scene, createdScene.id);
                    createdScenes.push({ sourceScene: scene, createdSceneId: createdScene.id });
                }

                for (const { sourceScene, createdSceneId } of createdScenes) {
                    if ((sourceScene.hotspots || []).length === 0) continue;

                    await tx.hotspot.createMany({
                        data: (sourceScene.hotspots || []).map((hotspot: any) => ({
                            sceneId: createdSceneId,
                            unidadId: hotspot.unidadId,
                            type: (hotspot.type || "info").toUpperCase(),
                            pitch: hotspot.pitch,
                            yaw: hotspot.yaw,
                            text: hotspot.text || "",
                            targetSceneId: resolveHotspotTargetSceneId(hotspot.targetSceneId || null, sceneRefToDbId),
                        })),
                    });
                }
            }

            return tx.tour360.findUnique({
                where: { id: updatedTour.id },
                include: {
                    scenes: {
                        include: {
                            hotspots: true
                        }
                    }
                }
            });
        });

        return NextResponse.json(tour);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error updating tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        // Fetch tour to check project ownership
        const existing = await db.tour360.findUnique({
            where: { id: params.id },
            select: { proyectoId: true },
        });

        if (!existing) {
            return NextResponse.json({ message: "Tour no encontrado" }, { status: 404 });
        }

        await requireProjectOwnership(existing.proyectoId);

        await db.tour360.delete({
            where: { id: params.id },
        });

        return NextResponse.json({}, { status: 204 });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error deleting tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}
