import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";

const createTourSchema = z.object({
    proyectoId: z.string(),
    unidadId: z.string().optional().nullable(),
    nombre: z.string().min(3),
    escenas: z.array(z.object({
        id: z.string(),
        title: z.string(),
        imageUrl: z.string(),
        category: z.enum(["raw", "rendered"]).optional(),
        isDefault: z.boolean().optional(),
        hotspots: z.array(z.any()).optional().default([]),
    })).optional().default([]),
});

export async function GET(request: Request) {
    try {
        await requireAuth();

        const { searchParams } = new URL(request.url);
        const proyectoId = searchParams.get("proyectoId");
        const unidadId = searchParams.get("unidadId");

        const where: any = {};
        if (proyectoId) where.proyectoId = proyectoId;
        if (unidadId) where.unidadId = unidadId;

        const tours = await db.tour360.findMany({
            where,
            include: {
                scenes: {
                    include: {
                        hotspots: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(tours);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = createTourSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        const { proyectoId, unidadId, nombre, escenas } = validation.data;

        // Security: Require project ownership
        await requireProjectOwnership(proyectoId);

        const tour = await db.tour360.create({
            data: {
                proyectoId,
                unidadId: unidadId || null,
                nombre,
                estado: "PENDIENTE",
                scenes: {
                    create: escenas.map((s: any) => ({
                        title: s.title,
                        imageUrl: s.imageUrl,
                        category: (s.category || 'raw').toUpperCase(),
                        isDefault: s.isDefault || false,
                        order: s.order || 0,
                        hotspots: {
                            create: (s.hotspots || []).map((h: any) => ({
                                unidadId: h.unidadId,
                                type: (h.type || 'info').toUpperCase(),
                                pitch: h.pitch,
                                yaw: h.yaw,
                                text: h.text || "",
                                targetSceneId: h.targetSceneId || null,
                            }))
                        }
                    }))
                }
            },
            include: {
                scenes: {
                    include: {
                        hotspots: true
                    }
                }
            }
        });

        return NextResponse.json(tour, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
