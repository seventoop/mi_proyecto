import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updateTourSchema = z.object({
    nombre: z.string().min(3).optional(),
    escenas: z.array(z.any()).optional(), // Loose typing for updates to allow flexible scene structure
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const tour = await db.tour360.findUnique({
            where: { id: params.id },
        });

        if (!tour) {
            return NextResponse.json({ message: "Tour no encontrado" }, { status: 404 });
        }

        return NextResponse.json(tour);
    } catch (error) {
        console.error("Error fetching tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const validation = updateTourSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        const { nombre, escenas } = validation.data;

        const tour = await db.tour360.update({
            where: { id: params.id },
            data: {
                nombre,
                escenas: JSON.stringify(escenas),
            },
        });

        return NextResponse.json(tour);
    } catch (error) {
        console.error("Error updating tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        await db.tour360.delete({
            where: { id: params.id },
        });

        return NextResponse.json({}, { status: 204 });
    } catch (error) {
        console.error("Error deleting tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}
