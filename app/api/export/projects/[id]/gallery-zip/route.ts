import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireProjectOwnership, handleApiGuardError } from "@/lib/guards";
import archiver from "archiver";
import { PassThrough } from "stream";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireProjectOwnership(params.id);

        const projectId = params.id;

        // Verify project existence
        const proyecto = await prisma.proyecto.findUnique({
            where: { id: projectId },
            select: { id: true, nombre: true }
        });

        if (!proyecto) {
            return new NextResponse("Proyecto no encontrado", { status: 404 });
        }

        // Fetch all images
        const imagenes = await prisma.proyectoImagen.findMany({
            where: { proyectoId: projectId },
            orderBy: { orden: "asc" }
        });

        if (imagenes.length === 0) {
            return NextResponse.json({ success: false, error: "No hay imágenes para exportar" }, { status: 400 });
        }

        // Create a ZIP archive
        const archive = archiver("zip", {
            zlib: { level: 9 } // Maximum compression
        });

        const stream = new PassThrough();

        // Handle archive errors
        archive.on("error", (err) => {
            console.error("Archiver error:", err);
        });

        // Set response headers
        const fileName = `${proyecto.nombre.replace(/\s+/g, "_")}_galeria.zip`;
        const headers = new Headers();
        headers.set("Content-Type", "application/zip");
        headers.set("Content-Disposition", `attachment; filename="${fileName}"`);

        // Start archiving process in the background
        const archivePromise = (async () => {
            for (const img of imagenes) {
                try {
                    const response = await fetch(img.url);
                    if (!response.ok) continue;

                    const buffer = Buffer.from(await response.arrayBuffer());
                    const extension = img.url.split(".").pop()?.split("?")[0] || "jpg";
                    const entryName = `${img.categoria}_${img.id.slice(-4)}.${extension}`;

                    archive.append(buffer, { name: entryName });
                } catch (err) {
                    console.error(`Error adding image ${img.url} to zip:`, err);
                }
            }
            await archive.finalize();
        })();

        // Pipe archiver to the stream
        archive.pipe(stream);

        return new NextResponse(stream as any, {
            headers
        });

    } catch (error) {
        return handleApiGuardError(error);
    }
}
