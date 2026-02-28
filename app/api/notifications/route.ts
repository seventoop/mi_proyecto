import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");
        const onlyUnread = searchParams.get("unread") === "true";
        const userId = (session.user as any).id;

        const where: any = { usuarioId: userId };
        if (onlyUnread) where.leido = false;

        const notifications = await prisma.notificacion.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        const unreadCount = await prisma.notificacion.count({
            where: { usuarioId: userId, leido: false }
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error("[API_NOTIFICATIONS_GET]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await req.json();
        const { id, all } = body;
        const userId = (session.user as any).id;

        if (all) {
            await prisma.notificacion.updateMany({
                where: { usuarioId: userId, leido: false },
                data: { leido: true }
            });
        } else if (id) {
            // Verify ownership
            const notif = await prisma.notificacion.findUnique({ where: { id } });
            if (!notif || notif.usuarioId !== userId) {
                return NextResponse.json({ error: "No encontrado o no autorizado" }, { status: 403 });
            }

            await prisma.notificacion.update({
                where: { id },
                data: { leido: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API_NOTIFICATIONS_PATCH]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

        const userId = (session.user as any).id;
        const notif = await prisma.notificacion.findUnique({ where: { id } });
        if (!notif || notif.usuarioId !== userId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        await prisma.notificacion.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API_NOTIFICATIONS_DELETE]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
