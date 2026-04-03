import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadFile } from "@/lib/storage";
import { requireAnyRole, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import {
    MAX_FILE_SIZE_PLAN,
    sanitizeFilename,
    validatePlanFile,
} from "@/lib/upload-utils";

const uploadSchema = z.object({
    file: z.instanceof(File)
        .refine((file) => file.size > 0, "Archivo vacio")
        .refine(
            (file) => file.size <= MAX_FILE_SIZE_PLAN,
            `El archivo excede los ${MAX_FILE_SIZE_PLAN / (1024 * 1024)}MB`
        ),
    projectId: z.string().min(1, "projectId es obligatorio"),
});

export async function POST(req: NextRequest) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        const formData = await req.formData();
        const file = formData.get("file");
        const projectId = formData.get("projectId") as string | undefined;

        const result = uploadSchema.safeParse({ file, projectId });
        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error.issues[0]?.message || "Validacion fallida",
                },
                { status: 400 }
            );
        }

        const { file: validFile, projectId: validProjectId } = result.data;

        await requireProjectOwnership(validProjectId);

        try {
            sanitizeFilename(validFile.name);
        } catch (error: any) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        const buffer = Buffer.from(await validFile.arrayBuffer());
        const validation = validatePlanFile(buffer, validFile.name, validFile.type);

        if (!validation.ok) {
            return NextResponse.json(
                { success: false, error: validation.error || "Archivo de plano invalido" },
                { status: 400 }
            );
        }

        let uploadResult;
        try {
            uploadResult = await uploadFile({
                folder: "masterplan",
                filename: validFile.name,
                contentType: validFile.type || "application/octet-stream",
                buffer,
            });
        } catch (error: any) {
            return NextResponse.json(
                {
                    success: false,
                    error: error?.message || "No se pudo guardar el archivo original",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            key: uploadResult.key,
            size: uploadResult.size,
            detectedType: validation.detectedType,
            mimeType: validFile.type || null,
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
