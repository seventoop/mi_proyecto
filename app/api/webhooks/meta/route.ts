import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { aiLeadScoring } from "@/lib/actions/ai-lead-scoring";

/**
 * Meta (Facebook/Instagram) Lead Ads Webhook
 */

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Standardizing to META_WEBHOOK_VERIFY_TOKEN as per ticket
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
        console.log("[Webhook:Meta] Verification successful");
        return new Response(challenge, { status: 200 });
    }

    console.warn("[Webhook:Meta] Verification failed");
    return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);

        // 1. Signature verification (X-Hub-Signature-256)
        const signature = req.headers.get("x-hub-signature-256");
        const appSecret = process.env.META_WEBHOOK_SECRET || process.env.META_APP_SECRET;

        if (!appSecret) {
            console.error("[Webhook:Meta] Missing META_WEBHOOK_SECRET in environment");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        if (!signature) {
            console.warn("[Webhook:Meta] Missing signature header");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hmac = crypto.createHmac("sha256", appSecret);
        const digest = "sha256=" + hmac.update(rawBody).digest("hex");

        if (signature.length !== digest.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
            console.warn("[Webhook:Meta] Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // 2. Return 200 immediately to avoid timeouts
        // We process the rest asynchronously
        (async () => {
            try {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        if (change.field === "leadgen") {
                            const leadId = change.value.leadgen_id;
                            const pageId = change.value.page_id;
                            const adId = change.value.ad_id;
                            const campaignId = change.value.campaign_id;

                            console.log("[Webhook:Meta] Processing lead", { leadId, adId, campaignId });

                            // 3. Deduplication: Check if lead already exists by adId (or leadgen_id as unique identifier)
                            const existingLead = await prisma.lead.findFirst({
                                where: {
                                    OR: [
                                        { adId: adId },
                                        { notas: { contains: `Meta Lead ID: ${leadId}` } }
                                    ]
                                }
                            });

                            if (existingLead) {
                                console.log("[Webhook:Meta] Lead already exists, skipping", { leadId });
                                continue;
                            }

                            // 4. Create Lead
                            const lead = await prisma.lead.create({
                                data: {
                                    nombre: `Meta Lead ${leadId}`,
                                    canalOrigen: "FACEBOOK",
                                    adId: adId,
                                    campanaId: campaignId,
                                    estado: "NUEVO",
                                    notas: `Meta Lead ID: ${leadId} | Page: ${pageId} | Entry timestamp: ${entry.time}`,
                                    origen: "FACEBOOK"
                                }
                            });

                            // 5. Audit Log
                            await (prisma.auditLog.create({
                                data: {
                                    userId: "system", // Webhook is system-level
                                    action: "LEAD_INBOUND_WEBHOOK",
                                    entity: "Lead",
                                    entityId: lead.id,
                                    details: JSON.stringify({ canal: "FACEBOOK", adId, campaignId })
                                }
                            }) as any);

                            // 6. Trigger AI Lead Scoring
                            console.log("[Webhook:Meta] Triggering AI scoring", { leadId: lead.id });
                            await aiLeadScoring(lead.id).catch(err => {
                                console.error("[Webhook:Meta] AI Scoring failed", { leadId: lead.id, error: err.message });
                            });
                        }
                    }
                }
            } catch (asyncError) {
                console.error("[Webhook:Meta] Async processing error:", asyncError);
            }
        })();

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Webhook:Meta] Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

