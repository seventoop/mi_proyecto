import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, handleApiGuardError } from "@/lib/guards";

type LatLngTuple = [number, number];
type QuadCorners = [LatLngTuple, LatLngTuple, LatLngTuple, LatLngTuple];

function parseOverlayBounds(raw: string | null): {
    bounds: [LatLngTuple, LatLngTuple] | null;
    corners: QuadCorners | null;
} {
    if (!raw) {
        return { bounds: null, corners: null };
    }

    try {
        const parsed = JSON.parse(raw);

        if (
            Array.isArray(parsed) &&
            parsed.length === 2 &&
            Array.isArray(parsed[0]) &&
            Array.isArray(parsed[1])
        ) {
            return { bounds: parsed as [LatLngTuple, LatLngTuple], corners: null };
        }

        if (parsed && typeof parsed === "object") {
            const bounds = Array.isArray(parsed.bounds) ? parsed.bounds as [LatLngTuple, LatLngTuple] : null;
            const corners = Array.isArray(parsed.corners) ? parsed.corners as QuadCorners : null;
            return { bounds, corners };
        }
    } catch (e) {
        console.error("Error parsing overlay bounds", e);
    }

    return { bounds: null, corners: null };
}

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

        const { bounds, corners } = parseOverlayBounds(project.overlayBounds);

        return NextResponse.json({
            config: {
                imageUrl: project.overlayUrl,
                bounds: bounds,
                corners,
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
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        // Resolve project for tenant check
        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { orgId: true },
        });

        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
        }

        // Tenant boundary check (even for ADMINs if they are organization-scoped in the future)
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            if (!user.orgId || !project.orgId || project.orgId !== user.orgId) {
                return NextResponse.json({ error: "No autorizado" }, { status: 403 });
            }
        }

        const body = await request.json();
        const { imageUrl, bounds, corners, rotation, mapCenter } = body;

        // Update project with new overlay config
        const updatedProject = await prisma.proyecto.update({
            where: { id: params.id },
            data: {
                overlayUrl: imageUrl,
                overlayBounds: bounds
                    ? JSON.stringify(corners ? { bounds, corners } : bounds)
                    : null,
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
