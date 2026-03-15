import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError, requireProjectOwnership } from "@/lib/guards";
import { blueprintSyncSchema } from "@/lib/validations";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        await requireProjectOwnership(params.id);
        
        if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const validation = blueprintSyncSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Datos inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        const { units: mappedUnits, svgContent } = validation.data;

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
                    const lat = sw[0] + (u.center.y / 1000) * latDiff;
                    const lng = sw[1] + (u.center.x / 1000) * lngDiff;
                    geoJSON = JSON.stringify([[lat, lng], [lat + 0.0001, lng], [lat + 0.0001, lng + 0.0001], [lat, lng + 0.0001]]);
                }

                return prisma.unidad.update({
                    where: { id: u.id },
                    data: {
                        coordenadasMasterplan: JSON.stringify({ path: u.pathData, center: u.center }),
                        geoJSON: geoJSON
                    }
                });
            })
        );

        return NextResponse.json({ success: true, message: "Sincronización completada con éxito" });

    } catch (error) {
        return handleApiGuardError(error);
    }
}
