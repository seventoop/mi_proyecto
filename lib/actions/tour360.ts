"use server";

import prisma from "@/lib/db";
import { requireAuth } from "@/lib/guards";

export async function saveTour360Anchors(
    tourId: string,
    anchors: any[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAuth();

        const stable = JSON.parse(JSON.stringify(anchors));
        await (prisma.tour360 as any).update({
            where: { id: tourId },
            data: { anchors: stable },
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Error al guardar anchors" };
    }
}

export async function getTour360Anchors(
    tourId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const tour = await prisma.tour360.findUnique({
            where: { id: tourId },
            select: { id: true },
        });
        if (!tour) return { success: false, error: "Tour no encontrado" };
        const full = await (prisma.tour360 as any).findUnique({
            where: { id: tourId },
            select: { anchors: true },
        });
        const raw = full?.anchors;
        const data = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateProyectoTour360Url(
    proyectoId: string,
    url: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAuth();
        await (prisma.proyecto as any).update({
            where: { id: proyectoId },
            data: { tour360Url: url },
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
