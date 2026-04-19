/**
 * scripts/reset-project-plan.ts
 *
 * DESTRUCTIVO: deja un proyecto como si nunca hubiera tenido plano cargado.
 * A diferencia de clean-planos.ts, esto limpia TODO lo derivado del plano:
 *   - Proyecto: masterplanSVG, overlayUrl, overlayBounds, overlayRotation, planGallery
 *   - Unidad:   coordenadasMasterplan, geoJSON, polygon, centerLat, centerLng
 *   - Manzana:  coordenadas
 *   - Infraestructura: TODOS los registros del proyecto (DELETE)
 *   - ImagenMapa:      TODOS los registros del proyecto (DELETE)
 *
 * No toca: nombres de etapas/manzanas/unidades, estados de venta, precios,
 * leads, reservas, oportunidades, tours 360.
 *
 * Uso:
 *   # Dry-run sobre 1 proyecto (default)
 *   npx tsx scripts/reset-project-plan.ts --slug=barrio-capinota
 *
 *   # Ejecutar de verdad
 *   npx tsx scripts/reset-project-plan.ts --slug=barrio-capinota --confirm --i-know-what-im-doing
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
    const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split("=").slice(1).join("=") : undefined;
}

async function main() {
    const args = new Set(process.argv.slice(2));
    const slug = getArg("slug");
    const confirm = args.has("--confirm") && args.has("--i-know-what-im-doing");

    if (!slug) {
        console.error("ERROR: faltó --slug=<slug-del-proyecto>");
        process.exit(1);
    }

    const project = await prisma.proyecto.findFirst({
        where: { slug, deletedAt: null },
        select: {
            id: true,
            nombre: true,
            slug: true,
            masterplanSVG: true,
            overlayUrl: true,
            overlayBounds: true,
            overlayRotation: true,
            planGallery: true,
            mapCenterLat: true,
            mapCenterLng: true,
        },
    });

    if (!project) {
        console.error(`ERROR: no se encontró proyecto con slug="${slug}"`);
        process.exit(1);
    }

    // Conteos previos
    const [unitsCount, unitsWithGeo, manzanasWithGeo, infraCount, imagenesCount] = await Promise.all([
        prisma.unidad.count({
            where: { manzana: { etapa: { proyectoId: project.id } } },
        }),
        prisma.unidad.count({
            where: {
                manzana: { etapa: { proyectoId: project.id } },
                OR: [
                    { coordenadasMasterplan: { not: null } },
                    { geoJSON: { not: null } },
                    { polygon: { not: undefined } },
                    { centerLat: { not: null } },
                    { centerLng: { not: null } },
                ],
            },
        }),
        prisma.manzana.count({
            where: {
                etapa: { proyectoId: project.id },
                coordenadas: { not: null },
            },
        }),
        prisma.infraestructura.count({ where: { proyectoId: project.id } }),
        prisma.imagenMapa.count({ where: { proyectoId: project.id } }),
    ]);

    let galleryCount = 0;
    if (project.planGallery) {
        try { galleryCount = (JSON.parse(project.planGallery) as any[]).length; } catch {}
    }

    console.log("─".repeat(60));
    console.log(`Proyecto: ${project.nombre}  (slug=${project.slug})`);
    console.log(`ID: ${project.id}`);
    console.log("─".repeat(60));
    console.log("PROYECTO (campos de plano)");
    console.log(`  masterplanSVG       : ${project.masterplanSVG ? `${Math.round(project.masterplanSVG.length / 1024)} KB → null` : "(vacío)"}`);
    console.log(`  overlayUrl          : ${project.overlayUrl ?? "(vacío)"} → null`);
    console.log(`  overlayBounds       : ${project.overlayBounds ? "[json]" : "(vacío)"} → null`);
    console.log(`  overlayRotation     : ${project.overlayRotation ?? 0} → 0`);
    console.log(`  planGallery         : ${galleryCount} entradas → null`);
    console.log(`  mapCenter/Zoom      : se MANTIENEN (${project.mapCenterLat}, ${project.mapCenterLng})`);
    console.log("─".repeat(60));
    console.log("DERIVADOS (todos asociados al proyecto)");
    console.log(`  Unidades totales              : ${unitsCount} (no se borran)`);
    console.log(`  Unidades con geometría a limpiar: ${unitsWithGeo}`);
    console.log(`  Manzanas con coordenadas      : ${manzanasWithGeo} → coordenadas=null`);
    console.log(`  Infraestructura               : ${infraCount} → DELETE`);
    console.log(`  ImagenMapa                    : ${imagenesCount} → DELETE`);
    console.log("─".repeat(60));

    if (!confirm) {
        console.log("ℹ DRY-RUN. Pasá --confirm --i-know-what-im-doing para ejecutar.");
        await prisma.$disconnect();
        return;
    }

    console.log("⚙ Ejecutando reset…");

    await prisma.$transaction(async (tx) => {
        // 1) Limpiar campos del Proyecto
        await tx.proyecto.update({
            where: { id: project.id },
            data: {
                masterplanSVG: null,
                overlayUrl: null,
                overlayBounds: null,
                overlayRotation: 0,
                planGallery: null,
            },
        });

        // 2) Borrar Infraestructura del proyecto
        const infraDel = await tx.infraestructura.deleteMany({
            where: { proyectoId: project.id },
        });

        // 3) Borrar ImagenMapa del proyecto
        const imgDel = await tx.imagenMapa.deleteMany({
            where: { proyectoId: project.id },
        });

        // 4) Limpiar geometría de Manzanas
        const manzUpd = await tx.manzana.updateMany({
            where: { etapa: { proyectoId: project.id }, coordenadas: { not: null } },
            data: { coordenadas: null },
        });

        // 5) Limpiar geometría de Unidades
        const unitUpd = await tx.unidad.updateMany({
            where: { manzana: { etapa: { proyectoId: project.id } } },
            data: {
                coordenadasMasterplan: null,
                geoJSON: null,
                polygon: undefined as any,
                centerLat: null,
                centerLng: null,
            },
        });

        console.log(`  · Infraestructura borrada : ${infraDel.count}`);
        console.log(`  · ImagenMapa borrada      : ${imgDel.count}`);
        console.log(`  · Manzanas reseteadas     : ${manzUpd.count}`);
        console.log(`  · Unidades reseteadas     : ${unitUpd.count}`);
    });

    console.log("✅ Reset completado. Ahora podés volver a cargar el plano desde cero.");
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
