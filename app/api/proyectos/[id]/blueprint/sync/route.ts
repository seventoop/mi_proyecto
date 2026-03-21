import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";

interface SyncPath {
    internalId?: number;
    lotNumber?: string;
    pathData: string;
    center: { x: number; y: number };
    areaSqm?: number;
    estado?: string;
    precio?: number | null;
    frente?: number | null;
    fondo?: number | null;
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);
        await requireProjectOwnership(params.id);
        const body = await request.json();
        const { paths, svgContent } = body as { paths: SyncPath[]; svgContent: string };

        if (!paths || !Array.isArray(paths)) {
            return NextResponse.json({ error: "paths array is required" }, { status: 400 });
        }

        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: {
                overlayBounds: true,
                etapas: {
                    take: 1,
                    orderBy: { orden: "asc" },
                    include: {
                        manzanas: { take: 1, orderBy: { createdAt: "asc" } },
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Proyecto no encontrado o sin acceso" }, { status: 404 });
        }

        // 2. Ensure a manzana exists to place lots into
        let manzanaId: string;
        const firstEtapa = project.etapas[0];

        if (!firstEtapa) {
            const newEtapa = await prisma.etapa.create({
                data: {
                    proyectoId: params.id,
                    nombre: "Etapa 1",
                    orden: 1,
                    estado: "PENDIENTE",
                },
            });
            const newManzana = await prisma.manzana.create({
                data: { etapaId: newEtapa.id, nombre: "Manzana A" },
            });
            manzanaId = newManzana.id;
        } else if (!firstEtapa.manzanas[0]) {
            const newManzana = await prisma.manzana.create({
                data: { etapaId: firstEtapa.id, nombre: "Manzana A" },
            });
            manzanaId = newManzana.id;
        } else {
            manzanaId = firstEtapa.manzanas[0].id;
        }

        // 3. Save updated SVG to project
        await prisma.proyecto.update({
            where: { id: params.id },
            data: { masterplanSVG: svgContent },
        });

        // 4. Compute SVG bounding box for proper coordinate projection
        const lotPaths = paths.filter(p => p.center);
        let minCX = Infinity, minCY = Infinity, maxCX = -Infinity, maxCY = -Infinity;
        for (const p of lotPaths) {
            minCX = Math.min(minCX, p.center.x);
            minCY = Math.min(minCY, p.center.y);
            maxCX = Math.max(maxCX, p.center.x);
            maxCY = Math.max(maxCY, p.center.y);
        }
        const svgW = maxCX - minCX || 1;
        const svgH = maxCY - minCY || 1;

        const bounds = project.overlayBounds
            ? (JSON.parse(project.overlayBounds) as [[number, number], [number, number]])
            : null;

        // 5. Upsert units — only paths that have a lotNumber or internalId
        let created = 0;
        let updated = 0;

        for (const p of paths) {
            // Skip non-lot paths (lines, arcs without identifier)
            if (!p.lotNumber && !p.internalId) continue;

            const numero = p.lotNumber ?? `L${p.internalId}`;

            // Geographic coordinates: project SVG center to lat/lng
            // SVG top (small Y) → north (high lat), SVG bottom → south (low lat)
            let geoJSON: string | null = null;
            if (bounds && p.center) {
                const [[swLat, swLng], [neLat, neLng]] = bounds;
                const latDiff = neLat - swLat;
                const lngDiff = neLng - swLng;
                // Y is flipped: minCY = top = north, maxCY = bottom = south
                const lat = neLat - ((p.center.y - minCY) / svgH) * latDiff;
                const lng = swLng + ((p.center.x - minCX) / svgW) * lngDiff;
                geoJSON = JSON.stringify({ type: "Point", coordinates: [lng, lat] });
            }

            const coordenadasMasterplan = JSON.stringify({
                path: p.pathData,
                center: p.center,
                internalId: p.internalId,
                lotLabel: p.lotNumber ?? null,  // texto original del DXF
            });

            const validEstados = ["DISPONIBLE", "BLOQUEADO", "RESERVADO", "VENDIDO", "SUSPENDIDO"];
            const estado = validEstados.includes(p.estado ?? "") ? p.estado! : "DISPONIBLE";

            const existing = await prisma.unidad.findFirst({
                where: { manzanaId, numero },
            });

            if (existing) {
                await prisma.unidad.update({
                    where: { id: existing.id },
                    data: {
                        coordenadasMasterplan,
                        geoJSON,
                        superficie: p.areaSqm ?? existing.superficie,
                        frente: p.frente ?? existing.frente,
                        fondo: p.fondo ?? existing.fondo,
                        precio: p.precio ?? existing.precio,
                        estado,
                    },
                });
                updated++;
            } else {
                await prisma.unidad.create({
                    data: {
                        manzanaId,
                        numero,
                        tipo: "LOTE",
                        superficie: p.areaSqm ?? null,
                        frente: p.frente ?? null,
                        fondo: p.fondo ?? null,
                        precio: p.precio ?? null,
                        moneda: "USD",
                        estado,
                        coordenadasMasterplan,
                        geoJSON,
                    },
                });
                created++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sincronización completada. ${created} creados, ${updated} actualizados.`,
            created,
            updated,
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
