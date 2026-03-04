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
    if (!session?.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updatePipelineSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
    }

    const { oportunidadId, nuevaEtapa } = validation.data;

    // ✅ Ownership check before updating
    const existingOp = await db.oportunidad.findUnique({
      where: { id: oportunidadId },
      include: { lead: { select: { asignadoAId: true } } },
    });

    if (!existingOp) {
      return NextResponse.json({ message: "Oportunidad no encontrada" }, { status: 404 });
    }

    // Non-admins can only update opportunities whose lead is assigned to them
    const role = (session.user as any).role || (session.user as any).rol;
    if (role !== "ADMIN" && existingOp.lead?.asignadoAId !== session.user.id) {
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    }

    // Update opportunity stage
    const oportunidad = await db.oportunidad.update({
      where: { id: oportunidadId },
      data: { etapa: nuevaEtapa },
    });

    // TODO: sync lead status based on etapa, if desired
    // Keeping behavior unchanged for now (no breaking changes)

    return NextResponse.json(oportunidad);
  } catch (error) {
    console.error("Error updating pipeline:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}