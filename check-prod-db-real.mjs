import { PrismaClient } from '@prisma/client';

async function checkDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      }
    }
  });

  try {
    console.log('🔍 Verificando BD conectada...\n');
    
    // Probar conexión
    await prisma.$executeRaw`SELECT 1`;
    console.log('✓ Conexión OK\n');
    
    // Contar proyectos
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "proyectos"`;
    console.log(`📊 Total de proyectos en BD: ${count[0].count}`);
    
    if (count[0].count > 0) {
      // Listar proyectos
      const proyectos = await prisma.$queryRaw`SELECT id, nombre, slug FROM "proyectos" LIMIT 10`;
      console.log('\n📋 Proyectos encontrados:');
      proyectos.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.nombre}`);
      });
    } else {
      console.log('\n⚠️ La BD está VACÍA - No hay proyectos');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
