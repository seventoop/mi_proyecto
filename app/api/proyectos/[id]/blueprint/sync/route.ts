import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

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
        const { units: mappedUnits, svgContent } = body;

        // Fetch project to get overlay bounds for georeferencing
        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { overlayBounds: true }
        });

        const bounds = project?.overlayBounds ? JSON.parse(project.overlayBounds) : null;

        // 1. Update project masterplan SVG
        await prisma.proyecto.update({
            where: { id: params.id },
            data: { masterplanSVG: svgContent }
        });

        // 2. Update each unit
        await prisma.$transaction(
            mappedUnits.map((u: any) => {
                let geoJSON = null;

                // If we have bounds, project the center to LatLng for the map
                if (bounds && u.center) {
                    const [sw, ne] = bounds;
                    const latDiff = ne[0] - sw[0];
                    const lngDiff = ne[1] - sw[1];

                    // Simplified projection (assuming 1000px scale from SVG for now)
                    // In a production app, we'd use the SVG viewBox dimensions
                    const lat = sw[0] + (u.center.y / 1000) * latDiff;
                    const lng = sw[1] + (u.center.x / 1000) * lngDiff;
                    geoJSON = JSON.stringify([[lat, lng], [lat + 0.0001, lng], [lat + 0.0001, lng + 0.0001], [lat, lng + 0.0001]]);
                }

                return prisma.unidad.update({
                    where: { id: u.id },
                    data: {
                        coordenadasMasterplan: JSON.stringify({ path: u.pathData, center: u.center }),
                        // We store the projected coordinates in the 'geoJSON' field (or 'path' if map uses it)
                        // For this app, 'path' seems to be the field used by MasterplanMap for Leaflet
                        geoJSON: geoJSON
                    }
                });
            })
        );

        return NextResponse.json({ success: true, message: "Sincronización completada con éxito" });

    } catch (error) {
        console.error("Error syncing blueprint:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
