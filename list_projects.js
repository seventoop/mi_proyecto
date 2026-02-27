const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const projects = await prisma.proyecto.findMany({
            select: { id: true, nombre: true, slug: true }
        });
        console.log(JSON.stringify(projects, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
