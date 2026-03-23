import { PrismaClient } from '@prisma/client';

async function testConnection() {
  console.log('🔍 Testeando conexión a la BD...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***configurada***' : '❌ NO CONFIGURADA');
  
  try {
    const prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
    
    // Intentar conexión
    const test = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ Conexión a BD: OK');
    
    // Contar proyectos
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "proyectos"`;
    console.log(`✓ Proyectos en BD: ${count[0].count}`);
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    if (err.message.includes('connect ECONNREFUSED')) {
      console.log('\n⚠️ La BD no está accesible desde aquí');
    }
  }
}

testConnection();
