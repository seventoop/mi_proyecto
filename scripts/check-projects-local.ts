import { config as loadEnv } from "dotenv";
import prisma from "../lib/db";

loadEnv({ path: ".env.local", override: true });
loadEnv();

async function main() {
    const proyectos = await prisma.proyecto.findMany({
        select: {
            id: true,
            nombre: true,
            slug: true,
            estado: true,
            visibilityStatus: true,
            deletedAt: true,
            createdAt: true,
            orgId: true,
            imagenPortada: true,
            overlayUrl: true,
            masterplanSVG: true,
        },
        orderBy: { createdAt: "desc" },
    });

    console.log(JSON.stringify(proyectos, null, 2));
}

main()
    .catch((error) => {
        console.error("[check-projects-local] error");
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
