import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const proyectosData = [
    {
      nombre: "Villa del Lago",
      slug: "villa-del-lago-buenos-aires",
      ubicacion: "Ruta 3 km 89, Cañuelas, Buenos Aires",
      estado: "EN_VENTA",
      tipo: "BARRIO_CERRADO",
      mapCenterLat: -34.8012,
      mapCenterLng: -58.6105,
      imagenPortada: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop",
    },
    {
      nombre: "Barrio Los Álamos",
      slug: "barrio-los-alamos",
      ubicacion: "Córdoba, Argentina",
      estado: "EN_VENTA",
      tipo: "URBANIZACION",
      mapCenterLat: -31.3856,
      mapCenterLng: -64.232,
      imagenPortada: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2000&auto=format&fit=crop",
    },
    {
      nombre: "Reserva Geodevia",
      slug: "reserva-geodevia",
      ubicacion: "Valle de Punilla, Córdoba, Argentina",
      estado: "EN_VENTA",
      tipo: "URBANIZACION",
      mapCenterLat: -31.4201,
      mapCenterLng: -64.1888,
      imagenPortada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
    },
    {
      nombre: "Chacras del Norte",
      slug: "chacras-del-norte-santa-fe",
      ubicacion: "Ruta Provincial 70 km 4, Rafaela, Santa Fe",
      estado: "PREVENTA",
      tipo: "CHACRA",
      mapCenterLat: -31.2533,
      mapCenterLng: -61.4867,
      imagenPortada: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2000&auto=format&fit=crop",
    },
    {
      nombre: "Barrio Las Casuarinas",
      slug: "barrio-las-casuarinas",
      ubicacion: "Av. Los Plátanos 1200, Corralejo, Córdoba",
      estado: "EN_VENTA",
      tipo: "URBANIZACION",
      mapCenterLat: -31.4015,
      mapCenterLng: -64.211,
      imagenPortada: "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=2000&auto=format&fit=crop",
    },
    {
      nombre: "Barrio Capinota",
      slug: "barrio-capinota",
      ubicacion: "Capinota, Cochabamba, Bolivia",
      estado: "EN_VENTA",
      tipo: "URBANIZACION",
      mapCenterLat: -34.7821,
      mapCenterLng: -58.6242,
      imagenPortada: "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=2000&auto=format&fit=crop",
    },
    {
      nombre: "Loteo San Martín",
      slug: "loteo-san-martin-mendoza",
      ubicacion: "Calle Sarmiento 450, Maipú, Mendoza",
      estado: "EN_VENTA",
      tipo: "URBANIZACION",
      mapCenterLat: -32.8908,
      mapCenterLng: -68.8272,
      imagenPortada: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=2000&auto=format&fit=crop",
    },
  ];

  try {
    console.log('🔄 Insertando proyectos en la base de datos...\n');

    for (const proyecto of proyectosData) {
      const existe = await prisma.proyecto.findUnique({
        where: { slug: proyecto.slug },
      });

      if (!existe) {
        await prisma.proyecto.create({
          data: proyecto,
        });
        console.log(`✓ ${proyecto.nombre}`);
      } else {
        console.log(`⊘ ${proyecto.nombre} (ya existe)`);
      }
    }

    const total = await prisma.proyecto.count();
    console.log(`\n✅ Total de proyectos en BD: ${total}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
