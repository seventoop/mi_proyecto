import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const { id } = await params;
        const { planId } = await req.json();
        await prisma.organization.update({
            where: { id },
            data: { planId: planId || null },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
