import { NextRequest, NextResponse } from "next/server";

/**
 * LogicToop AI - Paperclip Webhook Skeleton (Phase 10D)
 * 
 * Disabled by design.
 * Do not enable without HMAC verification, idempotency and tenant validation.
 * No side-effects are permitted in this phase.
 */
export async function POST(req: NextRequest) {
    try {
        const isRealConnectionEnabled = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

        if (!isRealConnectionEnabled) {
            return NextResponse.json(
                { error: "Paperclip webhook disabled" },
                { status: 403 }
            );
        }

        // Even if flags are true, we DO NOT process the payload in this phase.
        // This is a safety measure to ensure no unverified side-effects leak through.
        
        // Extract headers just to document expected interface
        const signature = req.headers.get("x-paperclip-signature");
        const idempotencyKey = req.headers.get("x-idempotency-key");
        const orgId = req.headers.get("x-logictoop-org-id");
        const taskId = req.headers.get("x-logictoop-task-id");

        console.log(`[PaperclipWebhook] Received payload. Disabled by design. (orgId: ${orgId}, taskId: ${taskId})`);

        return NextResponse.json(
            { error: "Paperclip webhook verification not implemented for runtime" },
            { status: 501 }
        );

    } catch (error: any) {
        console.error("[PaperclipWebhook] Error:", error.message);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
