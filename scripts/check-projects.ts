
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const projects = await prisma.proyecto.findMany({
        select: { id: true, nombre: true, creadoPorId: true }
    })
    console.log(JSON.stringify(projects, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
