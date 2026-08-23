import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireDebugAccess } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const debugAccessError = requireDebugAccess(req);
    if (debugAccessError) return debugAccessError;

    try {
        const [total, byRole, withPassword, withGoogle] = await Promise.all([
            prisma.user.count(),
            prisma.user.groupBy({
                by: ["rol"],
                _count: { _all: true },
                orderBy: { rol: "asc" },
            }),
            prisma.user.count({ where: { password: { not: null } } }),
            prisma.user.count({ where: { googleId: { not: null } } }),
        ]);

        return NextResponse.json({
            ok: true,
            count: total,
            byRole: byRole.map((row) => ({
                role: row.rol,
                count: row._count._all,
            })),
            accountLinks: {
                withPassword,
                withGoogle,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "unknown",
            },
            { status: 500 },
        );
    }
}
