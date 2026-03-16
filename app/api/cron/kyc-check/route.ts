import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    // @security-waive: PUBLIC - handled via CRON_SECRET check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== "Bearer " + process.env.CRON_SECRET) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // CHECK A — Activate KYC requirement when demo expires
    const demoExpiredUsers = await prisma.user.findMany({
        where: {
            demoEndsAt: { lt: now },
            kycRequiredAt: null,
            kycStatus: "NINGUNO",
        },
        select: { id: true },
    });

    if (demoExpiredUsers.length > 0) {
        const ids = demoExpiredUsers.map((u) => u.id);

        await prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { kycRequiredAt: now, kycStatus: "PENDIENTE" },
        });

        await prisma.notificacion.createMany({
            data: ids.map((userId) => ({
                usuarioId: userId,
                tipo: "SISTEMA",
                titulo: "Verificación KYC requerida",
                mensaje:
                    "Tu período de demostración ha finalizado. Tienes 24 horas para completar tu verificación KYC y mantener el acceso a la plataforma.",
                leido: false,
            })),
        });
    }

    // CHECK B — Delete demo project and expire KYC if not submitted in 24h
    // A developer is considered "not submitted" if they have no kycProfile OR kycProfile.estado is still PENDIENTE
    const kycExpiredUsers = await prisma.user.findMany({
        where: {
            kycStatus: "PENDIENTE",
            kycRequiredAt: { lt: twentyFourHoursAgo },
            OR: [
                { kycProfile: null },
                { kycProfile: { estado: "PENDIENTE" } },
            ],
        },
        select: { id: true },
    });

    if (kycExpiredUsers.length > 0) {
        const ids = kycExpiredUsers.map((u) => u.id);

        // Delete demo projects for each user
        await prisma.proyecto.deleteMany({
            where: {
                creadoPorId: { in: ids },
                isDemo: true,
            },
        });

        await prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { kycStatus: "DEMO_EXPIRADO", demoUsed: true },
        });
    }

    return NextResponse.json({
        success: true,
        checkA: demoExpiredUsers.length,
        checkB: kycExpiredUsers.length,
    });
}
