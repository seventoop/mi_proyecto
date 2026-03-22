export type SeedProjectCatalogItem = {
  nombre: string;
  slug: string;
  ubicacion: string;
  tipo: string;
  estado: string;
  mapCenterLat: number;
  mapCenterLng: number;
  imagenPortada: string;
  lotes: number;
};

export const seedProjectCatalog: SeedProjectCatalogItem[] = [
  {
    nombre: "Reserva Geodevia",
    slug: "reserva-geodevia",
    ubicacion: "Valle de Punilla, Cordoba, Argentina",
    tipo: "URBANIZACION",
    estado: "EN_VENTA",
    mapCenterLat: -31.4201,
    mapCenterLng: -64.1888,
    imagenPortada:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
    lotes: 24,
  },
  {
    nombre: "Barrio Los Alamos",
    slug: "barrio-los-alamos",
    ubicacion: "Cordoba, Argentina",
    tipo: "URBANIZACION",
    estado: "EN_VENTA",
    mapCenterLat: -31.3856,
    mapCenterLng: -64.232,
    imagenPortada:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2000&auto=format&fit=crop",
    lotes: 18,
  },
  {
    nombre: "Barrio Capinota",
    slug: "barrio-capinota",
    ubicacion: "Canuelas, Buenos Aires, Argentina",
    tipo: "URBANIZACION",
    estado: "PLANIFICACION",
    mapCenterLat: -34.7821,
    mapCenterLng: -58.6242,
    imagenPortada:
      "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=2000&auto=format&fit=crop",
    lotes: 20,
  },
  {
    nombre: "Villa del Lago",
    slug: "villa-del-lago",
    ubicacion: "Canuelas, Buenos Aires, Argentina",
    tipo: "URBANIZACION",
    estado: "EN_DESARROLLO",
    mapCenterLat: -34.8012,
    mapCenterLng: -58.6105,
    imagenPortada:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop",
    lotes: 22,
  },
  {
    nombre: "Chacras del Norte",
    slug: "chacras-del-norte",
    ubicacion: "Rafaela, Santa Fe, Argentina",
    tipo: "LOTEO",
    estado: "EN_DESARROLLO",
    mapCenterLat: -31.2533,
    mapCenterLng: -61.4867,
    imagenPortada:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2000&auto=format&fit=crop",
    lotes: 16,
  },
  {
    nombre: "Loteo San Martin",
    slug: "loteo-san-martin",
    ubicacion: "Maipu, Mendoza, Argentina",
    tipo: "LOTEO",
    estado: "ENTREGADO",
    mapCenterLat: -32.8908,
    mapCenterLng: -68.8272,
    imagenPortada:
      "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=2000&auto=format&fit=crop",
    lotes: 17,
  },
  {
    nombre: "Barrio Las Casuarinas",
    slug: "barrio-las-casuarinas",
    ubicacion: "Cordoba Capital, Argentina",
    tipo: "URBANIZACION",
    estado: "EN_VENTA",
    mapCenterLat: -31.4015,
    mapCenterLng: -64.211,
    imagenPortada:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=2000&auto=format&fit=crop",
    lotes: 19,
  },
];

if (require.main === module) {
  console.log("Use `npm run db:seed` to cargar el catalogo local de proyectos.");
  console.table(
    seedProjectCatalog.map((project) => ({
      nombre: project.nombre,
      slug: project.slug,
      lotes: project.lotes,
      estado: project.estado,
    })),
  );
}
