import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";
import prisma from "@/lib/db";

const infraestructuraUpdateBodySchema = z.object({
    nombre: z.string().min(1, "Nombre requerido").max(150).optional(),
    categoria: z.string().min(1).max(100).optional(),
    tipo: z.string().min(1).max(100).optional(),
    geometriaTipo: z.string().min(1).max(50).optional(),
    coordenadas: z.array(z.unknown()).optional(),
    estado: z.string().min(1).max(50).optional(),
    descripcion: z.string().max(2000).optional().nullable(),
    superficie: z.number().nonnegative("La superficie no puede ser negativa").optional().nullable(),
    longitudM: z.number().nonnegative("La longitud no puede ser negativa").optional().nullable(),
    fechaEstimadaFin: z.string().datetime({ offset: true }).optional().nullable()
        .or(z.literal("")).transform((v) => (v === "" ? null : v)),
    porcentajeAvance: z.number().int().min(0).max(100, "El avance debe estar entre 0 y 100").optional(),
    fotos: z.array(z.string()).optional().nullable(),
    colorPersonalizado: z.string().max(20).optional().nullable(),
    orden: z.number().int().min(0).optional(),
    visible: z.boolean().optional(),
});

// GET /api/infraestructura/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const user = await requireAuth();

    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const item = await prisma.infraestructura.findUnique({ where: { id: id } });
    if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: item.proyectoId },
        select: { orgId: true },
      });
      if (!proyecto || !user.orgId || !proyecto.orgId || proyecto.orgId !== user.orgId) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
    }

    return NextResponse.json({
      item: {
        ...item,
        coordenadas: JSON.parse(item.coordenadas || "[]"),
        fotos: item.fotos ? JSON.parse(item.fotos) : [],
      },
    });
  } catch (error) {
    return handleApiGuardError(error);
  }
}

// PUT /api/infraestructura/[id] — full update
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const existing = await prisma.infraestructura.findUnique({
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
    const parsed = infraestructuraUpdateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
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
    } = parsed.data;

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
      where: { id: id },
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
    return handleApiGuardError(error);
  }
}

// DELETE /api/infraestructura/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { id } = await params;
    const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"]);

    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const existing = await prisma.infraestructura.findUnique({
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

    await prisma.infraestructura.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiGuardError(error);
  }
}
