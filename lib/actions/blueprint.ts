"use server";

import prisma from "@/lib/db";
import { requireAuth } from "@/lib/guards";

export async function updateUnidadPolygon(
    unidadId: string,
    polygon: Array<{ lat: number; lng: number }>
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAuth();

        if (!Array.isArray(polygon)) {
            return { success: false, error: "polygon debe ser un array" };
        }
        if (polygon.length < 3) {
            return { success: false, error: "El polígono debe tener al menos 3 puntos" };
        }
        for (const pt of polygon) {
            if (typeof pt.lat !== "number" || typeof pt.lng !== "number") {
                return { success: false, error: "Cada punto debe tener lat y lng numéricos" };
            }
        }

        await prisma.unidad.update({
            where: { id: unidadId },
            data: { polygon: polygon as any },
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Error al guardar polígono" };
    }
}
