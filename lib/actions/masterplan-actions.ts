"use client";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";

export async function updateUnitPolygon(unitId: string, polygon: any) {
    try {
        await prisma.unidad.update({
            where: { id: unitId },
            data: { polygon }
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to update unit polygon:", error);
        return { success: false, error: "Database update failed" };
    }
}

export async function updateProjectMapConfig(projectId: string, data: { lat: number, lng: number, zoom: number }) {
    try {
        await prisma.proyecto.update({
            where: { id: projectId },
            data: {
                mapCenterLat: data.lat,
                mapCenterLng: data.lng,
                mapZoom: data.zoom
            }
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update project config" };
    }
}
