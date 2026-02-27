import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const updatePipelineSchema = z.object({
    oportunidadId: z.string(),
    nuevaEtapa: z.enum([
        "NUEVO",
        "CONTACTADO",
        "CALIFICADO",
        "VISITA",
        "NEGOCIACION",
        "RESERVA",
        "VENTA",
        "PERDIDO",
    ]),
});

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const validation = updatePipelineSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { errors: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { oportunidadId, nuevaEtapa } = validation.data;

        // Update opportunity stage
        const oportunidad = await db.oportunidad.update({
            where: { id: oportunidadId },
            data: {
                etapa: nuevaEtapa,
            },
        });

        // Determine if we need to update the Lead status based on Opportunity stage
        if (["CONTACTADO", "VISITA", "NEGOCIACION"].includes(nuevaEtapa)) {
            // Find associated lead to check current status
            const currentOp = await db.oportunidad.findUnique({
                where: { id: oportunidadId },
                include: { lead: true }
            });

            if (currentOp && currentOp.lead) {
                // Logic to sync lead status could go here
                // e.g. If Op is 'CONTACTADO', Lead should be 'CONTACTADO' or 'CALIFICADO'
            }
        }


        return NextResponse.json(oportunidad);
    } catch (error) {
        console.error("Error updating pipeline:", error);
        return NextResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
