import { z } from "zod";

export const MAX_FILE_SIZE_GENERAL = 50 * 1024 * 1024; // 50MB (banners: imagen/GIF chico, video corto)
export const MAX_FILE_SIZE_360 = 50 * 1024 * 1024;     // 50MB
export const MAX_FILE_SIZE_PLAN = 50 * 1024 * 1024;    // 50MB

export const ALLOWED_MIME_TYPES_GENERAL = [
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    "application/pdf",
    "video/mp4", "video/webm", "video/quicktime",
] as const;

export const ALLOWED_MIME_TYPES_360 = [
    "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"
] as const;

export const ALLOWED_MIME_TYPES_PLAN = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "application/dxf",
    "application/x-dxf",
    "image/vnd.dwg",
    "application/acad",
    "application/x-acad",
    "application/autocad_dwg",
    "application/octet-stream",
] as const;

export const ALLOWED_PLAN_EXTENSIONS = [
    "svg",
    "dxf",
    "dwg",
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
] as const;

export type AllowedPlanExtension = typeof ALLOWED_PLAN_EXTENSIONS[number];

export function getFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() || "" : "";
}

export function isAllowedPlanExtension(extension: string): extension is AllowedPlanExtension {
    return (ALLOWED_PLAN_EXTENSIONS as readonly string[]).includes(extension);
}

export function detectPlanFileType(filename: string, mimeType: string): AllowedPlanExtension | null {
    const extension = getFileExtension(filename);
    if (isAllowedPlanExtension(extension)) {
        return extension;
    }

    if (mimeType.includes("svg")) return "svg";
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("dxf")) return "dxf";
    if (
        mimeType.includes("dwg") ||
        mimeType.includes("acad") ||
        mimeType.includes("autocad")
    ) {
        return "dwg";
    }

    return null;
}

export function validatePlanFile(buffer: Buffer, filename: string, mimeType: string): {
    ok: boolean;
    detectedType: AllowedPlanExtension | null;
    error?: string;
} {
    const detectedType = detectPlanFileType(filename, mimeType);

    if (!detectedType) {
        return {
            ok: false,
            detectedType: null,
            error: "Formato de plano no soportado",
        };
    }

    if (detectedType === "dxf") {
        const header = buffer.toString("utf8", 0, Math.min(buffer.length, 2048)).toUpperCase();
        const looksLikeDxf =
            header.includes("SECTION") ||
            header.includes("ENTITIES") ||
            header.includes("ACADVER");

        return {
            ok: looksLikeDxf,
            detectedType,
            error: looksLikeDxf ? undefined : "El DXF no parece tener una estructura legible",
        };
    }

    if (detectedType === "dwg") {
        const headerAscii = buffer.toString("ascii", 0, Math.min(buffer.length, 8)).toUpperCase();
        const looksLikeDwg = headerAscii.startsWith("AC10");

        return {
            ok: looksLikeDwg,
            detectedType,
            error: looksLikeDwg ? undefined : "El DWG no tiene una firma reconocible",
        };
    }

    const effectiveMimeType =
        mimeType ||
        (detectedType === "svg" ? "image/svg+xml" :
         detectedType === "pdf" ? "application/pdf" :
         detectedType === "png" ? "image/png" :
         detectedType === "jpg" || detectedType === "jpeg" ? "image/jpeg" :
         detectedType === "webp" ? "image/webp" :
         "application/octet-stream");

    const ok = validateMagicBytes(buffer, effectiveMimeType);
    return {
        ok,
        detectedType,
        error: ok ? undefined : "Contenido corrupto o formato no compatible",
    };
}

export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;
    const header = buffer.toString("hex", 0, 4).toUpperCase();

    // JPEG: FFD8
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
        return header.startsWith("FFD8");
    }
    // PNG: 89504E47
    if (mimeType.includes("png")) {
        return header === "89504E47";
    }
    // PDF: 25504446 (%PDF)
    if (mimeType.includes("pdf")) {
        return header === "25504446";
    }
    // WEBP: 52494646 (RIFF) + 57454250 (WEBP) at offset 8
    if (mimeType.includes("webp")) {
        return header === "52494646" && buffer.toString("ascii", 8, 12) === "WEBP";
    }
    // GIF: 47494638 (GIF8)
    if (mimeType.includes("gif")) {
        return header.startsWith("47494638");
    }
    // SVG: Look for <svg or <?xml (text search in first 100 bytes)
    if (mimeType.includes("svg")) {
        const start = buffer.toString("utf8", 0, 100).toLowerCase();
        return start.includes("<svg") || start.includes("<?xml");
    }

    return true; // Pass through for other whitelisted types (basic validation)
}

export function sanitizeFilename(filename: string): string {
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
        throw new Error("Nombre de archivo inválido detectado");
    }
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
}
