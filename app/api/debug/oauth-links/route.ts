import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireDebugAccess } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const debugAccessError = requireDebugAccess(req);
    if (debugAccessError) return debugAccessError;

    try {
        const googleLinkedUsers = await prisma.user.count({
            where: { googleId: { not: null } },
        });

        return NextResponse.json({
            ok: true,
            googleLinkedUsers,
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
