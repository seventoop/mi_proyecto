import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "No se subió ningún archivo" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Crear carpeta de uploads si no existe
        const uploadDir = join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (err) {
            // Ya existe
        }

        const uniqueName = `${randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
        const path = join(uploadDir, uniqueName);

        await writeFile(path, buffer);
        const url = `/uploads/${uniqueName}`;

        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, error: "Error interno al subir archivo" }, { status: 500 });
    }
}
