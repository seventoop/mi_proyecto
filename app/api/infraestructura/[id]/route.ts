import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/infraestructura/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const item = await prisma.infraestructura.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({
      item: {
        ...item,
        coordenadas: JSON.parse(item.coordenadas || "[]"),
        fotos: item.fotos ? JSON.parse(item.fotos) : [],
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/infraestructura/[id] — full update
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
    const {
      nombre,
      categoria,
      tipo,
      geometriaTipo,
      coordenadas,
      estado,
      descripcion,
      superficie,
      longitudM,
      fechaEstimadaFin,
      porcentajeAvance,
      fotos,
      colorPersonalizado,
      orden,
      visible,
    } = body;

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (geometriaTipo !== undefined) updateData.geometriaTipo = geometriaTipo;
    if (coordenadas !== undefined) updateData.coordenadas = JSON.stringify(coordenadas);
    if (estado !== undefined) updateData.estado = estado;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (superficie !== undefined) updateData.superficie = superficie;
    if (longitudM !== undefined) updateData.longitudM = longitudM;
    if (fechaEstimadaFin !== undefined)
      updateData.fechaEstimadaFin = fechaEstimadaFin ? new Date(fechaEstimadaFin) : null;
    if (porcentajeAvance !== undefined) updateData.porcentajeAvance = porcentajeAvance;
    if (fotos !== undefined) updateData.fotos = fotos ? JSON.stringify(fotos) : null;
    if (colorPersonalizado !== undefined) updateData.colorPersonalizado = colorPersonalizado;
    if (orden !== undefined) updateData.orden = orden;
    if (visible !== undefined) updateData.visible = visible;

    const item = await prisma.infraestructura.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      item: {
        ...item,
        coordenadas: JSON.parse(item.coordenadas || "[]"),
        fotos: item.fotos ? JSON.parse(item.fotos) : [],
      },
    });
  } catch (error) {
    console.error("[PUT /infraestructura]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/infraestructura/[id]
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
    await prisma.infraestructura.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
