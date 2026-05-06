import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireProjectOwnership, AuthError } from "@/lib/guards";
import { toStoredTourSceneCategory } from "@/lib/tour-media";

const createTourSchema = z.object({
    proyectoId: z.string(),
    unidadId: z.string().optional().nullable(),
    nombre: z.string().min(3),
    scenes: z.array(z.object({
        id: z.string().optional(),
        clientSceneId: z.string().optional(),
        title: z.string(),
        imageUrl: z.string(),
        thumbnailUrl: z.string().optional().nullable(),
        category: z.string().optional(),
        direction: z.string().optional().nullable(),
        masterplanOverlay: z.any().optional().nullable(),
        isDefault: z.boolean().optional(),
        order: z.number().optional(),
        hotspots: z.array(z.any()).optional().default([]),
    })).optional(),
    escenas: z.array(z.object({
        id: z.string().optional(),
        clientSceneId: z.string().optional(),
        title: z.string(),
        imageUrl: z.string(),
        thumbnailUrl: z.string().optional().nullable(),
        category: z.string().optional(),
        direction: z.string().optional().nullable(),
        masterplanOverlay: z.any().optional().nullable(),
        isDefault: z.boolean().optional(),
        order: z.number().optional(),
        hotspots: z.array(z.any()).optional().default([]),
    })).optional().default([]),
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

export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const proyectoId = searchParams.get("proyectoId");
        const unidadId = searchParams.get("unidadId");

        const where: any = {};

        // Security: If specific project is requested, check ownership
        if (proyectoId) {
            await requireProjectOwnership(proyectoId);
            where.proyectoId = proyectoId;
        } else {
            // If listing all, filter by user's organization unless ADMIN/SUPERADMIN
            const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
            if (!isAdmin) {
                where.proyecto = { orgId: user.orgId ?? "___NO_ORG___" };
            }
        }

        if (unidadId) where.unidadId = unidadId;

        const tours = await db.tour360.findMany({
            where,
            include: {
                scenes: {
                    include: {
                        hotspots: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(tours);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error fetching tours:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = createTourSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        const { proyectoId, unidadId, nombre } = validation.data;
        const scenes = validation.data.scenes ?? validation.data.escenas ?? [];

        // Security: Require project ownership
        await requireProjectOwnership(proyectoId);

        const tour = await db.$transaction(async (tx) => {
            const createdTour = await tx.tour360.create({
                data: {
                    proyectoId,
                    unidadId: unidadId || null,
                    nombre,
                    estado: "PENDIENTE",
                },
            });

            const sceneRefToDbId = new Map<string, string>();
            const createdScenes: Array<{ sourceScene: any; createdSceneId: string }> = [];

            for (const scene of scenes) {
                const createdScene = await tx.tourScene.create({
                    data: {
                        tourId: createdTour.id,
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

            return tx.tour360.findUnique({
                where: { id: createdTour.id },
                include: {
                    scenes: {
                        include: {
                            hotspots: true
                        }
                    }
                }
            });
        });

        return NextResponse.json(tour, { status: 201 });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error creating tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}
