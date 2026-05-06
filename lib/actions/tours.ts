"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { toStoredTourSceneCategory } from "@/lib/tour-media";
import { buildFallbackTour360Scenes } from "@/lib/tour360-fallback";
import fs from "fs";
import path from "path";

function forensicLog(msg: string) {
    try {
        const logPath = path.join(process.cwd(), "forensic_logs.txt");
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    } catch (e) {
        // Ignorar errores de log
    }
}

// ─── Schemas ───

const hotspotSchema = z.object({
    id: z.string().optional(),
    unidadId: z.string().optional().nullable(),
    type: z.enum(["INFO", "SCENE", "LINK", "UNIT"]),
    pitch: z.number(),
    yaw: z.number(),
    text: z.string().optional().nullable(),
    targetSceneId: z.string().optional().nullable(),
});

const imageUrlSchema = z
    .string()
    .min(1, "URL de imagen invalida")
    .refine(
        (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
        "URL de imagen invalida"
    );

const sceneSchema = z.object({
    id: z.string().optional(),
    clientSceneId: z.string().optional(),
    title: z.string().min(1, "Título de escena requerido"),
    imageUrl: imageUrlSchema,
    thumbnailUrl: imageUrlSchema.optional().nullable(),
    masterplanOverlay: z.any().optional().nullable(),
    isDefault: z.boolean().default(false),
    order: z.number().default(0),
    category: z.string().default("TOUR360"),
    hotspots: z.array(hotspotSchema).default([]),
});

const createTourSchema = z.object({
    proyectoId: z.string().min(1, "proyectoId requerido"),
    nombre: z.string().min(1, "Nombre requerido").max(200),
    unidadId: z.string().optional().nullable(),
    scenes: z.array(sceneSchema).min(1, "Al menos una escena es requerida"),
});

const updateTourSchema = createTourSchema.extend({
    id: z.string().min(1),
});

const hydratedTourInclude = {
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
        orderBy: { order: "asc" as const }
    }
} as const;

async function revalidateTourProjectPaths(proyectoId: string) {
    const project = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: { slug: true },
    });

    revalidatePath(`/dashboard/proyectos/${proyectoId}`);
    revalidatePath(`/dashboard/admin/proyectos/${proyectoId}`);
    revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);

    if (project) {
        revalidatePath(`/proyectos/${project.slug || proyectoId}`);
        revalidatePath(`/proyectos/${project.slug || proyectoId}/tour360`);
    }
}

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

// ─── Queries ───

