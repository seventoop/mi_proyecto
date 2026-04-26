import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Public diagnostics endpoint.
 *
 * IMPORTANT: this route is unauthenticated — it must NEVER return user PII
 * (emails, names) or any secret values. Only:
 *   - booleans for whether env vars are present (never their values),
 *   - the configured NEXTAUTH_URL (already public, used by browsers),
 *   - aggregate counts for sanity-checking DB connectivity.
 */
export async function GET() {
    const checks: Record<string, any> = {
        timestamp: new Date().toISOString(),
        env: {
            DATABASE_URL: !!process.env.DATABASE_URL,
            NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
            GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
            RESEND_API_KEY: !!process.env.RESEND_API_KEY,
            NODE_ENV: process.env.NODE_ENV,
        },
        database: { connected: false, userCount: 0, projectCount: 0 },
    };

    try {
        const [userCount, projectCount] = await Promise.all([
            prisma.user.count(),
            prisma.proyecto.count(),
        ]);
        checks.database = {
            connected: true,
            userCount,
            projectCount,
        };
    } catch (error: any) {
        checks.database = {
            connected: false,
            error: error.message,
            userCount: 0,
            projectCount: 0,
        };
    }

    return NextResponse.json(checks);
}
