import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * POST /api/proyectos/[id]/reset
 * Reinicia datos del proyecto por etapa.
 * Solo accesible para ADMIN o dueño del proyecto.
 *
 * Body: { steps: { paso2, paso3, paso4, paso5 } }
 *
 * paso2 — Elimina masterplanSVG + etapas/manzanas/unidades
 * paso3 — Resetea campos comerciales de unidades (sin borrar geometría)
 * paso4 — Limpia overlay y posición del mapa
 * paso5 — Elimina tours 360 / escenas / hotspots
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === "ADMIN";

    // Verificar que el proyecto existe y el usuario tiene permiso
    const proyecto = await prisma.proyecto.findFirst({
        where: {
            id: params.id,
            ...(isAdmin ? {} : { creadoPorId: session.user.id }),
        },
        select: { id: true },
    });

    if (!proyecto) {
        return NextResponse.json(
            { error: "Proyecto no encontrado o sin permiso" },
            { status: 404 }
        );
    }

    let body: { steps?: Record<string, boolean> };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const steps = body.steps ?? {};
    const reset: string[] = [];

    try {
        // ─── PASO 2: Plano DXF ────────────────────────────────────────────────
        // Elimina: masterplanSVG + todas las etapas/manzanas/unidades/historial
        if (steps.paso2) {
            // Eliminar etapas cascadea a manzanas → unidades → historial_unidades
            await prisma.etapa.deleteMany({ where: { proyectoId: params.id } });
            await prisma.proyecto.update({
                where: { id: params.id },
                data: { masterplanSVG: null },
            });
            reset.push("paso2");
        }

        // ─── PASO 3: Masterplan / lotes ───────────────────────────────────────
        // Solo si paso2 NO fue seleccionado (si paso2 ya borró todo, no hay nada)
        // Resetea: estado → DISPONIBLE, limpia precios y datos comerciales
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
                    // Borrar historial de cambios
                    await prisma.historialUnidad.deleteMany({
                        where: { unidadId: { in: unidadIds } },
                    });
                }

                // Resetear campos comerciales, mantener geometría
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
        // Elimina: overlay guardado, posición del mapa
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
        // Elimina tours → escenas → hotspots (cascade via schema)
        if (steps.paso5) {
            await prisma.tour360.deleteMany({ where: { proyectoId: params.id } });
            reset.push("paso5");
        }

        return NextResponse.json({ success: true, reset });
    } catch (error) {
        console.error("[RESET] Error:", error);
        return NextResponse.json(
            { error: "Error al reiniciar datos del proyecto" },
            { status: 500 }
        );
    }
}
