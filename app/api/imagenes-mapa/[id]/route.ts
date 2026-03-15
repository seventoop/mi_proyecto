import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// PUT /api/imagenes-mapa/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session?.user || !["ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
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
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session?.user || !["ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.imagenMapa.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /imagenes-mapa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
