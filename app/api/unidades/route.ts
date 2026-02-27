import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/unidades — listar con filtros
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const proyectoId = searchParams.get("proyectoId");
        const etapaId = searchParams.get("etapaId");
        const manzanaId = searchParams.get("manzanaId");
        const estado = searchParams.get("estado");
        const tipo = searchParams.get("tipo");
        const precioMin = searchParams.get("precioMin");
        const precioMax = searchParams.get("precioMax");
        const superficieMin = searchParams.get("superficieMin");
        const superficieMax = searchParams.get("superficieMax");

        const where: any = {};

        if (manzanaId) {
            where.manzanaId = manzanaId;
        } else if (etapaId) {
            where.manzana = { etapaId };
        } else if (proyectoId) {
            where.manzana = { etapa: { proyectoId } };
        }

        if (estado) where.estado = estado;
        if (tipo) where.tipo = tipo;
        if (precioMin || precioMax) {
            where.precio = {};
            if (precioMin) where.precio.gte = parseFloat(precioMin);
            if (precioMax) where.precio.lte = parseFloat(precioMax);
        }
        if (superficieMin || superficieMax) {
            where.superficie = {};
            if (superficieMin) where.superficie.gte = parseFloat(superficieMin);
            if (superficieMax) where.superficie.lte = parseFloat(superficieMax);
        }

        const unidades = await prisma.unidad.findMany({
            where,
            include: {
                manzana: {
                    include: {
                        etapa: {
                            select: { id: true, nombre: true, proyectoId: true },
                        },
                    },
                },
                responsable: {
                    select: { id: true, nombre: true, email: true },
                },
            },
            orderBy: [{ manzana: { etapa: { orden: "asc" } } }, { numero: "asc" }],
        });

        return NextResponse.json(unidades);
    } catch (error) {
        console.error("Error fetching unidades:", error);
        return NextResponse.json(
            { error: "Error al obtener unidades" },
            { status: 500 }
        );
    }
}

// POST /api/unidades — crear unidad
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const unidad = await prisma.unidad.create({
            data: {
                manzanaId: body.manzanaId,
                numero: body.numero,
                tipo: body.tipo || "LOTE",
                superficie: body.superficie ? parseFloat(body.superficie) : null,
                frente: body.frente ? parseFloat(body.frente) : null,
                fondo: body.fondo ? parseFloat(body.fondo) : null,
                esEsquina: body.esEsquina || false,
                orientacion: body.orientacion || null,
                precio: body.precio ? parseFloat(body.precio) : null,
                moneda: body.moneda || "USD",
                financiacion: body.financiacion || null,
                estado: body.estado || "DISPONIBLE",
                coordenadasMasterplan: body.coordenadasMasterplan || null,
                imagenes: body.imagenes || [],
                tour360Url: body.tour360Url || null,
                responsableId: body.responsableId || null,
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

        return NextResponse.json(unidad, { status: 201 });
    } catch (error) {
        console.error("Error creating unidad:", error);
        return NextResponse.json(
            { error: "Error al crear unidad" },
            { status: 500 }
        );
    }
}
