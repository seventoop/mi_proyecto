import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
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
        console.error("Error fetching overlay config:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
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
        console.error("Error saving overlay config:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
