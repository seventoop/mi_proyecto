import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Cron job to activate scheduled banners and expire finished ones.
 * Called by a scheduler (e.g., Vercel Cron) with CRON_SECRET.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const now = new Date();

        // 1. Activate banners that should start now
        const activated = await prisma.banner.updateMany({
            where: {
                estado: "PROGRAMADO",
                fechaInicio: { lte: now },
                OR: [
                    { fechaFin: null },
                    { fechaFin: { gt: now } }
                ]
            },
            data: {
                estado: "APROBADO"
            }
        });

        // 2. Expire banners that should end now
        const expired = await prisma.banner.updateMany({
            where: {
                estado: "APROBADO",
                fechaFin: { lte: now }
            },
            data: {
                estado: "EXPIRADO"
            }
        });

        return NextResponse.json({
            success: true,
            activated: activated.count,
            expired: expired.count
        });
    } catch (error) {
        console.error("[Cron Banners Error]:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
