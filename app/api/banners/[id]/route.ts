import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/guards";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await requireAuth();
        const id = params.id;

        if (!id) return NextResponse.json({ success: false, error: "ID faltante" }, { status: 400 });

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        const existing = await prisma.banner.findUnique({ where: { id } });
        
        if (!existing) return NextResponse.json({ success: false, error: "Banner no encontrado" }, { status: 404 });

        if (!isAdmin && existing.creadoPorId !== user.id) {
            return NextResponse.json({ success: false, error: "No tenés permisos." }, { status: 403 });
        }

        await prisma.banner.delete({ where: { id } });

        revalidatePath("/dashboard/developer/banners");
        revalidatePath("/dashboard/vendedor/banners");
        revalidatePath("/dashboard/admin/banners");
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error en API DELETE banner:", error);
        return NextResponse.json({ success: false, error: error.message || "Error interno" }, { status: 500 });
    }
}
