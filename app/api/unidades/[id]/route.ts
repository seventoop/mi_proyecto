import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole, requireAnyRole, handleApiGuardError, orgFilter } from "@/lib/guards";
import { idSchema, unidadUpdateSchema } from "@/lib/validations";

// GET /api/unidades/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        const unidad = await prisma.unidad.findUnique({
            where: { id: params.id, ...orgFilter(user) as any },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: {
                                proyecto: {
                                    select: { id: true, nombre: true },
                                },
                            },
                        },
                    },
                },
                responsable: {
                    select: { id: true, nombre: true, email: true },
                },
                historial: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        usuario: { select: { id: true, nombre: true } },
                    },
                },
                reservas: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
            },
        });

        if (!unidad) {
            return NextResponse.json(
                { error: "Unidad no encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(unidad);
    } catch (error) {
        return NextResponse.json(
            { error: "Error al obtener unidad" },
            { status: 500 }
        );
    }
}

// PUT /api/unidades/[id]
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAnyRole(["ADMIN", "DEVELOPER", "DESARROLLADOR"]);
        const body = await request.json();

        // 🛡️ STRICT VALIDATION
        const idValidation = idSchema.safeParse(params.id);
        const bodyValidation = unidadUpdateSchema.safeParse(body);

        if (!idValidation.success || !bodyValidation.success) {
            return NextResponse.json({ 
                error: "Datos inválidos", 
                details: bodyValidation.success ? null : bodyValidation.error.flatten() 
            }, { status: 400 });
        }
        const data = bodyValidation.data;

        // 🛡️ SECURITY: Fetch unit with project relation for tenant check
        const unitToUpdate = await prisma.unidad.findUnique({
            where: { id: params.id },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: { proyecto: { select: { orgId: true, creadoPorId: true } } }
                        }
                    }
                }
            }
        });

        if (!unitToUpdate) {
            return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
        }

        const project = unitToUpdate.manzana.etapa.proyecto;

        // Verify ownership/tenant
        if (user.role !== "ADMIN" && project.orgId !== user.orgId && project.creadoPorId !== user.id) {
            return NextResponse.json({ error: "Acceso denegado: Empresa/Proyecto no coincide" }, { status: 403 });
        }

        // If estado changed, create history entry
        if (body.estado && body.previousEstado && body.estado !== body.previousEstado) {
            await prisma.historialUnidad.create({
                data: {
                    unidadId: params.id,
                    usuarioId: user.id,
                    estadoAnterior: body.previousEstado,
                    estadoNuevo: body.estado,
                    motivo: body.motivo || null,
                },
            });
        }

        const unidad = await prisma.unidad.update({
            where: { id: params.id },
            data: {
                numero: data.numero,
                tipo: data.tipo,
                manzanaId: data.manzanaId,
                superficie: data.superficie,
                esEsquina: data.esEsquina,
                orientacion: data.orientacion,
                precio: data.precio,
                moneda: data.moneda,
                financiacion: data.financiacion,
                estado: data.estado,
                coordenadasMasterplan: data.coordenadasMasterplan,
                tour360Url: data.tour360Url,
                responsableId: data.responsableId,
            },
            include: {
                manzana: {
                    include: {
                        etapa: { select: { id: true, nombre: true } },
                    },
                },
                responsable: {
                    select: { id: true, nombre: true },
                },
            },
        });

        return NextResponse.json(unidad);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// DELETE /api/unidades/[id]
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("ADMIN");
        await prisma.unidad.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Unidad eliminada" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
