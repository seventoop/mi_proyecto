const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    try {
        const project = await prisma.proyecto.findUnique({
            where: { slug: "reserva-geodevia" }
        });
        if (project) {
            fs.writeFileSync('id_output.txt', project.id);
            console.log("ID_WRITTEN");
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
