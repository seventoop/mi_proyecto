import { NextRequest, NextResponse } from "next/server";
import { verifyPaperclipSignature } from "@/lib/logictoop/paperclip-security";
import { previewPaperclipWebhookEvent, PaperclipWebhookEventType } from "@/lib/logictoop/paperclip-event-bridge";

/**
 * LogicToop AI - Paperclip Webhook Skeleton (Phase 10D)
 * 
 * Disabled by design.
 * Do not enable without HMAC verification, idempotency and tenant validation.
 * No side-effects are permitted in this phase.
 */
export async function POST(req: NextRequest) {
    try {
        if (req.method !== "POST") {
            return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
        }

        const isRealConnectionEnabled = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";
        const isDryRunHeader = req.headers.get("x-paperclip-dry-run") === "true";
        const isLocalDryRunEnabled = process.env.FEATURE_FLAG_PAPERCLIP_WEBHOOK_DRY_RUN === "true";

        if (isRealConnectionEnabled) {
            // If real connection is active, this route is disabled (Fase 11 does not implement real webhooks).
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
        const eventTypeHeader = req.headers.get("x-paperclip-event-type") as PaperclipWebhookEventType | null;

        const blockers: string[] = [];
        const warnings: string[] = [];
        let requiredHeadersPresent = true;

        if (!signature || !idempotencyKey || !orgId || !taskId || !eventTypeHeader) {
            requiredHeadersPresent = false;
            blockers.push("Missing one or more required headers.");
        }

        const allowedEventTypes: PaperclipWebhookEventType[] = [
            "PAPERCLIP_RUN_ACCEPTED",
            "PAPERCLIP_RUN_COMPLETED",
            "PAPERCLIP_RUN_FAILED",
            "PAPERCLIP_RUN_NEEDS_APPROVAL"
        ];

        if (eventTypeHeader && !allowedEventTypes.includes(eventTypeHeader)) {
            blockers.push(`Invalid or unmapped event type: ${eventTypeHeader}`);
        }

        // Check body size limit (approximate text check for 50KB)
        const rawBody = await req.text();
        if (rawBody.length > 51200) {
            blockers.push("Payload size exceeds 50KB limit.");
        }

        console.log(`[PaperclipWebhook] Dry-run received. (orgId: ${orgId}, taskId: ${taskId}, eventType: ${eventTypeHeader})`);

        const secret = process.env.PAPERCLIP_WEBHOOK_SECRET;

        let signatureVerified = false;

        if (secret && signature) {
            signatureVerified = verifyPaperclipSignature(rawBody, signature, secret);
            if (!signatureVerified) {
                blockers.push("Signature verification failed.");
            }
        } else {
            warnings.push("Dry-run accepted without signature verification because secret or signature is not configured");
        }

        if (blockers.length > 0) {
             return NextResponse.json({
                success: false,
                mode: "webhook_dry_run",
                accepted: false,
                signatureVerified,
                requiredHeadersPresent,
                eventType: eventTypeHeader,
                dbMutation: false,
                eventMutation: false,
                warnings,
                blockers
            }, { status: 400 });
        }

        // Parse JSON for the preview bridge
        let payloadObj = {};
        try {
            payloadObj = JSON.parse(rawBody);
        } catch (e) {
            // Non-fatal for the bridge if we can't parse it, but let's warn
            warnings.push("Could not parse JSON body.");
        }

        // Map the event through the dry-run bridge
        const preview = previewPaperclipWebhookEvent({
            eventType: eventTypeHeader!,
            taskId: taskId!,
            orgId: orgId!,
            metadata: payloadObj
        });

        return NextResponse.json({
            success: true,
            mode: "webhook_dry_run",
            accepted: true,
            signatureVerified,
            requiredHeadersPresent,
            eventType: eventTypeHeader,
            dbMutation: false,
            eventMutation: false,
            preview,
            warnings,
            blockers
        });

    } catch (error: any) {
        console.error("[PaperclipWebhook] Error:", error.message);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
