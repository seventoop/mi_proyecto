import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";

/**
 * POST /api/proyectos/[id]/reset
 * Reinicia datos del proyecto por etapa.
 * Solo accesible para ADMIN o dueño del proyecto.
 *
 * Body: { steps: { paso2, paso3, paso4, paso5 } }
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Only ADMIN/SUPERADMIN can reset (as per Task 2 instruction)
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        await requireProjectOwnership(params.id);

        let body: { steps?: Record<string, boolean> };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Body inválido" }, { status: 400 });
        }

        const steps = body.steps ?? {};
        const reset: string[] = [];

        // ─── PASO 2: Plano DXF ────────────────────────────────────────────────
        if (steps.paso2) {
            await prisma.etapa.deleteMany({ where: { proyectoId: params.id } });
            await prisma.proyecto.update({
                where: { id: params.id },
                data: { masterplanSVG: null },
            });
            reset.push("paso2");
        }

        // ─── PASO 3: Masterplan / lotes ───────────────────────────────────────
        if (steps.paso3 && !steps.paso2) {
            const etapas = await prisma.etapa.findMany({
                where: { proyectoId: params.id },
                include: { manzanas: { select: { id: true } } },
            });

            const manzanaIds = etapas.flatMap((e) => e.manzanas.map((m) => m.id));

            if (manzanaIds.length > 0) {
                const unidadesRaw = await prisma.unidad.findMany({
                    where: { manzanaId: { in: manzanaIds } },
                    select: { id: true },
                });
                const unidadIds = unidadesRaw.map((u) => u.id);

                if (unidadIds.length > 0) {
                    await prisma.historialUnidad.deleteMany({
                        where: { unidadId: { in: unidadIds } },
                    });
                }

                await prisma.unidad.updateMany({
                    where: { manzanaId: { in: manzanaIds } },
                    data: {
                        estado: "DISPONIBLE",
                        precio: null,
                        imagenes: null,
                        tour360Url: null,
                        responsableId: null,
                        financiacion: null,
                    },
                });
            }
            reset.push("paso3");
        }

        // ─── PASO 4: Mapa interactivo / overlay ───────────────────────────────
        if (steps.paso4) {
            await prisma.proyecto.update({
                where: { id: params.id },
                data: {
                    overlayUrl: null,
                    overlayBounds: null,
                    overlayRotation: 0,
                    mapCenterLat: -34.6037,
                    mapCenterLng: -58.3816,
                    mapZoom: 16,
                },
            });
            reset.push("paso4");
        }

        // ─── PASO 5: Tour 360° ────────────────────────────────────────────────
        if (steps.paso5) {
            await prisma.tour360.deleteMany({ where: { proyectoId: params.id } });
            reset.push("paso5");
        }

        return NextResponse.json({ success: true, reset });

    } catch (error) {
        return handleApiGuardError(error);
    }
}
