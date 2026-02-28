import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createNotification } from "@/lib/actions/notifications";
import { requireCronSecret } from "@/lib/guards";

export async function POST(req: NextRequest) {
    try {
        await requireCronSecret(req);

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find users with demo ending in less than 24 hours who haven't been notified today
        const usersToNotify = await prisma.user.findMany({
            where: {
                demoEndsAt: {
                    gt: now,
                    lt: tomorrow
                },
                kycStatus: { not: "VERIFICADO" },
                // Add logic here if you want to prevent duplicate notifications per day, 
                // e.g., checking an 'auditLog' or a new field 'lastDemoReminderAt'
            },
            select: { id: true, email: true, nombre: true, demoEndsAt: true }
        });

        let count = 0;
        for (const user of usersToNotify) {
            const hoursLeft = Math.round((new Date(user.demoEndsAt!).getTime() - now.getTime()) / (1000 * 60 * 60));

            await createNotification(
                user.id,
                "ALERTA",
                "⚠️ Tu período de demo está por expirar",
                `Tu acceso de prueba expira en ${hoursLeft} horas. Completa tu KYC para mantener tus proyectos activos.`,
                "/dashboard/profile",
                true // Send Email
            );
            count++;
        }

        return NextResponse.json({ success: true, notified: count });
    } catch (error: any) {
        console.error("[CRON_DEMO_EXPIRATION_ERROR]", error);
        return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
    }
}
