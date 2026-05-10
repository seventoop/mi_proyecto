import { NextRequest, NextResponse } from "next/server";
import { verifyPaperclipSignature } from "@/lib/logictoop/paperclip-security";

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
        const isDryRunHeader = req.headers.get("x-paperclip-dry-run") === "true";
        const isLocalDryRunEnabled = process.env.FEATURE_FLAG_PAPERCLIP_WEBHOOK_DRY_RUN === "true";

        if (isRealConnectionEnabled) {
            // If real connection is active, this route is disabled (Fase 10 does not implement real webhooks).
            // It MUST NOT process dry-runs either to avoid any leakage.
            return NextResponse.json(
                { error: "Paperclip webhook disabled for real connections" },
                { status: 501 }
            );
        }

        // If not a dry-run request, keep it disabled
        if (!isDryRunHeader && !isLocalDryRunEnabled) {
            return NextResponse.json(
                { error: "Paperclip webhook disabled" },
                { status: 403 }
            );
        }

        // --- DRY RUN MODE ---
        // We only proceed here if real connection is OFF and dry-run is ON.
        
        const signature = req.headers.get("x-paperclip-signature");
        const idempotencyKey = req.headers.get("x-idempotency-key");
        const orgId = req.headers.get("x-logictoop-org-id");
        const taskId = req.headers.get("x-logictoop-task-id");

        console.log(`[PaperclipWebhook] Dry-run received. (orgId: ${orgId}, taskId: ${taskId})`);

        // Read body as text for signature verification
        const rawBody = await req.text();
        const secret = process.env.PAPERCLIP_WEBHOOK_SECRET;

        let signatureVerified = false;
        const warnings: string[] = [];

        if (secret && signature) {
            signatureVerified = verifyPaperclipSignature(rawBody, signature, secret);
            if (!signatureVerified) {
                warnings.push("Signature verification failed.");
            }
        } else {
            warnings.push("Dry-run accepted without signature verification because secret or signature is not configured");
        }

        return NextResponse.json({
            success: true,
            mode: "webhook_dry_run",
            dbMutation: false,
            eventMutation: false,
            signatureVerified,
            warnings
        });

    } catch (error: any) {
        console.error("[PaperclipWebhook] Error:", error.message);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
