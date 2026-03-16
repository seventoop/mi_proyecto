import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwnership, requireAnyRole, AuthError } from "@/lib/guards";
import prisma from "@/lib/db";

// GET /api/infraestructura/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.infraestructura.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await requireProjectOwnership(item.proyectoId);
    return NextResponse.json({
      item: {
        ...item,
        coordenadas: JSON.parse(item.coordenadas || "[]"),
        fotos: item.fotos ? JSON.parse(item.fotos) : [],
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[GET /infraestructura/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/infraestructura/[id] — full update
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(["ADMIN", "VENDEDOR", "DESARROLLADOR"]);
    
    const existing = await prisma.infraestructura.findUnique({ where: { id: params.id }, select: { proyectoId: true } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireProjectOwnership(existing.proyectoId);

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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    await requireAnyRole(["ADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const existing = await prisma.infraestructura.findUnique({ where: { id: params.id }, select: { proyectoId: true } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireProjectOwnership(existing.proyectoId);

    await prisma.infraestructura.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[DELETE /infraestructura]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
