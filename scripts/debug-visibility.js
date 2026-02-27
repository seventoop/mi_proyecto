const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.proyecto.count();
    console.log(`Total projects: ${count}`);

    const projects = await prisma.proyecto.findMany({
        select: { id: true, nombre: true, creadoPorId: true, visibilityStatus: true, estado: true }
    });
    console.log('Projects list:');
    projects.forEach(p => console.log(`- ${p.nombre} (${p.id}) | Creator: ${p.creadoPorId} | Status: ${p.estado} | Visible: ${p.visibilityStatus}`));

    const users = await prisma.user.findMany({ select: { id: true, email: true, rol: true } });
    console.log('Users list:');
    users.forEach(u => console.log(`- ${u.email} (${u.rol}) | ID: ${u.id}`));

    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
