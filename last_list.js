const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const projects = await prisma.proyecto.findMany();
        console.log("PROJECTS_START");
        projects.forEach(p => {
            console.log(`ID: ${p.id}, SLUG: ${p.slug}, NAME: ${p.nombre}`);
        });
        console.log("PROJECTS_END");
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
