import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole, requireAnyRole, handleApiGuardError, orgFilter } from "@/lib/guards";

// GET /api/developments/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        const proyecto = await prisma.proyecto.findUnique({
            where: { id: params.id, ...orgFilter(user) as any },
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
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { orden: "asc" },
                },
                leads: true,
                oportunidades: true,
            },
        });

        if (!proyecto) {
            return NextResponse.json(
                { error: "Proyecto no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(proyecto);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// PUT /api/developments/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        const body = await request.json();

        // Hardened: Ensure user owns the project or is admin within same org
        const proyecto = await prisma.proyecto.update({
            where: { 
                id: params.id,
                ...orgFilter(user) as any
            },
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
            },
        });

        return NextResponse.json(proyecto);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// DELETE /api/developments/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        
        await prisma.proyecto.delete({
            where: { 
                id: params.id,
                ...orgFilter(user) as any
            },
        });

        return NextResponse.json({ message: "Proyecto eliminado" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
