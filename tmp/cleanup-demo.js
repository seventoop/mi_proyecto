const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando limpieza controlada de datos de proyectos ---');

    try {
        // Orden de eliminación para respetar integridad referencial y cascading

        console.log('1. Eliminando Historial, Reservas y Hotspots...');
        await prisma.historialUnidad.deleteMany({});
        await prisma.reserva.deleteMany({});

        console.log('2. Eliminando Hotspots de Tour...');
        await prisma.hotspot.deleteMany({});

        console.log('3. Eliminando Escenas y Tours...');
        await prisma.tourScene.deleteMany({});
        await prisma.tour360.deleteMany({});

        console.log('4. Eliminando Mensajes de Leads, Tareas y Oportunidades...');
        await prisma.leadMessage.deleteMany({});
        await prisma.tarea.deleteMany({});
        await prisma.oportunidad.deleteMany({});

        console.log('5. Eliminando Leads...');
        await prisma.lead.deleteMany({});

        console.log('6. Eliminando Inversiones e Hitos Escrow...');
        await prisma.inversion.deleteMany({});
        await prisma.escrowMilestone.deleteMany({});

        console.log('7. Eliminando Archivos, Imágenes, Testimonios y Documentación...');
        await prisma.proyectoArchivo.deleteMany({});
        await prisma.proyectoImagen.deleteMany({});
        await prisma.testimonio.deleteMany({});
        await prisma.documentacion.deleteMany({});

        console.log('8. Eliminando Pagos asociados a proyectos...');
        await prisma.pago.deleteMany({
            where: {
                proyectoId: { not: null }
            }
        });

        console.log('9. Eliminando Unidades, Manzanas y Etapas...');
        await prisma.unidad.deleteMany({});
        await prisma.manzana.deleteMany({});
        await prisma.etapa.deleteMany({});

        console.log('10. Eliminando Proyectos...');
        const deletedProjects = await prisma.proyecto.deleteMany({});

        console.log(`\n✅ LIMPIEZA COMPLETADA CON ÉXITO.`);
        console.log(`Proyectos eliminados: ${deletedProjects.count}`);
        console.log(`El sistema está limpio para empezar de cero.`);

    } catch (error) {
        console.error('❌ ERROR DURANTE LA LIMPIEZA:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
