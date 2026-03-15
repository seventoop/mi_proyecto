import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import { proyectoUpdateSchema } from "@/lib/validations";

// GET /api/proyectos/[id] — detalle completo (dashboard only — includes CRM data)
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth();

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: params.id },
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: {
                                    include: {
                                        responsable: {
                                            select: { id: true, nombre: true, email: true },
                                        },
                                        historial: {
                                            orderBy: { createdAt: "desc" },
                                            take: 5,
                                            include: {
                                                usuario: {
                                                    select: { id: true, nombre: true },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { orden: "asc" },
                },
                leads: {
                    take: 10,
                    orderBy: { createdAt: "desc" },
                },
                oportunidades: {
                    take: 10,
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!proyecto) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        // Compute stats
        const allUnidades = proyecto.etapas.flatMap((e) =>
            e.manzanas.flatMap((m) => m.unidades)
        );
        const stats = {
            totalUnidades: allUnidades.length,
            disponibles: allUnidades.filter((u) => u.estado === "DISPONIBLE").length,
            reservadas: allUnidades.filter((u) => u.estado === "RESERVADO").length,
            vendidas: allUnidades.filter((u) => u.estado === "VENDIDO").length,
            bloqueadas: allUnidades.filter((u) => u.estado === "BLOQUEADO").length,
            valorTotal: allUnidades.reduce((s, u) => s + (u.precio || 0), 0),
            valorVendido: allUnidades
                .filter((u) => u.estado === "VENDIDO")
                .reduce((s, u) => s + (u.precio || 0), 0),
            valorReservado: allUnidades
                .filter((u) => u.estado === "RESERVADO")
                .reduce((s, u) => s + (u.precio || 0), 0),
        };

        return NextResponse.json({ ...proyecto, stats });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// PUT handler removed to eliminate split-brain over mutations. Calls must use `updateProyecto` Server Action.
