"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { uploadFile } from "@/lib/storage";

export interface PannellumHotspot {
    id: string;
    pitch: number;
    yaw: number;
    type: "info" | "scene" | "unit";
    text?: string;
    targetSceneId?: string;
    unidadId?: string;
    unidadNumero?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getTourScenes(tourId: string) {
    try {
        await requireAuth();
        const scenes = await (prisma.tourScene as any).findMany({
            where: { tourId },
            orderBy: { order: "asc" },
            select: {
                id: true,
                title: true,
                imageUrl: true,
                thumbnailUrl: true,
                pannellumHotspots: true,
                isDefault: true,
                order: true,
                tourId: true,
            }
        });

        return {
            success: true,
            data: scenes.map((s: any) => ({
                ...s,
                pannellumHotspots: parseJson(s.pannellumHotspots),
            }))
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTourScene(tourId: string, data: {
    title: string;
    imageUrl: string;
    thumbnailUrl?: string;
    orden?: number;
}) {
    try {
        await requireAuth();

        const count = await (prisma.tourScene as any).count({ where: { tourId } });

        const scene = await (prisma.tourScene as any).create({
            data: {
                tourId,
                title: data.title,
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl ?? null,
                order: data.orden ?? count,
                pannellumHotspots: [],
            }
        });

        return { success: true, data: scene };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateTourSceneHotspots(sceneId: string, hotspots: PannellumHotspot[]) {
    try {
        await requireAuth();

        if (!Array.isArray(hotspots)) {
            return { success: false, error: "hotspots debe ser un array" };
        }

        await (prisma.tourScene as any).update({
            where: { id: sceneId },
            data: { pannellumHotspots: hotspots as any }
        });

        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteTourScene(sceneId: string) {
    try {
        await requireAuth();
        await (prisma.tourScene as any).delete({ where: { id: sceneId } });
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function reorderTourScenes(sceneIds: string[]) {
    try {
        await requireAuth();
        await Promise.all(
            sceneIds.map((id, i) => (prisma.tourScene as any).update({ where: { id }, data: { order: i } }))
        );
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function uploadTourSceneImage(formData: FormData, tourId: string) {
    try {
        await requireAuth();

        const file = formData.get("file") as File | null;
        if (!file) return { success: false, error: "No se recibió archivo" };

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await uploadFile({
            folder: `tours/${tourId}`,
            filename: file.name,
            contentType: file.type || "image/jpeg",
            buffer,
        });

        return { success: true, url: result.url };
    } catch (error: any) {
        return { success: false, error: error.message || "Error al subir imagen" };
    }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseJson(val: any): any[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return []; }
    }
    return [];
}
