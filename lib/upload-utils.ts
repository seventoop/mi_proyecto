import { z } from "zod";

export const MAX_FILE_SIZE_GENERAL = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_360 = 50 * 1024 * 1024;     // 50MB
export const MAX_FILE_SIZE_PLAN = 20 * 1024 * 1024;    // 20MB

export const ALLOWED_MIME_TYPES_GENERAL = [
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    "application/pdf", "video/mp4", "video/webm"
] as const;

export const ALLOWED_MIME_TYPES_360 = [
    "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"
] as const;

export const ALLOWED_MIME_TYPES_PLAN = [
    "image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"
] as const;

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
