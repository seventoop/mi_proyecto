import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { requireAuth, requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import { z } from "zod";
import {
    MAX_FILE_SIZE_GENERAL,
    ALLOWED_MIME_TYPES_GENERAL,
    validateMagicBytes,
    sanitizeFilename,
} from "@/lib/upload-utils";

const uploadSchema = z.object({
    file: z.instanceof(File)
        .refine(f => f.size > 0, "Archivo vacío")
        .refine(f => f.size <= MAX_FILE_SIZE_GENERAL, `El archivo excede los ${MAX_FILE_SIZE_GENERAL / (1024 * 1024)}MB`)
        .refine(f => ALLOWED_MIME_TYPES_GENERAL.includes(f.type as any), {
            message: "Tipo de archivo no permitido",
        }),
    projectId: z.string().uuid().optional(),
});

const TEMP_BANNER_FALLBACK_MAX = 5 * 1024 * 1024;

function isBannerSafeImage(mimeType: string) {
    return mimeType.startsWith("image/") || mimeType === "image/gif";
}

function canUseTempBannerFallback(buffer: Buffer, mimeType: string) {
    return isBannerSafeImage(mimeType) && buffer.length <= TEMP_BANNER_FALLBACK_MAX;
}

function toDataUrl(buffer: Buffer, mimeType: string) {
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();

        const formData = await req.formData();
        const file = formData.get("file");
        const projectId = formData.get("projectId");

        const result = uploadSchema.safeParse({
            file,
            projectId: projectId === "null" || !projectId ? undefined : projectId,
        });
        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error.issues[0]?.message || "Validación fallida",
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

        try {
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
                storage: "s3",
            });
        } catch (storageErr: any) {
            const raw = String(storageErr?.message || "");
            const status = storageErr?.$metadata?.httpStatusCode;
            const missingStorage = /no configurado|STORAGE_TYPE|S3_BUCKET|S3_ACCESS_KEY|PROHIBIDO en producción/i.test(raw);
            const authError = status === 401 || status === 403 || /AccessDenied|InvalidAccessKeyId|SignatureDoesNotMatch/i.test(raw);

            if (missingStorage) {
                if (!canUseTempBannerFallback(buffer, validFile.type)) {
                    if (validFile.type.startsWith("video/")) {
                        return NextResponse.json({
                            success: false,
                            error: "Para videos hace falta configurar almacenamiento externo",
                        }, { status: 503 });
                    }
                    return NextResponse.json({
                        success: false,
                        error: "El almacenamiento de archivos no está configurado en este entorno. Avisá al administrador (faltan variables STORAGE_*).",
                    }, { status: 503 });
                }

                const dataUrl = toDataUrl(buffer, validFile.type);
                console.warn("[upload] TEMPORAL banner fallback activo (data URL sin storage)");
                return NextResponse.json({
                    success: true,
                    url: dataUrl,
                    key: `temp-data-url:${validFile.name}`,
                    size: buffer.length,
                    storage: "temp-data-url",
                    temporary: true,
                });
            }

            if (authError) {
                console.error("[upload] storage auth error:", { status, raw: raw.split("\n")[0] });
                return NextResponse.json({
                    success: false,
                    error: "El servidor no puede autenticarse contra el almacenamiento. Revisá las credenciales S3.",
                }, { status: 503 });
            }

            console.error("[upload] storage error:", { status, name: storageErr?.name, raw: raw.split("\n")[0] });
            return NextResponse.json({
                success: false,
                error: "No se pudo subir el archivo al almacenamiento. Intentá de nuevo o probá con otro archivo.",
            }, { status: 502 });
        }
    } catch (error) {
        return handleApiGuardError(error);
    }
}
