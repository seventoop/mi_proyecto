const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const id = 'cmm1c5s8m0003p55ymi';
    try {
        const project = await prisma.proyecto.findUnique({
            where: { id }
        });
        console.log("PROJECT_FOUND:" + (project ? "YES" : "NO"));
        if (project) console.log("NAME:" + project.nombre);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
