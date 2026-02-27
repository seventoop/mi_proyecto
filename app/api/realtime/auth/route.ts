import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher";

// ─── POST /api/realtime/auth — Pusher channel authentication ───
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const socketId = params.get("socket_id");
        const channelName = params.get("channel_name");

        if (!socketId || !channelName) {
            return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
        }

        const pusher = getPusherServer();
        const auth = pusher.authorizeChannel(socketId, channelName);

        return NextResponse.json(auth);
    } catch (error) {
        console.error("Pusher auth error:", error);
        return NextResponse.json({ error: "Auth failed" }, { status: 500 });
    }
}
