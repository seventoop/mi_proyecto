export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

export async function GET() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        // DB health
        let db = false;
        try {
            await prisma.$queryRaw`SELECT 1`;
            db = true;
        } catch { /* DB not reachable */ }

        // Storage health (check if env vars exist)
        const storage = !!(process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_BUCKET);

        // Pusher health (check if env vars exist)
        const pusher = !!(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET);

        return NextResponse.json({ db, storage, pusher });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
