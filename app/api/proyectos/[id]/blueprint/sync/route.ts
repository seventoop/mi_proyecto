import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import { BlueprintEmbeddedMeta, withBlueprintMeta } from "@/lib/blueprint-utils";

const MAX_BLUEPRINT_SYNC_PATHS = 5000;
const MAX_BLUEPRINT_SVG_BYTES = 8 * 1024 * 1024;

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

function normalizeFiniteNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeLotNumber(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const clean = value.trim().toUpperCase().slice(0, 40);
    if (!clean) return undefined;
    if (!/^[A-Z0-9._-]+$/.test(clean)) return undefined;
    return clean;
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);
        await requireProjectOwnership(params.id);
        const body = await request.json();
        const { paths, svgContent, meta } = body as {
            paths: SyncPath[];
            svgContent: string;
            meta?: BlueprintEmbeddedMeta;
        };

        if (!paths || !Array.isArray(paths)) {
            return NextResponse.json({ error: "paths array is required" }, { status: 400 });
        }
        if (typeof svgContent !== "string" || Buffer.byteLength(svgContent, "utf8") > MAX_BLUEPRINT_SVG_BYTES) {
            return NextResponse.json({ error: "El blueprint excede el tamaño máximo permitido" }, { status: 413 });
        }
        if (paths.length > MAX_BLUEPRINT_SYNC_PATHS) {
            return NextResponse.json({ error: "El blueprint contiene demasiados elementos para sincronizar de forma segura" }, { status: 413 });
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

        const safePaths = paths
            .filter((path) =>
                typeof path.pathData === "string" &&
                path.pathData.trim().length > 0 &&
                !/NaN|Infinity/.test(path.pathData) &&
                !!path.center &&
                Number.isFinite(path.center.x) &&
                Number.isFinite(path.center.y)
            )
            .map((path) => ({
                ...path,
                lotNumber: normalizeLotNumber(path.lotNumber),
                areaSqm: normalizeFiniteNumber(path.areaSqm),
                precio: normalizeFiniteNumber(path.precio),
                frente: normalizeFiniteNumber(path.frente),
                fondo: normalizeFiniteNumber(path.fondo),
            }));

        const allowInventorySync = meta?.processingMode === "detected-lots";
        const lotCandidates = allowInventorySync
            ? safePaths.filter((p) => p.lotNumber || p.internalId)
            : [];

        // 2. Save updated SVG to project
        await prisma.proyecto.update({
            where: { id: params.id },
            data: {
                masterplanSVG: meta
                    ? withBlueprintMeta(svgContent, {
                        ...meta,
                        detectedPaths: meta.detectedPaths ?? safePaths.length,
                        detectedLots: meta.detectedLots ?? safePaths.filter((path) => !!path.lotNumber).length,
                        savedAt: new Date().toISOString(),
                    })
                    : svgContent,
            },
        });

        if (lotCandidates.length === 0) {
            return NextResponse.json({
                success: true,
                message: "Base visual guardada sin lotes detectados automaticamente.",
                created: 0,
                updated: 0,
            });
        }

        // 3. Ensure a manzana exists to place lots into
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

        // 4. Compute SVG bounding box for proper coordinate projection
        const lotPaths = safePaths.filter(p => p.center);
        let minCX = Infinity, minCY = Infinity, maxCX = -Infinity, maxCY = -Infinity;
        for (const p of lotPaths) {
            minCX = Math.min(minCX, p.center.x);
            minCY = Math.min(minCY, p.center.y);
            maxCX = Math.max(maxCX, p.center.x);
            maxCY = Math.max(maxCY, p.center.y);
        }
        const svgW = maxCX - minCX || 1;
        const svgH = maxCY - minCY || 1;

        let bounds: [[number, number], [number, number]] | null = null;
        if (project.overlayBounds) {
            try {
                const parsed = JSON.parse(project.overlayBounds);
                bounds = Array.isArray(parsed)
                    ? parsed as [[number, number], [number, number]]
                    : Array.isArray(parsed?.bounds)
                        ? parsed.bounds as [[number, number], [number, number]]
                        : null;
            } catch {
                bounds = null;
            }
        }

        const existingUnits = await prisma.unidad.findMany({
            where: {
                manzanaId,
                numero: { in: lotCandidates.map((p) => p.lotNumber ?? `L${p.internalId}`) },
            },
            select: {
                id: true,
                numero: true,
                superficie: true,
                frente: true,
                fondo: true,
                precio: true,
            },
        });
        const existingByNumero = new Map(existingUnits.map((unit) => [unit.numero, unit]));

        // 5. Upsert units — only paths that have a lotNumber or internalId
        let created = 0;
        let updated = 0;

        for (const p of safePaths) {
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

            const existing = existingByNumero.get(numero);

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
