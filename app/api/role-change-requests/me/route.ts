import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { handleApiGuardError, requireAuth } from "@/lib/guards";

export async function GET() {
    try {
        const user = await requireAuth();

        const requests = await prisma.roleChangeRequest.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 5,
            select: {
                id: true,
                currentRole: true,
                requestedRole: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                latest: requests[0] ?? null,
                requests,
            },
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
