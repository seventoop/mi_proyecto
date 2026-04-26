import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token") ?? "";
    const expected = process.env.DEBUG_DB_TOKEN;

    if (!expected) {
        return NextResponse.json({ error: "DEBUG_DB_TOKEN not configured" }, { status: 503 });
    }

    if (!token || token !== expected) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            where: { googleId: { not: null } },
            select: { email: true, googleId: true },
            orderBy: { createdAt: "asc" },
        });

        const output = users.map((user) => ({
            email: user.email,
            exists_in_account: true,
            provider_google: true,
            providerAccountId_present: !!user.googleId,
        }));

        return NextResponse.json({
            ok: true,
            count: output.length,
            users: output,
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
