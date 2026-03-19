import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher";
import prisma from "@/lib/db";
import { requireAuth, handleApiGuardError } from "@/lib/guards";
import { getProjectAccess } from "@/lib/project-access";

/**
 * STP-P1-4: Advanced Pusher channel authorization.
 * Validates session, channel name format, and specific access permissions 
 * for private user and project channels.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const userId = user.id;
        const body = await req.text();
        const params = new URLSearchParams(body);
        const socketId = params.get("socket_id");
        const channelName = params.get("channel_name");

        if (!socketId || !channelName) {
            return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
        }

        // 1. Strict Channel Name Validation
        // User notification channels: "private-user-{userId}-notifications"
        const userChannelRegex = /^private-user-([a-zA-Z0-9]+)-notifications$/;
        const projectChannelRegex = /^private-project-([a-zA-Z0-9_\-]+)$/;

        let authorized = false;

        // 🛡️ Security Check: Private User channels (for personal notifications)
        const userMatch = channelName.match(userChannelRegex);
        if (userMatch) {
            const channelUserId = userMatch[1];
            if (userId === channelUserId || user.role === "ADMIN") {
                authorized = true;
            }
        }

        // 🏗️ Security Check: Private Project channels (for project updates/chat)
        const projectMatch = channelName.match(projectChannelRegex);
        if (projectMatch && !authorized) {
            const projectId = projectMatch[1];

            if (user.role === "ADMIN") {
                authorized = true;
            } else {
                // Relation-based check: any active ProyectoUsuario relation or legacy creator.
                // getProjectAccess handles legacy creadoPorId fallback internally.
                // Wrapped in try-catch: investors may be outside the project's org boundary.
                try {
                    const ctx = await getProjectAccess(user, projectId);
                    if (ctx.relacion?.estadoRelacion === "ACTIVA" || ctx.isLegacy) {
                        authorized = true;
                    }
                } catch {
                    // No org match or project not found — fall through to investor check
                }

                // Investor check: inversors may belong to a different org or have no org
                if (!authorized) {
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
        return handleApiGuardError(error);
    }
}
