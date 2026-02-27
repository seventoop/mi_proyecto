import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ message: "No se subió ningún archivo" }, { status: 400 });
        }

        // 50MB limit
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ message: "El archivo excede el límite de 50MB" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = join(process.cwd(), "public", "uploads", "360");
        await mkdir(uploadDir, { recursive: true });

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename = uniqueSuffix + "-" + file.name.replace(/[^a-zA-Z0-9.-]/g, "");
        const filepath = join(uploadDir, filename);

        await writeFile(filepath, buffer);

        const url = `/uploads/360/${filename}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({ message: "Error al subir archivo" }, { status: 500 });
    }
}
