/**
 * Serverless-compatible file storage abstraction.
 *
 * PRODUCTION: requires S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)
 * DEVELOPMENT: falls back to local filesystem with warning (ephemeral, non-persistent).
 *
 * Configuration via environment variables:
 *   STORAGE_TYPE=s3        → uses S3-compatible API (REQUIRED for production)
 *   STORAGE_TYPE=local     → uses local filesystem (DEV ONLY — will THROW in production)
 *
 *   For S3:
 *     STORAGE_BUCKET=my-bucket
 *     STORAGE_REGION=us-east-1
 *     STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com (optional, for R2/MinIO)
 *     STORAGE_ACCESS_KEY=...
 *     STORAGE_SECRET_KEY=...
 *     STORAGE_PUBLIC_URL=https://cdn.example.com (public base URL for the bucket)
 */

import { randomUUID } from "crypto";

// ─── Types ───

export interface UploadResult {
    url: string;
    key: string;
    size: number;
}

export interface UploadOptions {
    folder: string;      // e.g. "general", "360", "masterplan"
    filename: string;    // original filename
    contentType: string; // MIME type
    buffer: Buffer;
}

// ─── Helpers ───

function sanitizeFilename(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "bin";
    const base = filename
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 50);
    return `${randomUUID()}-${base}.${ext}`;
}

// ─── Main Upload Function ───

export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
    const storageType = process.env.STORAGE_TYPE || (process.env.NODE_ENV === "production" ? "s3" : "local");

    switch (storageType) {
        case "s3":
            return uploadToS3(options);
        case "local":
            return uploadToLocal(options);
        default:
            throw new Error(
                `STORAGE_TYPE="${storageType}" no soportado. Use "s3" (producción) o "local" (solo desarrollo).`
            );
    }
}

// ─── S3-Compatible Upload (AWS S3, Cloudflare R2, MinIO, etc.) ───

async function uploadToS3(options: UploadOptions): Promise<UploadResult> {
    const bucket = process.env.STORAGE_BUCKET;
    const region = process.env.STORAGE_REGION || "us-east-1";
    const endpoint = process.env.STORAGE_ENDPOINT;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;
    const publicUrl = process.env.STORAGE_PUBLIC_URL;

    if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error(
            "S3 storage no configurado. Configure las variables: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY."
        );
    }

    // Dynamic import to avoid bundling AWS SDK when not used
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

    const client = new S3Client({
        region,
        ...(endpoint ? { endpoint } : {}),
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: !!endpoint, // Required for R2/MinIO path-style access
    });

    const key = `${options.folder}/${sanitizeFilename(options.filename)}`;

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: options.buffer,
            ContentType: options.contentType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    );

    const url = publicUrl
        ? `${publicUrl.replace(/\/$/, "")}/${key}`
        : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return {
        url,
        key,
        size: options.buffer.length,
    };
}

// ─── Local Filesystem Upload (DEVELOPMENT ONLY) ───

async function uploadToLocal(options: UploadOptions): Promise<UploadResult> {
    // HARD BLOCK: no local filesystem writes in production
    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "❌ STORAGE_TYPE=local está PROHIBIDO en producción. " +
            "Configure STORAGE_TYPE=s3 con las credenciales S3 correspondientes."
        );
    }

    console.warn(
        "⚠️  [Storage] Usando filesystem local (solo desarrollo). Configure STORAGE_TYPE=s3 para producción."
    );

    // Dynamic import to avoid bundling fs in client-side
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");

    const uploadDir = join(process.cwd(), "public", "uploads", options.folder);
    await mkdir(uploadDir, { recursive: true });

    const key = sanitizeFilename(options.filename);
    const filepath = join(uploadDir, key);

    await writeFile(filepath, options.buffer);

    const url = `/uploads/${options.folder}/${key}`;

    return {
        url,
        key,
        size: options.buffer.length,
    };
}

// ─── Delete File ───

export async function deleteFile(key: string): Promise<void> {
    const storageType = process.env.STORAGE_TYPE || (process.env.NODE_ENV === "production" ? "s3" : "local");

    if (storageType === "s3") {
        const bucket = process.env.STORAGE_BUCKET;
        const region = process.env.STORAGE_REGION || "us-east-1";
        const endpoint = process.env.STORAGE_ENDPOINT;
        const accessKeyId = process.env.STORAGE_ACCESS_KEY;
        const secretAccessKey = process.env.STORAGE_SECRET_KEY;

        if (!bucket || !accessKeyId || !secretAccessKey) return;

        const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");

        const client = new S3Client({
            region,
            ...(endpoint ? { endpoint } : {}),
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: !!endpoint,
        });

        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } else if (storageType === "local") {
        try {
            const { unlink } = await import("fs/promises");
            const { join } = await import("path");
            await unlink(join(process.cwd(), "public", "uploads", key));
        } catch {
            // File may not exist, ignore
        }
    }
}
