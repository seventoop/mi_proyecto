import { PrismaClient } from '@prisma/client';

async function checkDatabase() {
  const devPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      }
    }
  });

  try {
    console.log('🔍 Verificando conexión a BD de desarrollo...\n');
    
    // Probar conexión
    await devPrisma.$executeRaw`SELECT 1`;
    console.log('✓ Conexión a BD de desarrollo: OK\n');
    
    // Contar proyectos
    const count = await devPrisma.$queryRaw`SELECT COUNT(*) as count FROM "Proyecto"`;
    console.log(`📊 Proyectos en BD de desarrollo: ${count[0].count}`);
    
    // Listar proyectos
    const proyectos = await devPrisma.$queryRaw`SELECT id, nombre, slug FROM "Proyecto" LIMIT 10`;
    console.log('\n📋 Primeros proyectos:');
    proyectos.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nombre}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await devPrisma.$disconnect();
  }
}

checkDatabase();
