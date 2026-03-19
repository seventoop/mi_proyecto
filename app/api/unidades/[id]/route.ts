import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, handleApiGuardError } from "@/lib/guards";

// GET /api/unidades/[id]
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        const unidad = await prisma.unidad.findUnique({
            where: { id: params.id },
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: {
                                proyecto: {
                                    select: { id: true, nombre: true, orgId: true },
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
            return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
        }

        // Fail-secure tenant check: non-privileged users can only see units in their org.
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const orgId = unidad.manzana?.etapa?.proyecto?.orgId ?? null;
            if (!user.orgId || !orgId || orgId !== user.orgId) {
                return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
            }
        }

        return NextResponse.json(unidad);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// PUT /api/unidades/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"]);

        // Resolve org before mutating — fail-secure tenant boundary.
        const existing = await prisma.unidad.findUnique({
            where: { id: params.id },
            select: {
                manzana: {
                    select: {
                        etapa: {
                            select: {
                                proyecto: { select: { orgId: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
        }

        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const orgId = existing.manzana?.etapa?.proyecto?.orgId ?? null;
            if (!user.orgId || !orgId || orgId !== user.orgId) {
                return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
            }
        }

        const body = await request.json();

        // TAREA 2: Cross-tenant check for manzanaId
        // This ensures the user cannot "smuggle" the unit to a different organization
        if (body.manzanaId) {
            const targetManzana = await prisma.manzana.findUnique({
                where: { id: body.manzanaId },
                select: {
                    etapa: {
                        select: {
                            proyecto: { select: { orgId: true } },
                        },
                    },
                },
            });

            if (!targetManzana) {
                return NextResponse.json({ error: "Manzana no encontrada" }, { status: 404 });
            }

            if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
                const targetOrgId = targetManzana.etapa?.proyecto?.orgId ?? null;
                if (!user.orgId || !targetOrgId || targetOrgId !== user.orgId) {
                    return NextResponse.json({ error: "Manzana no pertenece a tu organización" }, { status: 404 });
                }
            }
        }
        
        // TAREA 7: Cross-tenant check for responsableId
        if (body.responsableId) {
            const targetUser = await prisma.user.findUnique({
                where: { id: body.responsableId },
                select: { orgId: true },
            });

            if (!targetUser) {
                return NextResponse.json({ error: "Responsable no encontrado" }, { status: 404 });
            }

            if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
                if (!user.orgId || !targetUser.orgId || targetUser.orgId !== user.orgId) {
                    return NextResponse.json({ error: "Responsable no encontrado" }, { status: 404 });
                }
            }
        }

        // If estado changed, write audit history using the authenticated user's id.
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
                numero: body.numero,
                tipo: body.tipo,
                manzanaId: body.manzanaId,
                superficie: body.superficie != null ? parseFloat(body.superficie) : undefined,
                frente: body.frente != null ? parseFloat(body.frente) : undefined,
                fondo: body.fondo != null ? parseFloat(body.fondo) : undefined,
                esEsquina: body.esEsquina,
                orientacion: body.orientacion,
                precio: body.precio != null ? parseFloat(body.precio) : undefined,
                moneda: body.moneda,
                financiacion: body.financiacion,
                estado: body.estado,
                coordenadasMasterplan: body.coordenadasMasterplan,
                imagenes: body.imagenes,
                tour360Url: body.tour360Url,
                responsableId: body.responsableId,
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
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);

        const existing = await prisma.unidad.findUnique({
            where: { id: params.id },
            select: {
                manzana: {
                    select: {
                        etapa: {
                            select: {
                                proyecto: { select: { orgId: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
        }

        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            const orgId = existing.manzana?.etapa?.proyecto?.orgId ?? null;
            if (!user.orgId || !orgId || orgId !== user.orgId) {
                return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
            }
        }

        await prisma.unidad.delete({ where: { id: params.id } });
        return NextResponse.json({ message: "Unidad eliminada" });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
