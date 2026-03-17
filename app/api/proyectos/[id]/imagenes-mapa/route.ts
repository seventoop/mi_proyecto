import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/proyectos/[id]/imagenes-mapa
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const items = await prisma.imagenMapa.findMany({
      where: { proyectoId: params.id },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: { unidad: { select: { id: true, numero: true } } },
    });

    return NextResponse.json({ items });
  } catch (error) {
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
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session?.user || !["ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

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
    console.error("[POST /imagenes-mapa]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
