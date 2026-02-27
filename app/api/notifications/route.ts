import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const notifications = await prisma.notificacion.findMany({
            where: {
                usuarioId: session.user.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("[NOTIFICATIONS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id, readAll } = await req.json();

        if (readAll) {
            await prisma.notificacion.updateMany({
                where: {
                    usuarioId: session.user.id,
                    leido: false
                },
                data: {
                    leido: true
                }
            });
        } else if (id) {
            await prisma.notificacion.update({
                where: {
                    id,
                    usuarioId: session.user.id
                },
                data: {
                    leido: true
                }
            });
        }

        return new NextResponse("OK", { status: 200 });
    } catch (error) {
        console.error("[NOTIFICATIONS_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
