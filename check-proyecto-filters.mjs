import { PrismaClient } from '@prisma/client';

async function checkFilters() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando valores de filtro en proyectos...\n');
    
    const proyectos = await prisma.$queryRaw`
      SELECT 
        nombre, 
        estado, 
        "visibilityStatus", 
        "deletedAt"
      FROM "proyectos"
    `;
    
    console.log('Estado de cada proyecto:');
    console.log('─────────────────────────────────────────────────────');
    proyectos.forEach((p, i) => {
      console.log(`${i + 1}. ${p.nombre}`);
      console.log(`   estado: ${p.estado}`);
      console.log(`   visibilityStatus: ${p.visibilityStatus}`);
      console.log(`   deletedAt: ${p.deletedAt}`);
      console.log('');
    });

    // Simular el query de la app publicada
    console.log('\n📋 Simulando el query de la aplicación...');
    const visibleProyectos = await prisma.$queryRaw`
      SELECT nombre, estado 
      FROM "proyectos" 
      WHERE "deletedAt" IS NULL 
        AND "visibilityStatus" <> 'OCULTO'
        AND "estado" NOT IN ('CANCELADO', 'BORRADOR', 'PAUSADO')
    `;
    
    console.log(`\n✓ Proyectos VISIBLES en la app: ${visibleProyectos.length}`);
    visibleProyectos.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nombre}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFilters();
