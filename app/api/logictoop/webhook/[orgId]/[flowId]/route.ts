import { NextRequest, NextResponse } from "next/server";
import { handleExternalWebhook } from "@/lib/logictoop/webhooks/webhookRouter";

/**
 * PUBLIC LogicToop Webhook Endpoint
 * /api/logictoop/webhook/[orgId]/[flowId]
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { orgId: string; flowId: string } }
) {
    try {
        const { orgId, flowId } = params;
        const secret = req.headers.get("x-logictoop-secret") || "";
        const payload = await req.json().catch(() => ({}));

        if (!orgId || !flowId) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
        }

        const result = await handleExternalWebhook(orgId, flowId, secret, payload) as any;

        return NextResponse.json({ 
            success: true, 
            executionId: result?.executionId,
            message: "Flow disparado correctamente" 
        });
    } catch (error: any) {
        console.error("[LogicToop Webhook API] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}
