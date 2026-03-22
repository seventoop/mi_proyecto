import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, handleApiGuardError } from "@/lib/guards";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: {
                orgId: true,
                overlayUrl: true,
                overlayBounds: true,
                overlayRotation: true,
                mapCenterLat: true,
                mapCenterLng: true,
                mapZoom: true,
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
        }

        // Tenant boundary fail-secure: non-privileged users cannot see projects from other orgs.
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            if (!user.orgId || !project.orgId || project.orgId !== user.orgId) {
                return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
            }
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
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        // Resolve project for tenant check
        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { orgId: true },
        });

        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
        }

        // Tenant boundary: non-privileged users can only edit their own org's projects
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            if (!user.orgId || !project.orgId || project.orgId !== user.orgId) {
                return NextResponse.json({ error: "No autorizado" }, { status: 403 });
            }
        }

        const body = await request.json();
        const { imageUrl, bounds, rotation, mapCenter } = body;

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
