import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
    const checks: Record<string, any> = {
        timestamp: new Date().toISOString(),
        env: {
            DATABASE_URL: !!process.env.DATABASE_URL,
            NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
            NODE_ENV: process.env.NODE_ENV,
        },
        database: { connected: false, userCount: 0, projectCount: 0, users: [] as any[] },
    };

    try {
        const [userCount, projectCount, users] = await Promise.all([
            prisma.user.count(),
            prisma.proyecto.count(),
            prisma.user.findMany({
                select: { id: true, email: true, rol: true, nombre: true },
                take: 20,
            }),
        ]);
        checks.database = {
            connected: true,
            userCount,
            projectCount,
            users: users.map((u) => ({
                id: u.id.substring(0, 8) + "...",
                email: u.email,
                rol: u.rol,
                nombre: u.nombre,
            })),
        };
    } catch (error: any) {
        checks.database = {
            connected: false,
            error: error.message,
            userCount: 0,
            projectCount: 0,
            users: [],
        };
    }

    return NextResponse.json(checks);
}
