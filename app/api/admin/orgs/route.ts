import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";

export async function GET() {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);
        const orgs = await prisma.organization.findMany({
            include: {
                planRef: { select: { id: true, nombre: true } },
                _count: { select: { users: true, proyectos: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ data: orgs });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
