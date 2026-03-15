import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/proyectos/[id]/infraestructura — list all for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const items = await prisma.infraestructura.findMany({
      where: { proyectoId: params.id },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    });

    const parsed = items.map((item) => ({
      ...item,
      coordenadas: JSON.parse(item.coordenadas || "[]"),
      fotos: item.fotos ? JSON.parse(item.fotos) : [],
    }));

    return NextResponse.json({ items: parsed });
  } catch (error) {
    console.error("[GET /infraestructura]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/proyectos/[id]/infraestructura — create one
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
    const {
      nombre,
      categoria,
      tipo,
      geometriaTipo,
      coordenadas,
      estado = "planificado",
      descripcion,
      superficie,
      longitudM,
      fechaEstimadaFin,
      porcentajeAvance = 0,
      fotos,
      colorPersonalizado,
      orden = 0,
      visible = true,
    } = body;

    if (!nombre || !categoria || !tipo || !geometriaTipo || !coordenadas) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const item = await prisma.infraestructura.create({
      data: {
        proyectoId: params.id,
        nombre,
        categoria,
        tipo,
        geometriaTipo,
        coordenadas: JSON.stringify(coordenadas),
        estado,
        descripcion: descripcion || null,
        superficie: superficie || null,
        longitudM: longitudM || null,
        fechaEstimadaFin: fechaEstimadaFin ? new Date(fechaEstimadaFin) : null,
        porcentajeAvance,
        fotos: fotos ? JSON.stringify(fotos) : null,
        colorPersonalizado: colorPersonalizado || null,
        orden,
        visible,
      },
    });

    return NextResponse.json({
      item: {
        ...item,
        coordenadas: JSON.parse(item.coordenadas),
        fotos: item.fotos ? JSON.parse(item.fotos) : [],
      },
    });
  } catch (error) {
    console.error("[POST /infraestructura]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
