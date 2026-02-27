
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Attempt to count tasks - this will fail if the table doesn't exist
        const count = await prisma.tarea.count();
        console.log(`✅ Database ready. Found ${count} tasks.`);
    } catch (e: any) {
        if (e.code === 'P2021') {
            console.error('❌ Table not found. Please run "npx prisma db push"');
        } else {
            console.error('❌ Connection error:', e.message);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
