import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { requireAuth, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import { z } from "zod";
import {
    MAX_FILE_SIZE_GENERAL,
    ALLOWED_MIME_TYPES_GENERAL,
    validateMagicBytes,
    sanitizeFilename
} from "@/lib/upload-utils";

const uploadSchema = z.object({
    file: z.instanceof(File)
        .refine(f => f.size > 0, "Archivo vacío")
        .refine(f => f.size <= MAX_FILE_SIZE_GENERAL, `El archivo excede los ${MAX_FILE_SIZE_GENERAL / (1024 * 1024)}MB`)
        .refine(f => ALLOWED_MIME_TYPES_GENERAL.includes(f.type as any), {
            message: "Tipo de archivo no permitido"
        }),
    projectId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();

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
            folder: "general",
            filename: validFile.name,
            contentType: validFile.type,
            buffer,
        });

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            key: uploadResult.key,
            size: uploadResult.size,
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
