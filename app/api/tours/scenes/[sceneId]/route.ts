import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/guards";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ sceneId: string }> }
) {
    try {
        const { sceneId } = await params;
        await requireAuth();

        const body = await request.json();
        const { masterplanOverlay } = body;

        if (masterplanOverlay === undefined) {
            return NextResponse.json({ message: "masterplanOverlay es requerido" }, { status: 400 });
        }

        const scene = await db.tourScene.update({
            where: { id: sceneId },
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
