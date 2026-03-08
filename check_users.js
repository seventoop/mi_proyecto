const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({ select: { email: true } });
        console.log("Emails in DB:");
        users.forEach(u => console.log("- " + u.email));
        const dany = users.find(u => u.email === 'dany76162@gmail.com');
        console.log("\nExists dany76162@gmail.com:", !!dany);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
