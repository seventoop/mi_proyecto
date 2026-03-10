import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/proyectos/[id]/blueprint
 * Returns the persisted masterplanSVG and synced units for the project.
 * Used by BlueprintEngine to restore state when returning to the blueprint tab.
 */
export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const isAdmin = (session.user as any).role === "ADMIN";

        const project = await prisma.proyecto.findFirst({
            where: {
                id: params.id,
                ...(isAdmin ? {} : { creadoPorId: session.user.id }),
            },
            select: {
                masterplanSVG: true,
                etapas: {
                    take: 1,
                    orderBy: { orden: "asc" },
                    include: {
                        manzanas: {
                            take: 1,
                            orderBy: { createdAt: "asc" },
                            include: {
                                unidades: {
                                    select: {
                                        id: true,
                                        numero: true,
                                        superficie: true,
                                        precio: true,
                                        frente: true,
                                        fondo: true,
                                        estado: true,
                                        coordenadasMasterplan: true,
                                    },
                                    orderBy: { createdAt: "asc" },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
        }

        const unidades = project.etapas[0]?.manzanas[0]?.unidades ?? [];

        return NextResponse.json({
            masterplanSVG: project.masterplanSVG ?? null,
            unidades,
        });
    } catch (error) {
        console.error("Error fetching blueprint:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
