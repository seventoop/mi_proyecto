import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, requireProjectOwnership, AuthError } from "@/lib/guards";
import { toStoredTourSceneCategory } from "@/lib/tour-media";

const createTourSchema = z.object({
    proyectoId: z.string(),
    unidadId: z.string().optional().nullable(),
    nombre: z.string().min(3),
    scenes: z.array(z.object({
        id: z.string(),
        title: z.string(),
        imageUrl: z.string(),
        category: z.string().optional(),
        isDefault: z.boolean().optional(),
        hotspots: z.array(z.any()).optional().default([]),
    })).optional(),
    escenas: z.array(z.object({
        id: z.string(),
        title: z.string(),
        imageUrl: z.string(),
        category: z.string().optional(),
        isDefault: z.boolean().optional(),
        hotspots: z.array(z.any()).optional().default([]),
    })).optional().default([]),
});

export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const proyectoId = searchParams.get("proyectoId");
        const unidadId = searchParams.get("unidadId");

        const where: any = {};
        
        // Security: If specific project is requested, check ownership
        if (proyectoId) {
            await requireProjectOwnership(proyectoId);
            where.proyectoId = proyectoId;
        } else {
            // If listing all, filter by user's organization unless ADMIN/SUPERADMIN
            const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
            if (!isAdmin) {
                where.proyecto = { orgId: user.orgId ?? "___NO_ORG___" };
            }
        }

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
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error fetching tours:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = createTourSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten() }, { status: 400 });
        }

        const { proyectoId, unidadId, nombre } = validation.data;
        const scenes = validation.data.scenes ?? validation.data.escenas ?? [];

        // Security: Require project ownership
        await requireProjectOwnership(proyectoId);

        const tour = await db.tour360.create({
            data: {
                proyectoId,
                unidadId: unidadId || null,
                nombre,
                estado: "PENDIENTE",
                scenes: {
                    create: scenes.map((s: any) => ({
                        title: s.title,
                        imageUrl: s.imageUrl,
                        category: toStoredTourSceneCategory(s.category),
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
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Error creating tour:", error);
        return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
}
