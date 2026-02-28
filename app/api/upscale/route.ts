import { NextResponse } from "next/server";
import { requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { z } from "zod";

// ─── Schema ───

const upscaleSchema = z.object({
    imageUrl: z.string().url("URL de imagen inválida"),
});

import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ─── POST Handler ───

export async function POST(req: Request) {
    try {
        // 1. AUTH: Only ADMIN or DESARROLLADOR can use upscale
        const user = await requireAnyRole(["ADMIN", "DESARROLLADOR"]);

        // 2. Rate Limiting: Max 10 per minute per User
        const { allowed } = checkRateLimit(user.id, {
            limit: RATE_LIMIT_MAX,
            windowMs: RATE_LIMIT_WINDOW_MS,
            keyPrefix: "upscale_"
        });

        if (!allowed) {
            return NextResponse.json(
                { error: "Demasiadas solicitudes. Intenta en 1 minuto." },
                { status: 429 }
            );
        }

        // 3. Validate payload
        const body = await req.json();
        const parsed = upscaleSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "URL de imagen requerida" },
                { status: 400 }
            );
        }

        const { imageUrl } = parsed.data;

        // 4. Validate URL is from our own S3 bucket or known domain (prevent SSRF)
        try {
            const url = new URL(imageUrl);
            const allowedHosts = [
                "images.unsplash.com",
                "plus.unsplash.com",
            ];
            // Allow S3 URLs and known hosts
            const isAllowed = allowedHosts.includes(url.hostname)
                || url.hostname.endsWith(".s3.amazonaws.com")
                || url.hostname.endsWith(".amazonaws.com");

            if (!isAllowed) {
                return NextResponse.json(
                    { error: "URL de imagen no permitida. Solo imágenes del sistema." },
                    { status: 400 }
                );
            }
        } catch {
            return NextResponse.json({ error: "URL inválida" }, { status: 400 });
        }

        // 5. Process (currently stub — returns original)
        return NextResponse.json({
            success: true,
            resultUrl: imageUrl,
            message: "Server-side upscaling is being initialized. Returning original for now."
        });

    } catch (error) {
        return handleApiGuardError(error);
    }
}
