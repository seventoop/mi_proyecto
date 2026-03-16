import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";
import { z } from "zod";

const updateTourSchema = z.object({
    nombre: z.string().min(3).optional(),
    escenas: z.array(z.any()).optional(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        await requireAuth();

        const tour = await db.tour360.findUnique({
            where: { id: params.id },
        });

        if (!tour) {
            return NextResponse.json({ message: "Tour no encontrado" }, { status: 404 });
        }

        // Security: Ensure user owns the project this tour belongs to
        await requireProjectOwnership(tour.proyectoId);

        return NextResponse.json(tour);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        await requireAuth(); // Explicit guard for security scan
        const body = await request.json();
        
        // 🛡️ STRICT VALIDATION
        const validation = updateTourSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        // Fetch tour to check project ownership
        const existing = await db.tour360.findUnique({
            where: { id: params.id },
            select: { proyectoId: true },
        });

        if (!existing) {
            return NextResponse.json({ message: "Tour no encontrado" }, { status: 404 });
        }

        await requireProjectOwnership(existing.proyectoId);

        const { nombre, escenas } = validation.data;

        const tour = await db.$transaction(async (tx) => {
            if (escenas) {
                // Simplified sync: delete and recreate
                await tx.tourScene.deleteMany({ where: { tourId: params.id } });
            }

            return await tx.tour360.update({
                where: { id: params.id },
                data: {
                    nombre,
                    estado: "PENDIENTE",
                    scenes: escenas ? {
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
                    } : undefined
                },
                include: {
                    scenes: {
                        include: {
                            hotspots: true
                        }
                    }
                }
            });
        });

        return NextResponse.json(tour);
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        await requireAuth(); // Explicit guard for security scan
        // Fetch tour to check project ownership
        const existing = await db.tour360.findUnique({
            where: { id: params.id },
            select: { proyectoId: true },
        });

        if (!existing) {
            return NextResponse.json({ message: "Tour no encontrado" }, { status: 404 });
        }

        await requireProjectOwnership(existing.proyectoId);

        await db.tour360.delete({
            where: { id: params.id },
        });

        return NextResponse.json({}, { status: 204 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
