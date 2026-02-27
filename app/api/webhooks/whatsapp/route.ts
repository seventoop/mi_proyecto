import { NextResponse } from "next/server";
import { processIncomingLeadMessage } from "@/lib/actions/ai";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Generic parsing - Adjust based on specific provider (Evolution API, Twilio, etc.)
        // For Evolution API: body.data.key.remoteJid, body.data.message.conversation

        const telefono = body.telefono || body.data?.key?.remoteJid?.replace('@s.whatsapp.net', '');
        const mensaje = body.mensaje || body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
        const nombre = body.nombre || body.data?.pushName;

        if (!telefono || !mensaje) {
            return NextResponse.json({ error: "Missing identity or message" }, { status: 400 });
        }

        const result = await processIncomingLeadMessage({
            telefono,
            mensaje,
            nombre
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
