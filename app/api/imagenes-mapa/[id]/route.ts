import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import prisma from "@/lib/db";

// PUT /api/imagenes-mapa/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const existing = await prisma.imagenMapa.findUnique({
      where: { id: id },
      select: { proyectoId: true },
    });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: existing.proyectoId },
        select: { orgId: true },
      });
      if (!proyecto || !user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
    }

    const body = await req.json();
    const { titulo, tipo, lat, lng, unidadId, orden, altitudM, imageHeading, latOffset, lngOffset, planRotation, planScale } = body;

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
    if (planScale !== undefined) updateData.planScale = planScale != null ? Math.max(0.05, Number(planScale)) : 1;

    const item = await prisma.imagenMapa.update({
      where: { id: id },
      data: updateData,
      include: { unidad: { select: { id: true, numero: true } } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiGuardError(error);
  }
}

// DELETE /api/imagenes-mapa/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const existing = await prisma.imagenMapa.findUnique({
      where: { id: id },
      select: { proyectoId: true },
    });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: existing.proyectoId },
        select: { orgId: true },
      });
      if (!proyecto || !user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
    }

    await prisma.imagenMapa.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiGuardError(error);
  }
}
