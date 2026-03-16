import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwnership, requireAnyRole, AuthError } from "@/lib/guards";
import prisma from "@/lib/db";

// GET /api/proyectos/[id]/imagenes-mapa
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireProjectOwnership(params.id);
    const items = await prisma.imagenMapa.findMany({
      where: { proyectoId: params.id },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: { unidad: { select: { id: true, numero: true } } },
    });

    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[GET /imagenes-mapa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/proyectos/[id]/imagenes-mapa
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(["ADMIN", "VENDEDOR", "DESARROLLADOR"]);
    await requireProjectOwnership(params.id);

    const body = await req.json();
    const { url, tipo = "foto", titulo, lat, lng, unidadId, orden = 0, altitudM, imageHeading } = body;

    if (!url || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const item = await prisma.imagenMapa.create({
      data: {
        proyectoId: params.id,
        url,
        tipo,
        titulo: titulo || null,
        lat,
        lng,
        unidadId: unidadId || null,
        orden,
        altitudM: altitudM != null ? Number(altitudM) : 500,
        imageHeading: imageHeading != null ? Number(imageHeading) : 0,
      },
      include: { unidad: { select: { id: true, numero: true } } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /imagenes-mapa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
