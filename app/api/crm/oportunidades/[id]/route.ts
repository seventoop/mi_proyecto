import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiGuardError } from "@/lib/guards";
import { updateOportunidad } from "@/lib/actions/crm-actions";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await requireAuth();

        const body = await request.json();
        const result = await updateOportunidad(id, body);

        if (!result.success) {
            return NextResponse.json({ error: (result as any).error }, { status: 400 });
        }

        return NextResponse.json(result.data);
    } catch (error) {
        return handleApiGuardError(error);
    }
}
