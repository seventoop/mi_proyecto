"use server";

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

export async function updateProyectoOverlayBounds(proyectoId: string, bounds: {
    nw: { lat: number; lng: number };
    ne: { lat: number; lng: number };
    se: { lat: number; lng: number };
    sw: { lat: number; lng: number };
} | null) {
    try {
        await prisma.proyecto.update({
            where: { id: proyectoId },
            data: { overlayBounds: bounds ? JSON.stringify(bounds) : null }
        });
        revalidatePath(`/dashboard/admin/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to save overlay bounds" };
    }
}
