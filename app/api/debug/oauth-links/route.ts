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

        const accounts = await prisma.account.findMany({
            where: { provider: "google" },
            select: { userId: true, provider: true, providerAccountId: true },
        });

        const accountsByUserId = new Map<string, { provider: string; providerAccountId: string | null }[]>();
        for (const account of accounts) {
            const list = accountsByUserId.get(account.userId) ?? [];
            list.push({ provider: account.provider, providerAccountId: account.providerAccountId });
            accountsByUserId.set(account.userId, list);
        }

        const matchedUsers = await prisma.user.findMany({
            where: { googleId: { not: null } },
            select: { id: true, email: true, googleId: true },
            orderBy: { createdAt: "asc" },
        });

        const output = matchedUsers.map((user) => {
            const userAccounts = accountsByUserId.get(user.id) ?? [];
            const googleAccounts = userAccounts.filter((account) => account.provider === "google");
            return {
                email: user.email,
                exists_in_account: googleAccounts.length > 0,
                provider_google: googleAccounts.some((account) => account.provider === "google"),
                providerAccountId_present: googleAccounts.some((account) => !!account.providerAccountId),
            };
        });

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
