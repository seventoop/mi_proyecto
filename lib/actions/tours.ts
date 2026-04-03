"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";

// â”€â”€â”€ Schemas â”€â”€â”€

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
    category: z.enum(["RAW", "RENDERED"]).default("RAW"),
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

// â”€â”€â”€ Queries â”€â”€â”€

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

// â”€â”€â”€ Mutations â”€â”€â”€

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
                        category: scene.category,
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


