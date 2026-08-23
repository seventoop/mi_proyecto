import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireDebugAccess } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/debug/db-counts
 *
 * Local/dev read-only diagnostic endpoint. Reports aggregate counts only.
 *
 * Seguridad:
 *  - En producción responde 404.
 *  - Requiere header x-debug-db-token matcheando DEBUG_DB_TOKEN.
 *  - Si DEBUG_DB_TOKEN no está seteada, bloquea la solicitud.
 *  - NUNCA devuelve passwords, urls completas, secrets, host DB ni datos personales.
 *  - NO modifica nada.
 */
export async function GET(req: NextRequest) {
    const debugAccessError = requireDebugAccess(req);
    if (debugAccessError) return debugAccessError;

    try {
        const now = new Date();

        const [
            users,
            usersConPassword,
            usersConGoogle,
            proyectos,
            proyectosPublicos,
            proyectoImagenes,
            unidades,
            banners,
            bannersGlobalPublished,
            leads,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { password: { not: null } } }),
            prisma.user.count({ where: { googleId: { not: null } } }),
            prisma.proyecto.count(),
            prisma.proyecto.count({
                where: {
                    deletedAt: null,
                    visibilityStatus: "PUBLICADO",
                    estado: { notIn: ["SUSPENDIDO", "CANCELADO", "ELIMINADO", "DESACTIVADO"] },
                    OR: [
                        { isDemo: false },
                        { isDemo: true, demoExpiresAt: { gt: now } },
                    ],
                },
            }),
            prisma.proyectoImagen.count(),
            prisma.unidad.count(),
            prisma.banner.count(),
            prisma.banner.count({
                where: { estado: "PUBLISHED", context: "SEVENTOOP_GLOBAL" },
            }),
            prisma.lead.count(),
        ]);

        return NextResponse.json({
            ok: true,
            timestamp: now.toISOString(),
            counts: {
                users,
                usersConPassword,
                usersConGoogle,
                proyectos,
                proyectosVisiblesEnLanding: proyectosPublicos,
                proyectoImagenes,
                unidades,
                banners,
                bannersPublicadosLanding: bannersGlobalPublished,
                leads,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "unknown",
            },
            { status: 500 },
        );
    }
}
