import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireProjectOwnership, AuthError } from "@/lib/guards";

export async function PATCH(
    request: Request,
    { params }: { params: { sceneId: string } }
) {
    try {
        await requireAuth();

        const body = await request.json();
        const { masterplanOverlay } = body;

        if (masterplanOverlay === undefined) {
            return NextResponse.json({ message: "masterplanOverlay es requerido" }, { status: 400 });
        }

        const existingScene = await db.tourScene.findUnique({
            where: { id: params.sceneId },
            select: {
                id: true,
                tour: {
                    select: {
                        id: true,
                        proyectoId: true,
                    }
                }
            },
        });

        if (!existingScene) {
            return NextResponse.json({ message: "Escena no encontrada" }, { status: 404 });
        }

        await requireProjectOwnership(existingScene.tour.proyectoId);

        const scene = await db.tourScene.update({
            where: { id: params.sceneId },
            data: { masterplanOverlay },
            select: { id: true, masterplanOverlay: true },
        });

        return NextResponse.json(scene);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error updating scene overlay:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}
