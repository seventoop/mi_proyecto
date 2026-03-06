import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

export async function GET() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const plans = await prisma.plan.findMany({
            orderBy: { precio: "asc" },
            include: { _count: { select: { orgs: true } } },
        });
        return NextResponse.json({ data: plans });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const body = await req.json();
        const plan = await prisma.plan.create({ data: body });
        return NextResponse.json({ data: plan }, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
