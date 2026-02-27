const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, rol: true }
    });
    console.log('USERS IN DB:');
    users.forEach(u => console.log(`- ${u.email} (${u.rol})`));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
