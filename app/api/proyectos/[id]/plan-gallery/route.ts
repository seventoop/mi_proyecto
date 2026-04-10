import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { uploadFile } from "@/lib/storage";
import { randomUUID } from "crypto";

export interface PlanGalleryItem {
    id: string;
    nombre: string;
    imageUrl: string;
    tipo: "render" | "croquis" | "subdivision" | "catastral" | "otro";
    uploadedAt: string;
}

function parseGallery(raw: string | null): PlanGalleryItem[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

// GET /api/proyectos/[id]/plan-gallery
export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAnyRole(["ADMIN", "DESARROLLADOR", "VENDEDOR"]);
        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { planGallery: true },
        });
        if (!project) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        return NextResponse.json({ items: parseGallery(project.planGallery) });
    } catch (e) {
        return handleApiGuardError(e);
    }
}

// POST /api/proyectos/[id]/plan-gallery  — multipart/form-data: file + nombre + tipo
export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAnyRole(["ADMIN", "DESARROLLADOR", "VENDEDOR"]);

        const form = await req.formData();
        const file = form.get("file") as File | null;
        const nombre = (form.get("nombre") as string | null) || "Plano sin nombre";
        const tipo = (form.get("tipo") as string | null) || "otro";

        if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${randomUUID()}.${ext}`;

        const { url } = await uploadFile({
            folder: `proyectos/${params.id}/plans`,
            filename,
            contentType: file.type || "image/jpeg",
            buffer,
        });

        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { planGallery: true },
        });
        if (!project) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        const gallery = parseGallery(project.planGallery);
        const newItem: PlanGalleryItem = {
            id: randomUUID(),
            nombre,
            imageUrl: url,
            tipo: tipo as PlanGalleryItem["tipo"],
            uploadedAt: new Date().toISOString(),
        };
        gallery.push(newItem);

        await prisma.proyecto.update({
            where: { id: params.id },
            data: { planGallery: JSON.stringify(gallery) },
        });

        return NextResponse.json({ item: newItem });
    } catch (e) {
        return handleApiGuardError(e);
    }
}

// DELETE /api/proyectos/[id]/plan-gallery?planId=xxx
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAnyRole(["ADMIN", "DESARROLLADOR", "VENDEDOR"]);
        const { searchParams } = new URL(req.url);
        const planId = searchParams.get("planId");
        if (!planId) return NextResponse.json({ error: "planId requerido" }, { status: 400 });

        const project = await prisma.proyecto.findUnique({
            where: { id: params.id },
            select: { planGallery: true },
        });
        if (!project) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        const gallery = parseGallery(project.planGallery).filter(p => p.id !== planId);
        await prisma.proyecto.update({
            where: { id: params.id },
            data: { planGallery: JSON.stringify(gallery) },
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        return handleApiGuardError(e);
    }
}
