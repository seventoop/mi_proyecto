import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyInactiveLead } from "@/lib/notifications/crm-notifications";

export async function GET(req: Request) {
    // @security-waive: PUBLIC - handled via CRON_SECRET check
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours

        // @security-waive: NO_ORG_FILTER - Multi-tenant cron job
        const inactiveLeads = await prisma.lead.findMany({
            where: {
                updatedAt: { lt: threshold },
                estado: { notIn: ['RESERVA', 'PERDIDO'] }
            }
        });

        for (const lead of inactiveLeads) {
            // Update Audit Log or mark as flagged if needed
            // To avoid spamming, we could add a lastNotified field
            await notifyInactiveLead(lead, lead.orgId as string);
        }

        return NextResponse.json({
            success: true,
            count: inactiveLeads.length
        });
    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
