import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireRole, requireAnyRole, handleApiGuardError, orgFilter } from "@/lib/guards";

// GET /api/developments — listar todos los proyectos
export async function GET() {
    try {
        const user = await requireAuth();
        const proyectos = await prisma.proyecto.findMany({
            where: {
                ...orgFilter(user) as any,
                visibilityStatus: "PUBLICADO",
                estado: { not: "SUSPENDIDO" },
                deletedAt: null,
                OR: [
                    { isDemo: false },
                    {
                        isDemo: true,
                        demoExpiresAt: { gt: new Date() }
                    }
                ]
            },
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        leads: true,
                        oportunidades: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(proyectos);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

// POST /api/developments — crear nuevo proyecto
export async function POST(request: Request) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);
        const body = await request.json();

        const proyecto = await prisma.proyecto.create({
            data: {
                nombre: body.nombre,
                descripcion: body.descripcion,
                ubicacion: body.ubicacion,
                estado: body.estado || "PLANIFICACION",
                tipo: body.tipo || "URBANIZACION",
                imagenPortada: body.imagenPortada,
                galeria: body.galeria || [],
                documentos: body.documentos || [],
                masterplanSVG: body.masterplanSVG,
                creadoPorId: user.id,
                orgId: user.orgId || null,
            },
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "PROJECT_CREATE",
                entity: "Proyecto",
                entityId: proyecto.id,
                details: JSON.stringify({ nombre: proyecto.nombre, type: "DEVELOPMENT" })
            }
        });

        return NextResponse.json(proyecto, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
