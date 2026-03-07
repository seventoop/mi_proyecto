import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
});

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }
    const data = await req.text();
    const params = new URLSearchParams(data);
    const socketId = params.get("socket_id")!;
    const channel = params.get("channel_name")!;
    const auth = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(auth);
}
