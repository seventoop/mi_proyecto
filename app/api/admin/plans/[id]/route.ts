export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const { id } = await params;
        const body = await req.json();
        const plan = await prisma.plan.update({ where: { id }, data: body });
        return NextResponse.json({ data: plan });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const { id } = await params;
        await prisma.organization.updateMany({ where: { planId: id }, data: { planId: null } });
        await prisma.plan.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
