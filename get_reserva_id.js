const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const project = await prisma.proyecto.findUnique({
            where: { slug: "reserva-geodevia" }
        });
        if (project) {
            console.log("PROJECT_ID:" + project.id);
            console.log("PROJECT_NAME:" + project.nombre);
        } else {
            console.log("PROJECT_NOT_FOUND");
        }
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
