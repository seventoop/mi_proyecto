import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwnership, requireAnyRole, AuthError } from "@/lib/guards";
import prisma from "@/lib/db";

// PUT /api/imagenes-mapa/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(["ADMIN", "VENDEDOR", "DESARROLLADOR"]);
    
    const existing = await prisma.imagenMapa.findUnique({ where: { id: params.id }, select: { proyectoId: true } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireProjectOwnership(existing.proyectoId);

    const body = await req.json();
    const { titulo, tipo, lat, lng, unidadId, orden, altitudM, imageHeading, latOffset, lngOffset, planRotation } = body;

    const updateData: any = {};
    if (titulo !== undefined) updateData.titulo = titulo || null;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (unidadId !== undefined) updateData.unidadId = unidadId || null;
    if (orden !== undefined) updateData.orden = orden;
    if (altitudM !== undefined) updateData.altitudM = altitudM != null ? Number(altitudM) : null;
    if (imageHeading !== undefined) updateData.imageHeading = imageHeading != null ? Number(imageHeading) : null;
    if (latOffset !== undefined) updateData.latOffset = latOffset != null ? Number(latOffset) : 0;
    if (lngOffset !== undefined) updateData.lngOffset = lngOffset != null ? Number(lngOffset) : 0;
    if (planRotation !== undefined) updateData.planRotation = planRotation != null ? Number(planRotation) : 0;

    const item = await prisma.imagenMapa.update({
      where: { id: params.id },
      data: updateData,
      include: { unidad: { select: { id: true, numero: true } } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[PUT /imagenes-mapa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/imagenes-mapa/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(["ADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const existing = await prisma.imagenMapa.findUnique({ where: { id: params.id }, select: { proyectoId: true } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireProjectOwnership(existing.proyectoId);

    await prisma.imagenMapa.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[DELETE /imagenes-mapa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
