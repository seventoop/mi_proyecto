import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import prisma from "@/lib/db";

// PUT /api/imagenes-mapa/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const existing = await prisma.imagenMapa.findUnique({
      where: { id: params.id },
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
    const { titulo, tipo, lat, lng, unidadId, orden, altitudM, imageHeading } = body;

    const updateData: any = {};
    if (titulo !== undefined) updateData.titulo = titulo || null;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (unidadId !== undefined) updateData.unidadId = unidadId || null;
    if (orden !== undefined) updateData.orden = orden;
    if (altitudM !== undefined) updateData.altitudM = altitudM != null ? Number(altitudM) : null;
    if (imageHeading !== undefined) updateData.imageHeading = imageHeading != null ? Number(imageHeading) : null;

    const item = await prisma.imagenMapa.update({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const existing = await prisma.imagenMapa.findUnique({
      where: { id: params.id },
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

    await prisma.imagenMapa.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiGuardError(error);
  }
}
