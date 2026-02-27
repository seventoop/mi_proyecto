const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const project = await prisma.proyecto.findUnique({
        where: { slug: "residencial-valle-escondido" },
        select: { id: true, nombre: true }
    });
    console.log(JSON.stringify(project));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
