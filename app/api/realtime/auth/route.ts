import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * STP-P1-4: Advanced Pusher channel authorization.
 * Validates session, channel name format, and specific access permissions 
 * for private user and project channels.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await req.text();
        const params = new URLSearchParams(body);
        const socketId = params.get("socket_id");
        const channelName = params.get("channel_name");

        if (!socketId || !channelName) {
            return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
        }

        // 1. Strict Channel Name Validation
        const userChannelRegex = /^private-user-([a-zA-Z0-9_\-]+)$/;
        const projectChannelRegex = /^private-project-([a-zA-Z0-9_\-]+)$/;

        let authorized = false;

        // 🛡️ Security Check: Private User channels (for personal notifications)
        const userMatch = channelName.match(userChannelRegex);
        if (userMatch) {
            const channelUserId = userMatch[1];
            if (userId === channelUserId || (session.user as any).role === "ADMIN") {
                authorized = true;
            }
        }

        // 🏗️ Security Check: Private Project channels (for project updates/chat)
        const projectMatch = channelName.match(projectChannelRegex);
        if (projectMatch && !authorized) {
            const projectId = projectMatch[1];

            if ((session.user as any).role === "ADMIN") {
                authorized = true;
            } else {
                // Check if user is the Owner/Developer
                const project = await prisma.proyecto.findUnique({
                    where: { id: projectId },
                    select: { creadoPorId: true }
                });

                if (project && project.creadoPorId === userId) {
                    authorized = true;
                } else {
                    // Check if user is an Investor in this project
                    const investment = await prisma.inversion.findFirst({
                        where: {
                            proyectoId: projectId,
                            inversorId: userId,
                            estado: { not: "CANCELADO" }
                        }
                    });
                    if (investment) authorized = true;
                }
            }
        }

        // 🛑 Final Rejection if not authorized or name invalid
        if (!authorized) {
            return NextResponse.json({ error: "Prohibido: No tienes permisos para este canal" }, { status: 403 });
        }

        const pusher = getPusherServer();
        if (!pusher) {
            return NextResponse.json({ error: "Servicio de tiempo real no configurado" }, { status: 503 });
        }
        const auth = pusher.authorizeChannel(socketId, channelName);

        return NextResponse.json(auth);
    } catch (error) {
        console.error("Pusher auth error:", error);
        return NextResponse.json({ error: "Auth failed" }, { status: 500 });
    }
}