export async function getProjectTours(proyectoId: string) {
    try {
        await requireAuth();
        await requireProjectOwnership(proyectoId);

        const tours = await prisma.tour360.findMany({
            where: { proyectoId },
            include: hydratedTourInclude,
            orderBy: { updatedAt: "desc" },
        });
        return { success: true, data: tours };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getPublicTour(tourId: string) {
    try {
        const tour = await prisma.tour360.findUnique({
            where: { id: tourId },
            include: {
                proyecto: { select: { estado: true } },
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
            }
        });

        if (!tour) return { success: false, error: "Tour no encontrado" };

        // Security requirement: Only published projects
        if ((tour as any).proyecto.estado !== "PUBLICADO") {
            return { success: false, error: "Este tour no está disponible públicamente" };
        }

        return { success: true, data: tour };
    } catch (error) {
        return { success: false, error: "Error al cargar el tour" };
    }
}

export async function createTour(input: any) {
    return upsertTour(input);
}

export async function updateTour(id: string, input: any) {
    return upsertTour({ ...input, id });
}

export async function bootstrapTour360FromProjectAssets(proyectoId: string) {
    console.log("[Tour360][bootstrap][action][start]", { proyectoId });
    forensicLog(`BOOTSTRAP: Iniciando para proyecto ${proyectoId}`);
    try {
        await requireProjectOwnership(proyectoId);

        const project = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: {
                id: true,
                nombre: true,
                slug: true,
                planGallery: true,
                tours: {
                    include: {
                        scenes: true,
                    },
                    orderBy: { updatedAt: "desc" },
                },
            },
        });

        if (!project) {
            return { success: false, error: "Proyecto no encontrado" };
        }

        const fallbackScenes = buildFallbackTour360Scenes(project as any);
        if (fallbackScenes.length === 0) {
            return { success: false, error: "No encontré una imagen 360 local ni un plano para crear la escena base" };
        }

        const baseScene = fallbackScenes[0];
        const expectedBootstrapTitle = project.nombre ? `${project.nombre} 360` : "Tour 360";
        const existingTourWith360 = project.tours.find((tour) =>
            (tour.scenes || []).some((scene) => String(scene.category || "").toUpperCase() === "TOUR360")
        );

        if (existingTourWith360) {
            const existingScene = (existingTourWith360.scenes || []).find(
                (scene) => String(scene.category || "").toUpperCase() === "TOUR360"
            );

            const isBootstrapScene =
                !!existingScene &&
                (existingTourWith360.scenes || []).length === 1 &&
                existingScene.title === expectedBootstrapTitle;

            if (existingScene && isBootstrapScene) {
                console.log("[Tour360][bootstrap][action][result]", { created: false, updated: true, tourId: existingTourWith360.id });
                forensicLog(`BOOTSTRAP: Ya existe un tour de bootstrap para ${proyectoId} (${existingTourWith360.id}). Actualizando imágenes.`);
                await prisma.tourScene.update({
                    where: { id: existingScene.id },
                    data: {
                        imageUrl: baseScene.imageUrl,
                        thumbnailUrl: baseScene.thumbnailUrl,
                        masterplanOverlay: (baseScene.masterplanOverlay ?? undefined) as any,
                    },
                });

                await prisma.proyecto.update({
                    where: { id: project.id },
                    data: {
                        tour360Url: `/proyectos/${project.slug || project.id}/tour360`,
                    },
                });

                revalidatePath(`/dashboard/proyectos/${project.id}`);
                revalidatePath(`/proyectos/${project.slug || project.id}`);
                revalidatePath(`/proyectos/${project.slug || project.id}/tour360`);

                return { success: true, data: existingTourWith360, created: false, updated: true };
            }

            console.log("[Tour360][bootstrap][action][result]", { created: false, updated: false, tourId: existingTourWith360.id });
            forensicLog(`BOOTSTRAP: El proyecto ${proyectoId} ya tiene un tour con escenas 360 (${existingTourWith360.id}). No se crea nada nuevo.`);
            return { success: true, data: existingTourWith360, created: false };
        }

        forensicLog(`BOOTSTRAP: No hay tours con escenas 360 para ${proyectoId}. Procediendo a crear un nuevo tour de bootstrap.`);

        const created = await prisma.$transaction(async (tx: any) => {
            const tour = await tx.tour360.create({
                data: {
                    proyectoId: project.id,
                    nombre: "Tour 360",
                },
            });

            await tx.tourScene.create({
                data: {
                    tourId: tour.id,
                    title: baseScene.title,
                    imageUrl: baseScene.imageUrl,
                    thumbnailUrl: baseScene.thumbnailUrl,
                    isDefault: true,
                    order: 0,
                    category: "TOUR360",
                    masterplanOverlay: (baseScene.masterplanOverlay ?? undefined) as any,
                },
            });

            await tx.proyecto.update({
                where: { id: project.id },
                data: {
                    tour360Url: `/proyectos/${project.slug || project.id}/tour360`,
                },
            });

            return tour;
        });

        revalidatePath(`/dashboard/proyectos/${project.id}`);
        revalidatePath(`/proyectos/${project.slug || project.id}`);
        revalidatePath(`/proyectos/${project.slug || project.id}/tour360`);

        console.log("[Tour360][bootstrap][action][result]", { created: true, tourId: created.id });
        forensicLog(`BOOTSTRAP: Nuevo tour de bootstrap creado exitosamente para ${proyectoId}: ${created.id}`);
        return { success: true, data: created, created: true };
    } catch (error) {
        console.error("Tour bootstrap error:", error);
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function upsertTour(input: unknown) {
    try {
        const parsed = createTourSchema.partial({ proyectoId: true }).safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }

        const data = parsed.data as any;
        const tourId = (input as any).id;

        let proyectoId = data.proyectoId;

        if (tourId) {
            const existing = await prisma.tour360.findUnique({ where: { id: tourId }, select: { proyectoId: true } });
            if (!existing) return { success: false, error: "Tour no encontrado" };
            proyectoId = existing.proyectoId;
        }

        if (!proyectoId) return { success: false, error: "Proyecto ID requerido" };
        await requireProjectOwnership(proyectoId);

        // Perform complex sync in transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Upsert Main Tour
            const tour = tourId
                ? await tx.tour360.update({
                    where: { id: tourId },
                    data: { nombre: data.nombre, unidadId: data.unidadId, estado: "PENDIENTE" }
                })
                : await tx.tour360.create({
                    data: { proyectoId, nombre: data.nombre, unidadId: data.unidadId }
                });

            // 2. Sync Scenes
            if (tourId) {
                // For updates, we simplify by clearing and recreating
                await tx.tourScene.deleteMany({ where: { tourId: tour.id } });
            }

            const sceneRefToDbId = new Map<string, string>();
            const createdScenes: Array<{ sourceScene: any; createdSceneId: string }> = [];

            for (const scene of data.scenes) {
                const createdScene = await tx.tourScene.create({
                    data: {
                        tourId: tour.id,
                        title: scene.title,
                        imageUrl: scene.imageUrl,
                        thumbnailUrl: scene.thumbnailUrl ?? undefined,
                        masterplanOverlay: scene.masterplanOverlay ?? undefined,
                        isDefault: scene.isDefault,
                        order: scene.order,
                        category: toStoredTourSceneCategory(scene.category),
                    }
                });
                registerSceneReference(sceneRefToDbId, scene, createdScene.id);
                createdScenes.push({ sourceScene: scene, createdSceneId: createdScene.id });
            }

            for (const { sourceScene, createdSceneId } of createdScenes) {
                if (sourceScene.hotspots && sourceScene.hotspots.length > 0) {
                    await tx.hotspot.createMany({
                        data: sourceScene.hotspots.map((hs: any) => ({
                            sceneId: createdSceneId,
                            unidadId: hs.unidadId,
                            type: hs.type,
                            pitch: hs.pitch,
                            yaw: hs.yaw,
                            text: hs.text,
                            targetSceneId: resolveHotspotTargetSceneId(hs.targetSceneId, sceneRefToDbId),
                        }))
                    });
                }
            }

            return tour;
        });

        const hydratedTour = await prisma.tour360.findUnique({
            where: { id: result.id },
            include: hydratedTourInclude,
        });

        await revalidateTourProjectPaths(proyectoId);
        return { success: true, data: hydratedTour ?? result };
    } catch (error) {
        console.error("Tour Upsert Error:", error);
        return handleGuardError(error);
    }
}

