import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const proyectos = await prisma.proyecto.findMany({
            take: 5
        });
        console.log("DESTACADOS_COUNT:", proyectos.length);
        console.log("PROYECTO_DATA:", JSON.stringify(proyectos.map(p => ({
            id: p.id,
            titulo: p.nombre,
            mediaUrl: (p as any).imagenPrincipal || (p as any).portadaUrl || "no-media"
        })), null, 2));
    } catch (e) {
        console.error("PRISMA_ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
