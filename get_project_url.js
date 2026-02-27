const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        const project = await prisma.proyecto.findUnique({
            where: { slug: "reserva-geodevia" },
        });

        if (project) {
            console.log(`PROJECT_ID:${project.id}`);
        } else {
            console.log("PROJECT_NOT_FOUND");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
