import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
    requireAuth,
    requireProjectOwnership,
    handleApiGuardError,
} from "@/lib/guards";

// GET /api/proyectos/[id] — detalle completo
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

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

        // Multi-tenant check: non-admin users can only see projects in their org.
        // Fail-secure: deny if either side has no orgId (prevents legacy data leaks).
        // Returns 404 (not 403) to avoid leaking existence of other tenants' projects.
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            if (!user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
                return NextResponse.json(
                    { error: "Proyecto no encontrado" },
                    { status: 404 }
                );
            }
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

// PUT /api/proyectos/[id] — actualizar
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);

        const body = await request.json();

        const proyecto = await prisma.proyecto.update({
            where: { id: params.id },
            data: {
                nombre: body.nombre,
                descripcion: body.descripcion,
                ubicacion: body.ubicacion,
                estado: body.estado,
                tipo: body.tipo,
                imagenPortada: body.imagenPortada,
                galeria: body.galeria,
                documentos: body.documentos,
                masterplanSVG: body.masterplanSVG,
                // masterplanConfig: body.masterplanConfig,
            },
        });

        return NextResponse.json(proyecto);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// PATCH /api/proyectos/[id] — partial update (map location, etc.)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);

        const body = await request.json();
        const data: Record<string, any> = {};
        if (body.mapCenterLat != null) data.mapCenterLat = Number(body.mapCenterLat);
        if (body.mapCenterLng != null) data.mapCenterLng = Number(body.mapCenterLng);
        if (body.mapZoom != null) data.mapZoom = Number(body.mapZoom);

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const proyecto = await prisma.proyecto.update({
            where: { id: params.id },
            data,
        });
        return NextResponse.json({ success: true, proyecto });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// DELETE /api/proyectos/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    // Re-use server action logic for consistency and security
    const { deleteProyecto } = await import("@/lib/actions/proyectos");
    const result = await deleteProyecto(params.id);

    if (!result.success) {
        // Safe access to union type without 'as any' 
        const errorMessage = 'error' in result ? result.error : "No tienes permisos para eliminar este proyecto";
        return NextResponse.json(
            { error: errorMessage },
            { status: 403 } // Forbidden/Unauthorized
        );
    }

    return NextResponse.json({ message: "Proyecto eliminado" });
}
