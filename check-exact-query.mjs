import { PrismaClient } from '@prisma/client';

async function checkQuery() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Simulando el query exacto de getProyectosDestacados()...\n');
    
    // El query exacto de la función
    const proyectos = await prisma.proyecto.findMany({
      where: {
        deletedAt: null,
        visibilityStatus: { not: "BORRADOR" },
        estado: { notIn: ["SUSPENDIDO", "CANCELADO", "ELIMINADO"] },
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        estado: true,
        tipo: true,
        imagenPortada: true,
        ubicacion: true,
        precioM2Mercado: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    console.log(`✓ Proyectos encontrados: ${proyectos.length}\n`);
    if (proyectos.length === 0) {
      console.log('❌ La aplicación no ve ningún proyecto!');
      console.log('\nDebug - Revisando todos los proyectos sin filtros:');
      
      const todas = await prisma.proyecto.findMany({
        select: { nombre, estado, visibilityStatus, deletedAt },
      });
      console.log(todas);
    } else {
      proyectos.forEach((p, i) => {
        console.log(`${i + 1}. ${p.nombre}`);
        console.log(`   slug: ${p.slug}`);
        console.log(`   estado: ${p.estado}`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuery();
