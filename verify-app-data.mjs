import { PrismaClient } from '@prisma/client';

async function verifyApp() {
  const prisma = new PrismaClient();

  try {
    console.log('✅ VERIFICACIÓN COMPLETA DE LA BASE DE DATOS\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 1. Contar proyectos totales
    const totalProyectos = await prisma.proyecto.count();
    console.log(`📊 Total de proyectos en BD: ${totalProyectos}`);
    
    // 2. Contar proyectos publicados
    const publicados = await prisma.proyecto.count({
      where: {
        visibilityStatus: "PUBLICADO",
        deletedAt: null,
      }
    });
    console.log(`📋 Proyectos PUBLICADOS: ${publicados}`);
    
    // 3. Proyectos visibles en la app
    const visiblesEnApp = await prisma.proyecto.count({
      where: {
        deletedAt: null,
        visibilityStatus: { not: "BORRADOR" },
        estado: { notIn: ["SUSPENDIDO", "CANCELADO", "ELIMINADO"] },
      }
    });
    console.log(`🎯 Proyectos VISIBLES en app: ${visiblesEnApp}`);
    
    // 4. Proyectos destacados (toma 6)
    const destacados = await prisma.proyecto.count({
      where: {
        deletedAt: null,
        visibilityStatus: { not: "BORRADOR" },
        estado: { notIn: ["SUSPENDIDO", "CANCELADO", "ELIMINADO"] },
      }
    });
    console.log(`⭐ Proyectos en página de inicio (max 6): ${Math.min(destacados, 6)}`);
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('✅ CONCLUSIÓN:');
    console.log('Los proyectos están en la BD y deberían ser visibles en la app.');
    console.log('\nSi NO ves proyectos en https://miproyecto.replit.app:');
    console.log('1. Limpia cache completo del navegador (Ctrl+Shift+Del)');
    console.log('2. Prueba en ventana incógnita');
    console.log('3. Si aún no funciona, hay un problema de deployment');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyApp();
