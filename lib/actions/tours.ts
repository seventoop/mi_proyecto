"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { toStoredTourSceneCategory } from "@/lib/tour-media";
import { buildFallbackTour360Scenes } from "@/lib/tour360-fallback";

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
    title: z.string().min(1, "Título de escena requerido"),
    imageUrl: imageUrlSchema,
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

// ─── Queries ───

export async function getProjectTours(proyectoId: string) {
    try {
        await requireAuth();
        await requireProjectOwnership(proyectoId);

        const tours = await prisma.tour360.findMany({
            where: { proyectoId },
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

            return { success: true, data: existingTourWith360, created: false };
        }

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

            for (const scene of data.scenes) {
                const createdScene = await tx.tourScene.create({
                    data: {
                        tourId: tour.id,
                        title: scene.title,
                        imageUrl: scene.imageUrl,
                        masterplanOverlay: scene.masterplanOverlay ?? undefined,
                        isDefault: scene.isDefault,
                        order: scene.order,
                        category: toStoredTourSceneCategory(scene.category),
                    }
                });

                // 3. Create Hotspots
                if (scene.hotspots && scene.hotspots.length > 0) {
                    await tx.hotspot.createMany({
                        data: scene.hotspots.map((hs: any) => ({
                            sceneId: createdScene.id,
                            unidadId: hs.unidadId,
                            type: hs.type,
                            pitch: hs.pitch,
                            yaw: hs.yaw,
                            text: hs.text,
                            targetSceneId: hs.targetSceneId,
                        }))
                    });
                }
            }

            return tour;
        });

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true, data: result };
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

        await prisma.tour360.delete({ where: { id } });

        revalidatePath(`/dashboard/proyectos/${existing.proyectoId}`);
        return { success: true };
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
        revalidatePath(`/dashboard/proyectos/${tour.proyectoId}`);
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
        revalidatePath(`/dashboard/proyectos/${tour.proyectoId}`);
        return { success: true, data: tour };
    } catch (error) {
        return handleGuardError(error);
    }
}

