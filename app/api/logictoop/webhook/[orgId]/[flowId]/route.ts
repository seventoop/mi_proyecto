import { NextRequest, NextResponse } from "next/server";
import { handleExternalWebhook } from "@/lib/logictoop/webhooks/webhookRouter";
import { checkRateLimit, getClientIp, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import { handleApiGuardError } from "@/lib/guards";

/**
 * PUBLIC LogicToop Webhook Endpoint
 * /api/logictoop/webhook/[orgId]/[flowId]
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { orgId: string; flowId: string } }
) {
    // @security-waive: PUBLIC - Secured by x-logictoop-secret
    try {
        const ip = getClientIp(req);
        const { allowed } = await checkRateLimit(ip, RATE_LIMIT_POLICIES.WEBHOOK);
        if (!allowed) {
            return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
        }

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
        return handleApiGuardError(error);
    }
}
