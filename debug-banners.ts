import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const banners = await prisma.banner.findMany();
        console.log("TOTAL_BANNERS_COUNT:", banners.length);
        console.log("ACTIVE_BANNERS_COUNT:", banners.filter(b => b.estado === 'ACTIVO').length);
        console.log("DATA:", JSON.stringify(banners.slice(0, 5), null, 2));
    } catch (e) {
        console.error("PRISMA_ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
