import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError } from "@/lib/guards";
import { overlayUpdateSchema } from "@/lib/validations";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: {
                overlayUrl: true,
                overlayBounds: true,
                overlayRotation: true,
                mapCenterLat: true,
                mapCenterLng: true,
                mapZoom: true,
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Parse JSON bounds if they exist
        let bounds = null;
        if (project.overlayBounds) {
            try {
                bounds = JSON.parse(project.overlayBounds);
            } catch (e) {
                console.error("Error parsing overlay bounds", e);
            }
        }

        return NextResponse.json({
            config: {
                imageUrl: project.overlayUrl,
                bounds: bounds,
                rotation: project.overlayRotation || 0,
                opacity: 0.8, // Default opacity for editor
                mapCenter: {
                    lat: project.mapCenterLat,
                    lng: project.mapCenterLng,
                    zoom: project.mapZoom,
                }
            }
        });

    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        
        // 🛡️ STRICT VALIDATION
        const validation = overlayUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        const { imageUrl, bounds, rotation, mapCenter } = validation.data;

        // Update project with new overlay config
        const updatedProject = await prisma.proyecto.update({
            where: { id: params.id },
            data: {
                overlayUrl: imageUrl,
                overlayBounds: bounds ? JSON.stringify(bounds) : null,
                overlayRotation: rotation,
                // Optional: update map center/zoom if provided
                ...(mapCenter && {
                    mapCenterLat: mapCenter.lat,
                    mapCenterLng: mapCenter.lng,
                    mapZoom: mapCenter.zoom
                })
            }
        });

        return NextResponse.json({ success: true, project: updatedProject });

    } catch (error) {
        return handleApiGuardError(error);
    }
}
