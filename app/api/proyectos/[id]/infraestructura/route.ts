import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, handleApiGuardError } from "@/lib/guards";

// GET /api/proyectos/[id]/infraestructura — list all for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: params.id },
        select: { orgId: true },
      });
      if (!proyecto) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }
      // Fail-secure: deny if either side has no orgId, or if they differ.
      // Returns 404 (not 403) to avoid leaking existence of other tenants' data.
      if (!user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }
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
    return handleApiGuardError(error);
  }
}

// POST /api/proyectos/[id]/infraestructura — create one
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAnyRole(["ADMIN", "VENDEDOR", "DESARROLLADOR"]);

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: params.id },
        select: { orgId: true },
      });
      if (!proyecto) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }
      if (!user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }
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
    return handleApiGuardError(error);
  }
}