export async function deleteTour(id: string) {
    try {
        const existing = await prisma.tour360.findUnique({
            where: { id },
            select: { proyectoId: true },
        });
        if (!existing) return { success: false, error: "Tour no encontrado" };

        await requireProjectOwnership(existing.proyectoId);

        console.log("[Tour360][deleteTour] deleting", { tourId: id, proyectoId: existing.proyectoId });
        forensicLog(`DELETE: Borrando tour ${id} del proyecto ${existing.proyectoId}`);
        await prisma.tour360.delete({ where: { id } });

        console.log("[Tour360][deleteTour] deleted", { tourId: id });
        forensicLog(`DELETE: Tour ${id} borrado exitosamente en DB`);
        await revalidateTourProjectPaths(existing.proyectoId);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function publishTour360(proyectoId: string, tourId: string) {
    try {
        await requireProjectOwnership(proyectoId);

        const existing = await prisma.tour360.findUnique({
            where: { id: tourId },
            select: { id: true, proyectoId: true },
        });

        if (!existing || existing.proyectoId !== proyectoId) {
            return { success: false, error: "Tour no encontrado en este proyecto" };
        }

        const publishedTour = await prisma.$transaction(async (tx: any) => {
            await tx.tour360.updateMany({
                where: { proyectoId },
                data: { isPublished: false },
            });

            await tx.tour360.update({
                where: { id: tourId },
                data: { isPublished: true },
            });

            return tx.tour360.findUnique({
                where: { id: tourId },
                include: hydratedTourInclude,
            });
        });

        await revalidateTourProjectPaths(proyectoId);
        return { success: true, data: publishedTour };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function unpublishTour360(proyectoId: string, tourId: string) {
    try {
        await requireProjectOwnership(proyectoId);

        const existing = await prisma.tour360.findUnique({
            where: { id: tourId },
            select: { id: true, proyectoId: true },
        });

        if (!existing || existing.proyectoId !== proyectoId) {
            return { success: false, error: "Tour no encontrado en este proyecto" };
        }

        const unpublishedTour = await prisma.tour360.update({
            where: { id: tourId },
            data: { isPublished: false },
            include: hydratedTourInclude,
        });

        await revalidateTourProjectPaths(proyectoId);
        return { success: true, data: unpublishedTour };
    } catch (error) {
        return handleGuardError(error);
    }
}

// Moderation
export async function approveTour(id: string) {
    try {
        await requireRole("ADMIN");
        const tour = await prisma.tour360.update({
            where: { id },
            data: { estado: "APROBADO", notasAdmin: null },
        });
        await revalidateTourProjectPaths(tour.proyectoId);
        return { success: true, data: tour };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function rejectTour(id: string, reason: string) {
    try {
        await requireRole("ADMIN");
        const tour = await prisma.tour360.update({
            where: { id },
            data: { estado: "RECHAZADO", notasAdmin: reason.trim() },
        });
        await revalidateTourProjectPaths(tour.proyectoId);
        return { success: true, data: tour };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function logForensicEvent(event: string) {
    try {
        forensicLog("CLIENT: " + event);
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}
