import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createTourSchema = z.object({
    proyectoId: z.string(),
    unidadId: z.string().optional().nullable(),
    nombre: z.string().min(3),
    escenas: z.array(z.object({
        id: z.string(),
        title: z.string(),
        imageUrl: z.string(),
        category: z.enum(["raw", "rendered"]).optional(),
        isDefault: z.boolean().optional(),
        hotspots: z.array(z.any()).optional().default([]), // Loose typing for hotspots initially
    })).optional().default([]),
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const proyectoId = searchParams.get("proyectoId");
        const unidadId = searchParams.get("unidadId");

        const where: any = {};
        if (proyectoId) where.proyectoId = proyectoId;
        if (unidadId) where.unidadId = unidadId;

        const tours = await db.tour360.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(tours);
    } catch (error) {
        console.error("Error fetching tours:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = createTourSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        const { proyectoId, unidadId, nombre, escenas } = validation.data;

        const tour = await db.tour360.create({
            data: {
                proyectoId,
                unidadId: unidadId || null,
                nombre,
                escenas: JSON.stringify(escenas), // Prisma handles Json array automatically
            },
        });

        return NextResponse.json(tour, { status: 201 });
    } catch (error) {
        console.error("Error creating tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}
