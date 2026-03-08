const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const proyectos = await prisma.proyecto.findMany({
        select: { id: true, nombre: true, isDemo: true }
    });
    console.log('Current Projects:', JSON.stringify(proyectos, null, 2));

    const organizationCount = await prisma.organization.count();
    const userCount = await prisma.user.count();
    console.log('Organizations:', organizationCount);
    console.log('Users:', userCount);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
