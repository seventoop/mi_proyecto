import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const project = await prisma.proyecto.findUnique({
        where: { slug: "reserva-geodevia" },
    });
    if (project) {
        console.log(`PROJECT_ID:${project.id}`);
    } else {
        console.log("PROJECT_NOT_FOUND");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
