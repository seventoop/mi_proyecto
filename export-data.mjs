import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Solo obtener proyectos básicos primero
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        nombre: true,
        slug: true,
        ubicacion: true,
        estado: true,
        tipo: true,
      },
    });
    
    console.log('=== PROYECTOS EN BD DE DESARROLLO ===');
    console.log(JSON.stringify(proyectos, null, 2));
    console.log(`\nTotal: ${proyectos.length} proyectos`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
