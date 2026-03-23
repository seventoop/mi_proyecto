import { PrismaClient } from '@prisma/client';

// Crear cliente para desarrollo
const devPrisma = new PrismaClient();

// Los mismos 7 proyectos que obtuvimos
const proyectos = [
  {
    "nombre": "Villa del Lago",
    "slug": "villa-del-lago-buenos-aires",
    "ubicacion": "Ruta 3 km 89, Cañuelas, Buenos Aires",
    "estado": "EN_VENTA",
    "tipo": "BARRIO_CERRADO"
  },
  {
    "nombre": "Barrio Los Álamos",
    "slug": "barrio-los-alamos",
    "ubicacion": "Córdoba, Argentina",
    "estado": "EN_VENTA",
    "tipo": "URBANIZACION"
  },
  {
    "nombre": "Reserva Geodevia",
    "slug": "reserva-geodevia",
    "ubicacion": "Valle de Punilla, Córdoba, Argentina",
    "estado": "EN_VENTA",
    "tipo": "URBANIZACION"
  },
  {
    "nombre": "Chacras del Norte",
    "slug": "chacras-del-norte-santa-fe",
    "ubicacion": "Ruta Provincial 70 km 4, Rafaela, Santa Fe",
    "estado": "PREVENTA",
    "tipo": "CHACRA"
  },
  {
    "nombre": "Barrio Las Casuarinas",
    "slug": "barrio-las-casuarinas",
    "ubicacion": "Av. Los Plátanos 1200, Corralejo, Córdoba",
    "estado": "EN_VENTA",
    "tipo": "URBANIZACION"
  },
  {
    "nombre": "Barrio Capinota",
    "slug": "barrio-capinota",
    "ubicacion": "Capinota, Cochabamba, Bolivia",
    "estado": "EN_VENTA",
    "tipo": "URBANIZACION"
  },
  {
    "nombre": "Loteo San Martín",
    "slug": "loteo-san-martin-mendoza",
    "ubicacion": "Calle Sarmiento 450, Maipú, Mendoza",
    "estado": "EN_VENTA",
    "tipo": "URBANIZACION"
  }
];

async function main() {
  try {
    console.log('✓ Conexión a BD de desarrollo exitosa');
    console.log(`✓ Encontrados ${proyectos.length} proyectos para sincronizar`);
    console.log('\nProyectos a sincronizar:');
    proyectos.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.nombre} (${p.slug})`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await devPrisma.$disconnect();
  }
}

main();
