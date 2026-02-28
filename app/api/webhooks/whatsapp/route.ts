import { NextResponse } from "next/server";
import { processIncomingLeadMessage } from "@/lib/actions/ai";
import { getSystemConfig } from "@/lib/actions/configuration";
import { z } from "zod";

// ─── Webhook Schema ───

const whatsappPayloadSchema = z.object({
    telefono: z.string().optional(),
    mensaje: z.string().optional(),
    nombre: z.string().optional(),
    // Support for Evolution API data structure
    data: z.object({
        key: z.object({
            remoteJid: z.string().optional()
        }).optional(),
        pushName: z.string().optional(),
        message: z.object({
            conversation: z.string().optional(),
            extendedTextMessage: z.object({
                text: z.string().optional()
            }).optional()
        }).optional()
    }).optional()
}).refine(data => {
    const telefono = data.telefono || data.data?.key?.remoteJid;
    const mensaje = data.mensaje || data.data?.message?.conversation || data.data?.message?.extendedTextMessage?.text;
    return !!telefono && !!mensaje;
}, {
    message: "Faltan datos de identidad o mensaje"
});

// ─── GET: Verification ───

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const verifyTokenRes = await getSystemConfig("WHATSAPP_VERIFY_TOKEN");
    const verifyToken = verifyTokenRes.success ? verifyTokenRes.value : process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
        return new Response(challenge, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
}

// ─── POST: Message Processing ───

import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
    try {
        // Rate Limiting: Max 300 msg/min per IP (WhatsApp source)
        const ip = getClientIp(req);
        const { allowed } = checkRateLimit(ip, {
            limit: 300,
            windowMs: 60 * 1000,
            keyPrefix: "whatsapp_webhook_"
        });

        if (!allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }
        // 1. Validate Webhook Secret (Header)
        const webhookSecretRes = await getSystemConfig("WHATSAPP_WEBHOOK_SECRET");
        const webhookSecret = webhookSecretRes.success ? webhookSecretRes.value : process.env.WHATSAPP_WEBHOOK_SECRET;

        // Check custom header or Evolution API's apikey
        const signature = req.headers.get("x-wa-signature") || req.headers.get("apikey") || req.headers.get("authorization");

        if (!webhookSecret || signature !== webhookSecret) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Parse and Validate Payload
        const rawBody = await req.json();
        const result = whatsappPayloadSchema.safeParse(rawBody);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid payload structure", details: result.error.format() }, { status: 400 });
        }

        const body = result.data;

        // 3. Extract and Sanitize
        const rawTelefono = body.telefono || body.data?.key?.remoteJid?.replace('@s.whatsapp.net', '');
        const rawMensaje = body.mensaje || body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
        const rawNombre = body.nombre || body.data?.pushName;

        if (!rawTelefono || !rawMensaje) {
            return NextResponse.json({ error: "Missing identity or message" }, { status: 400 });
        }

        // Basic sanitization: remove HTML/Script tags
        const sanitize = (val: string) => val.replace(/<[^>]*>?/gm, '').trim();

        const telefono = sanitize(rawTelefono).replace(/[^0-9]/g, ''); // Numeric only for phone
        const mensaje = sanitize(rawMensaje);
        const nombre = rawNombre ? sanitize(rawNombre) : undefined;

        // 4. Process Lead
        const processingResult = await processIncomingLeadMessage({
            telefono,
            mensaje,
            nombre
        });

        return NextResponse.json(processingResult);
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
