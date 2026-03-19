import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { requireAnyRole, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import { z } from "zod";
import {
    MAX_FILE_SIZE_360,
    ALLOWED_MIME_TYPES_360,
    validateMagicBytes,
    sanitizeFilename
} from "@/lib/upload-utils";

const uploadSchema = z.object({
    file: z.instanceof(File)
        .refine(f => f.size > 0, "Archivo vacío")
        .refine(f => f.size <= MAX_FILE_SIZE_360, `El archivo excede los ${MAX_FILE_SIZE_360 / (1024 * 1024)}MB`)
        .refine(f => ALLOWED_MIME_TYPES_360.includes(f.type as any) || f.type.startsWith("image/"), {
            message: "Tipo de archivo 360 no permitido"
        }),
    projectId: z.string().min(1, "projectId es obligatorio"),
});

export async function POST(req: NextRequest) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        const formData = await req.formData();
        const file = formData.get("file");
        const projectId = formData.get("projectId") as string | undefined;

        const result = uploadSchema.safeParse({ file, projectId: projectId || undefined });
        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error.issues[0]?.message || "Validación fallida"
            }, { status: 400 });
        }

        const { file: validFile, projectId: validProjectId } = result.data;

        // Security: Mandatory project ownership check
        await requireProjectOwnership(validProjectId);

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
            folder: "360",
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
