export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

export async function GET() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const configs = await prisma.systemConfig.findMany();
        const configMap: Record<string, string> = {};
        configs.forEach(c => { configMap[c.key] = c.value; });
        return NextResponse.json({ data: configMap });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const updates = await req.json();

        await prisma.$transaction(async tx => {
            for (const [key, value] of Object.entries(updates)) {
                await tx.systemConfig.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) },
                });
                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        action: "UPDATE_CONFIG",
                        entity: "SystemConfig",
                        entityId: key,
                        details: JSON.stringify({ newValue: value }),
                    },
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
