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

// PUT /api/proyectos/[id] — actualizar
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);

        const body = await request.json();
        
        // 🛡️ STRICT VALIDATION
        const validation = proyectoUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        const data = validation.data;

        // For LogicToop: Check if we are publishing a draft
        const oldProyecto = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { visibilityStatus: true, orgId: true }
        });

        const proyecto = await prisma.proyecto.update({
            where: { id: params.id },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                ubicacion: data.ubicacion,
                estado: data.estado,
                tipo: data.tipo,
                imagenPortada: data.imagenPortada,
                // @ts-ignore - Handle JSON stringification for legacy array fields
                galeria: data.galeria ? JSON.stringify(data.galeria) : undefined,
                // @ts-ignore - Handle JSON stringification for legacy array fields
                documentos: data.documentos ? JSON.stringify(data.documentos) : undefined,
            },
        });

        // Trigger LogicToop if transitioned to PUBLICADO
        if (body.visibilityStatus === "PUBLICADO" && oldProyecto?.visibilityStatus !== "PUBLICADO" && oldProyecto?.orgId) {
            const { dispatchTrigger } = await import("@/lib/logictoop/dispatcher");
            dispatchTrigger("PROJECT_PUBLISHED", { proyectoId: proyecto.id, nombre: proyecto.nombre }, oldProyecto.orgId).catch(console.error);
        }

        return NextResponse.json(proyecto);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// DELETE /api/proyectos/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        // Re-use server action logic for consistency and security
        const { deleteProyecto } = await import("@/lib/actions/proyectos");
        const result = await deleteProyecto(params.id);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 403 } // Forbidden/Unauthorized
            );
        }

        return NextResponse.json({ message: "Proyecto eliminado" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
