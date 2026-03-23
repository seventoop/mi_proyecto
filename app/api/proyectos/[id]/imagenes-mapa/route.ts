import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, handleApiGuardError } from "@/lib/guards";

// GET /api/proyectos/[id]/imagenes-mapa
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const user = await requireAuth();

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: id },
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

    const items = await prisma.imagenMapa.findMany({
      where: { proyectoId: id },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: { unidad: { select: { id: true, numero: true } } },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiGuardError(error);
  }
}

// POST /api/proyectos/[id]/imagenes-mapa
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const user = await requireAnyRole(["ADMIN", "VENDEDOR", "DESARROLLADOR"]);

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: id },
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
    const { url, tipo = "foto", titulo, lat, lng, unidadId, orden = 0, altitudM, imageHeading } = body;

    if (!url || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const item = await prisma.imagenMapa.create({
      data: {
        proyectoId: id,
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
    return handleApiGuardError(error);
  }
}
