/**
 * scripts/clean-planos.ts
 *
 * DESTRUCTIVE: nullifies masterplanSVG, overlayUrl, overlayBounds,
 * overlayRotation, planGallery on every project.
 *
 * Use only when you want to wipe all uploaded plans and re-upload from scratch.
 *
 * Usage:
 *   # dry run (default) — prints what would change, no writes
 *   npx tsx scripts/clean-planos.ts
 *
 *   # actually wipe (must pass --confirm AND --i-know-what-im-doing)
 *   npx tsx scripts/clean-planos.ts --confirm --i-know-what-im-doing
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const args = new Set(process.argv.slice(2));
    const confirm = args.has("--confirm") && args.has("--i-know-what-im-doing");

    const projects = await prisma.proyecto.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            slug: true,
            nombre: true,
            masterplanSVG: true,
            overlayUrl: true,
            overlayBounds: true,
            overlayRotation: true,
            planGallery: true,
        },
    });

    let touched = 0;
    for (const p of projects) {
        let galleryCount = 0;
        if (p.planGallery) {
            try {
                galleryCount = (JSON.parse(p.planGallery) as any[]).length;
            } catch {}
        }
        const summary = {
            slug: p.slug,
            nombre: p.nombre,
            svgKB: p.masterplanSVG ? Math.round(p.masterplanSVG.length / 1024) : 0,
            hasOverlayUrl: !!p.overlayUrl,
            hasBounds: !!p.overlayBounds,
            rotation: p.overlayRotation,
            planGalleryCount: galleryCount,
        };
        const willClear =
            !!p.masterplanSVG ||
            !!p.overlayUrl ||
            !!p.overlayBounds ||
            !!p.overlayRotation ||
            !!p.planGallery;

        console.log(
            `${willClear ? "[WILL CLEAR]" : "[skip empty]"} ${JSON.stringify(summary)}`
        );

        if (willClear) touched++;

        if (confirm && willClear) {
            await prisma.proyecto.update({
                where: { id: p.id },
                data: {
                    masterplanSVG: null,
                    overlayUrl: null,
                    overlayBounds: null,
                    overlayRotation: 0,
                    planGallery: null,
                },
            });
        }
    }

    console.log(`\nProjects scanned: ${projects.length}`);
    console.log(`Projects with plan data to clear: ${touched}`);
    console.log(
        confirm
            ? "✅ Cleared. Re-upload masterplans from the dashboard."
            : "ℹ Dry run only. Pass --confirm --i-know-what-im-doing to actually wipe."
    );

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
