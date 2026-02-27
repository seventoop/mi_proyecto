import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const count = await prisma.banner.count()
    console.log('Banner count:', count)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
