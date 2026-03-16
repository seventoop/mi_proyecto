import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { requireProjectOwnership } from "@/lib/guards";
import { z } from "zod";
import {
    MAX_FILE_SIZE_PLAN,
    ALLOWED_MIME_TYPES_PLAN,
    validateMagicBytes,
    sanitizeFilename
} from "@/lib/upload-utils";

const uploadSchema = z.object({
    file: z.instanceof(File)
        .refine(f => f.size > 0, "Archivo vacío")
        .refine(f => f.size <= MAX_FILE_SIZE_PLAN, `El archivo excede los ${MAX_FILE_SIZE_PLAN / (1024 * 1024)}MB`)
        .refine(f => ALLOWED_MIME_TYPES_PLAN.includes(f.type as any), {
            message: "Tipo de archivo para masterplan no permitido"
        }),
    projectId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const projectId = formData.get("projectId") as string | undefined;

        const result = uploadSchema.safeParse({ file, projectId });
        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error.issues[0]?.message || "Validación fallida"
            }, { status: 400 });
        }

        const validFile = result.data.file;

        if (result.data.projectId) {
            try {
                await requireProjectOwnership(result.data.projectId);
            } catch (e: any) {
                return NextResponse.json({ success: false, error: e.message }, { status: 403 });
            }
        }

        try {
            sanitizeFilename(validFile.name);
        } catch (e: any) {
            return NextResponse.json({ success: false, error: e.message }, { status: 400 });
        }

        const buffer = Buffer.from(await validFile.arrayBuffer());
        if (!validateMagicBytes(buffer, validFile.type)) {
            return NextResponse.json({ success: false, error: "Contenido corrupto o MIME spoofing detectado" }, { status: 400 });
        }

        const uploadResult = await uploadFile({
            folder: "masterplan",
            filename: validFile.name,
            contentType: validFile.type,
            buffer,
        });

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            // Consistency Note: masterplan frontend might expect 'filename' instead of 'key'
            // but we'll return both to be safe or just follow general pattern.
            // Using 'key' as standardized.
            key: uploadResult.key,
            size: uploadResult.size,
        });
    } catch (error) {
        console.error("[Upload Masterplan Error]", error);
        return NextResponse.json({ success: false, error: "Error al subir archivo de masterplan" }, { status: 500 });
    }
}
