import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { message: "No se subió ningún archivo" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            "image/png", "image/jpeg", "image/jpg", "image/webp",
            "image/svg+xml", "application/pdf",
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { message: "Tipo de archivo no soportado. Use PNG, JPG, WEBP, SVG o PDF." },
                { status: 400 }
            );
        }

        // Max 20MB
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json(
                { message: "El archivo no puede superar los 20MB" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = join(process.cwd(), "public", "uploads", "masterplan");
        await mkdir(uploadDir, { recursive: true });

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const filename = `plan-${uniqueSuffix}.${ext}`;
        const filepath = join(uploadDir, filename);

        await writeFile(filepath, buffer);

        const url = `/uploads/masterplan/${filename}`;

        return NextResponse.json({ url, filename });
    } catch (error) {
        console.error("Error uploading masterplan file:", error);
        return NextResponse.json(
            { message: "Error al subir archivo" },
            { status: 500 }
        );
    }
}
