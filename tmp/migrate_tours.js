const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log("Starting Tour360 migration...");

    const tours = await prisma.tour360.findMany({
        where: {
            escenas: { not: "[]" }
        },
        include: {
            scenes: true
        }
    });

    console.log(`Found ${tours.length} tours with legacy data.`);

    for (const tour of tours) {
        // If it already has scenes, skip to avoid duplicates (optional, based on your logic)
        if (tour.scenes.length > 0) {
            console.log(`Tour ${tour.id} already has relational scenes. Skipping.`);
            continue;
        }

        try {
            const escenas = JSON.parse(tour.escenas);
            console.log(`Migrating ${escenas.length} scenes for tour ${tour.id}...`);

            for (let i = 0; i < escenas.length; i++) {
                const s = escenas[i];
                const createdScene = await prisma.tourScene.create({
                    data: {
                        tourId: tour.id,
                        title: s.title || `Escena ${i + 1}`,
                        imageUrl: s.imageUrl,
                        isDefault: s.isDefault || i === 0,
                        order: s.order || i,
                        category: (s.category || 'raw').toUpperCase(),
                    }
                });

                if (s.hotspots && s.hotspots.length > 0) {
                    await prisma.hotspot.createMany({
                        data: s.hotspots.map(h => ({
                            sceneId: createdScene.id,
                            unidadId: h.unidadId, // Required
                            type: (h.type || 'info').toUpperCase(),
                            pitch: h.pitch || 0,
                            yaw: h.yaw || 0,
                            text: h.text || "",
                            targetSceneId: h.targetSceneId || null,
                        }))
                    });
                }
            }
            console.log(`Successfully migrated tour ${tour.id}`);
        } catch (e) {
            console.error(`Error migrating tour ${tour.id}:`, e);
        }
    }

    console.log("Migration finished.");
}

migrate()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
