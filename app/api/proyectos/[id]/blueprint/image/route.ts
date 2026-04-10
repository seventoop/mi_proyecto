import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireProjectOwnership, handleApiGuardError } from "@/lib/guards";

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);

        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { masterplanSVG: true },
        });

        if (!project?.masterplanSVG) {
            return new NextResponse("Plano no encontrado", { status: 404 });
        }

        return new NextResponse(project.masterplanSVG, {
            status: 200,
            headers: {
                "Content-Type": "image/svg+xml; charset=utf-8",
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
