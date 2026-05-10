import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { handleApiGuardError, requireProjectOwnership } from "@/lib/guards";
import { bakePanoramaOverlay } from "@/lib/images/baking";
import { uploadFile } from "@/lib/storage";
import path from "path";

/**
 * API Route to trigger the "baking" process for a 360 image.
 * It takes the original image and current canvasState, fuses static overlays
 * into the pixels, saves the result, and updates the database.
 *
 * POST /api/imagenes/bake
 * Body: { proyectoId: string, imagenId: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { proyectoId, imagenId } = body;

        if (!proyectoId || !imagenId) {
            return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
        }

        // 1. Security: Check project ownership/access
        await requireProjectOwnership(proyectoId);

        // 2. Data Fetch: Get image and its masterplanOverlay
        const imagen = await prisma.proyectoImagen.findFirst({
            where: { id: imagenId, proyectoId },
        });

        if (!imagen) {
            return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
        }

        // Extract canvasState from masterplanOverlay Json field
        const canvasState = (imagen.masterplanOverlay as any)?.canvasState || {};

        // 3. Baking Process
        // Generates a new JPEG buffer with fused overlays
        const bakedBuffer = await bakePanoramaOverlay({
            imageUrl: imagen.url,
            canvasState,
        });

        // 4. Storage: Save the processed image
        // Use a consistent naming convention: baked-[original-filename]
        const originalFilename = path.basename(imagen.url.split('?')[0]); // Remove query params if any
        const processedFilename = `baked-${originalFilename}`;

        const uploadResult = await uploadFile({
            folder: "360/processed",
            filename: processedFilename,
            contentType: "image/jpeg",
            buffer: bakedBuffer,
        });

        // 5. DB Update: Update processedImageUrl in ProyectoImagen
        const updatedImagen = await prisma.proyectoImagen.update({
            where: { id: imagenId },
            data: {
                processedImageUrl: uploadResult.url,
            },
        });

        console.log(`[Baking] Success for image ${imagenId}. URL: ${updatedImagen.processedImageUrl}`);

        return NextResponse.json({
            success: true,
            processedImageUrl: updatedImagen.processedImageUrl,
        });

    } catch (error: any) {
        console.error(`[Baking] Error for image:`, error);
        return handleApiGuardError(error);
    }
}
