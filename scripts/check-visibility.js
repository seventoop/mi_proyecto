const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const project = await prisma.proyecto.findUnique({
        where: { slug: "residencial-valle-escondido" }
    });
    console.log(JSON.stringify(project, null, 2));

    // Also check raw values for visibilityStatus, isDemo, etc.
    const raw = await prisma.$queryRaw`SELECT "visibilityStatus", "isDemo", "demoExpiresAt", "estado" FROM proyectos WHERE slug = 'residencial-valle-escondido'`;
    console.log('RAW DB VALUES:', JSON.stringify(raw, null, 2));

    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
