
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    let tourCount = 0;
    let legacyWithData = 0;
    let legacyExists = false;

    try {
        tourCount = await prisma.tour360.count();

        const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'tours_360' AND column_name = 'escenas'`;
        legacyExists = result.length > 0;

        if (legacyExists) {
            // Count how many tours have non-empty 'escenas'
            const toursWithData = await prisma.$queryRaw`SELECT count(*) FROM tours_360 WHERE escenas IS NOT NULL AND escenas != '[]' AND escenas != ''`;
            legacyWithData = Number(toursWithData[0].count);
        }
    } catch (e) {
        console.error("Audit error:", e.message);
    }

    console.log(JSON.stringify({
        tourCount,
        legacyExists,
        legacyWithData
    }, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
