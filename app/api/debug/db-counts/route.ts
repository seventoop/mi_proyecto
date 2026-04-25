import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/debug/db-counts?token=...
 *
 * Read-only diagnostic endpoint. Reports:
 *  - DB host (masked, no credentials)
 *  - Counts of users / proyectos / banners / imagenes / lotes / leads
 *  - Counts filtered by visibilidad pública para proyectos y banners
 *
 * Seguridad:
 *  - Requiere ?token=<DEBUG_DB_TOKEN> matcheando la env var DEBUG_DB_TOKEN.
 *  - Si DEBUG_DB_TOKEN no está seteada, el endpoint responde 503.
 *  - NUNCA devuelve passwords, urls completas, secrets ni datos personales.
 *  - NO modifica nada.
 */
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token") ?? "";
    const expected = process.env.DEBUG_DB_TOKEN;

    if (!expected) {
        return NextResponse.json(
            { error: "DEBUG_DB_TOKEN not configured" },
            { status: 503 },
        );
    }

    if (!token || token !== expected) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const dbHost = (() => {
        try {
            const url = new URL(process.env.DATABASE_URL ?? "");
            return `${url.hostname}:${url.port || "5432"}/${url.pathname.replace(/^\//, "")}`;
        } catch {
            return "<invalid DATABASE_URL>";
        }
    })();

    const provider = (() => {
        if (dbHost.includes("rlwy.net") || dbHost.includes("railway")) return "Railway";
        if (dbHost.includes("neon.tech")) return "Neon";
        if (dbHost.startsWith("helium:") || dbHost.startsWith("localhost")) return "Replit/Local";
        return "Unknown";
    })();

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
            db: { host: dbHost, provider },
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
                db: { host: dbHost, provider },
                error: error instanceof Error ? error.message : "unknown",
            },
            { status: 500 },
        );
    }
}
