import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/proyectos — listar con stats agregadas
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const estado = searchParams.get("estado");
        const tipo = searchParams.get("tipo");

        const where: any = {
            visibilityStatus: "PUBLICADO",
            estado: { not: "SUSPENDIDO" },
            OR: [
                { isDemo: false },
                {
                    isDemo: true,
                    demoExpiresAt: { gt: new Date() }
                }
            ]
        };
        if (estado) where.estado = estado;
        if (tipo) where.tipo = tipo;

        const proyectos = await prisma.proyecto.findMany({
            where,
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: {
                                    select: {
                                        id: true,
                                        estado: true,
                                        precio: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { orden: "asc" },
                },
                _count: {
                    select: { leads: true, oportunidades: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Compute unit stats for each proyecto
        const result = proyectos.map((p) => {
            const allUnidades = p.etapas.flatMap((e) =>
                e.manzanas.flatMap((m) => m.unidades)
            );
            const total = allUnidades.length;
            const disponibles = allUnidades.filter(
                (u) => u.estado === "DISPONIBLE"
            ).length;
            const reservadas = allUnidades.filter(
                (u) => u.estado === "RESERVADO"
            ).length;
            const vendidas = allUnidades.filter(
                (u) => u.estado === "VENDIDO"
            ).length;
            const bloqueadas = allUnidades.filter(
                (u) => u.estado === "BLOQUEADO"
            ).length;
            const valorTotal = allUnidades.reduce(
                (sum, u) => sum + (u.precio || 0),
                0
            );

            return {
                id: p.id,
                nombre: p.nombre,
                descripcion: p.descripcion,
                ubicacion: p.ubicacion,
                estado: p.estado,
                tipo: p.tipo,
                imagenPortada: p.imagenPortada,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                etapasCount: p.etapas.length,
                leadsCount: p._count.leads,
                oportunidadesCount: p._count.oportunidades,
                unidades: { total, disponibles, reservadas, vendidas, bloqueadas },
                valorTotal,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching proyectos:", error);
        return NextResponse.json(
            { error: "Error al obtener proyectos" },
            { status: 500 }
        );
    }
}

// POST /api/proyectos — crear proyecto
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const proyecto = await prisma.proyecto.create({
            data: {
                nombre: body.nombre,
                descripcion: body.descripcion || null,
                ubicacion: body.ubicacion || null,
                estado: body.estado || "PLANIFICACION",
                tipo: body.tipo || "URBANIZACION",
                imagenPortada: body.imagenPortada || null,
                galeria: body.galeria || [],
                documentos: body.documentos || [],
                masterplanSVG: body.masterplanSVG || null,
                // masterplanConfig: body.masterplanConfig || null,
            },
        });

        return NextResponse.json(proyecto, { status: 201 });
    } catch (error) {
        console.error("Error creating proyecto:", error);
        return NextResponse.json(
            { error: "Error al crear proyecto" },
            { status: 500 }
        );
    }
}
