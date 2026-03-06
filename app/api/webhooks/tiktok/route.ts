import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { aiLeadScoring } from "@/lib/actions/ai-lead-scoring";

/**
 * TikTok Lead Generation Webhook
 */

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);
        const signature = req.headers.get("x-tiktok-signature");
        const secret = process.env.TIKTOK_WEBHOOK_SECRET;

        if (!secret) {
            console.error("[Webhook:TikTok] Missing TIKTOK_WEBHOOK_SECRET in environment");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        // 1. Verify TikTok signature if secret is configured
        if (signature) {
            const hmac = crypto.createHmac("sha256", secret);
            const expected = hmac.update(rawBody).digest("hex");

            if (signature !== expected) {
                console.warn("[Webhook:TikTok] Invalid signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else {
            console.warn("[Webhook:TikTok] Missing signature header");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Return 200 immediately
        (async () => {
            try {
                // TikTok sends lead data in the body
                // The structure can vary, but we expect ad_id and lead data
                const adId = body.ad_id;
                const campaignId = body.campaign_id;

                if (!adId) {
                    console.warn("[Webhook:TikTok] Missing ad_id in payload", body);
                    return;
                }

                console.log("[Webhook:TikTok] Processing lead", { adId, campaignId });

                // 3. Deduplication
                const existingLead = await prisma.lead.findFirst({
                    where: { adId: adId }
                });

                if (existingLead) {
                    console.log("[Webhook:TikTok] Lead already exists, skipping", { adId });
                    return;
                }

                // Extract data from answers
                const answers: any[] = body.lead_data?.answers || [];
                const getName = () => answers.find(a => a.field_id === 'full_name')?.value || `TikTok Lead ${body.lead_id || Date.now()}`;
                const getEmail = () => answers.find(a => a.field_id === 'email')?.value;
                const getPhone = () => answers.find(a => a.field_id === 'phone_number')?.value;

                const email = getEmail();
                const phone = getPhone();
                let notas = `TikTok Ad: ${body.ad_name || "N/A"} | Form: ${body.advertiser_name || "N/A"}`;

                if (!email && !phone) {
                    notas += " | [!] Lead incompleto - revisar manualmente";
                }

                // 4. Create Lead
                const lead = await prisma.lead.create({
                    data: {
                        nombre: getName(),
                        email: email || null,
                        telefono: phone || null,
                        canalOrigen: "TIKTOK",
                        adId: adId,
                        campanaId: campaignId,
                        estado: "NUEVO",
                        notas: notas,
                        origen: "TIKTOK"
                    }
                });

                // 5. Audit Log
                await (prisma.auditLog.create({
                    data: {
                        userId: "system",
                        action: "LEAD_INBOUND_WEBHOOK",
                        entity: "Lead",
                        entityId: lead.id,
                        details: JSON.stringify({ canal: "TIKTOK", adId, campaignId })
                    }
                }) as any);

                // 6. Trigger AI Scoring
                console.log("[Webhook:TikTok] Triggering AI scoring", { leadId: lead.id });
                await aiLeadScoring(lead.id).catch(err => {
                    console.error("[Webhook:TikTok] AI Scoring failed", { leadId: lead.id, error: err.message });
                });
            } catch (asyncError) {
                console.error("[Webhook:TikTok] Async processing error:", asyncError);
            }
        })();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Webhook:TikTok] Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

