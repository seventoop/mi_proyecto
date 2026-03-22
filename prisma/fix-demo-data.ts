import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const capinotaId = "cmn1bohka00007natajuqb8zt";

  // Delete existing etapas for capinota
  await prisma.etapa.deleteMany({ where: { proyectoId: capinotaId } });

  const masterplanSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="600" y="55" font-size="16" font-family="Arial,sans-serif" fill="#f1f5f9" text-anchor="middle" font-weight="bold">Barrio Capinota</text>
  <text x="600" y="73" font-size="10" font-family="Arial,sans-serif" fill="#64748b" text-anchor="middle">Plano de Loteo — Referencia</text>
  <line x1="60" y1="305" x2="740" y2="305" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/>
  <text x="400" y="318" font-size="9" font-family="Arial,sans-serif" fill="#94a3b8" text-anchor="middle">Av. Principal Capinota</text>
  <line x1="400" y1="90" x2="400" y2="305" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round"/>
  <rect x="60" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-01" data-area="300.00"/>
  <rect x="120" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-02" data-area="320.00"/>
  <rect x="180" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-03" data-area="340.00"/>
  <rect x="240" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-04" data-area="360.00"/>
  <rect x="300" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-05" data-area="380.00"/>
  <rect x="60" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-06" data-area="300.00"/>
  <rect x="120" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-07" data-area="320.00"/>
  <rect x="180" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-08" data-area="340.00"/>
  <rect x="240" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-09" data-area="360.00"/>
  <rect x="300" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="A-10" data-area="380.00"/>
  <rect x="420" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-01" data-area="310.00"/>
  <rect x="480" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-02" data-area="328.00"/>
  <rect x="540" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-03" data-area="346.00"/>
  <rect x="600" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-04" data-area="364.00"/>
  <rect x="660" y="95" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-05" data-area="382.00"/>
  <rect x="420" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-06" data-area="310.00"/>
  <rect x="480" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-07" data-area="328.00"/>
  <rect x="540" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-08" data-area="346.00"/>
  <rect x="600" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-09" data-area="364.00"/>
  <rect x="660" y="182" width="58" height="85" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="B-10" data-area="382.00"/>
  <text x="185" y="83" font-size="12" font-family="Arial,sans-serif" fill="#64748b" text-anchor="middle" font-weight="bold">Manzana A</text>
  <text x="550" y="83" font-size="12" font-family="Arial,sans-serif" fill="#64748b" text-anchor="middle" font-weight="bold">Manzana B</text>
  <g transform="translate(1160, 40)">
    <circle cx="0" cy="0" r="16" fill="none" stroke="#475569" stroke-width="1.5"/>
    <polygon points="0,-12 4,5 0,2 -4,5" fill="#f97316"/>
    <text x="0" y="26" font-size="9" font-family="Arial,sans-serif" fill="#94a3b8" text-anchor="middle">N</text>
  </g>
</svg>`;

  await prisma.proyecto.update({
    where: { id: capinotaId },
    data: {
      masterplanSVG,
      precioM2Inversor: 40,
      precioM2Mercado: 55,
      mapCenterLat: -17.4506,
      mapCenterLng: -66.2774,
      mapZoom: 16,
    } as any
  });

  const etapa = await prisma.etapa.create({
    data: { proyectoId: capinotaId, nombre: "Etapa 1", orden: 1, estado: "EN_CURSO" }
  });

  const lotesA = Array.from({length: 10}, (_, i) => {
    const estados = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","VENDIDA","VENDIDA"];
    return { numero: `A-${String(i+1).padStart(2,"0")}`, tipo: "LOTE", superficie: 300 + i*20, frente: 10 + (i%3), fondo: 28, precio: 15000 + i*2000, estado: estados[i], moneda: "USD", esEsquina: i === 0 || i === 9 };
  });
  const lotesB = Array.from({length: 10}, (_, i) => {
    const estados = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","RESERVADA","VENDIDA","DISPONIBLE","DISPONIBLE","DISPONIBLE"];
    return { numero: `B-${String(i+1).padStart(2,"0")}`, tipo: "LOTE", superficie: 310 + i*18, frente: 10 + (i%3), fondo: 29, precio: 16000 + i*1800, estado: estados[i], moneda: "USD", esEsquina: i === 0 || i === 9 };
  });

  await prisma.manzana.create({ data: { etapaId: etapa.id, nombre: "Manzana A", unidades: { create: lotesA as any } } });
  await prisma.manzana.create({ data: { etapaId: etapa.id, nombre: "Manzana B", unidades: { create: lotesB as any } } });
  console.log("✅ Capinota: masterplan + 20 lotes creados");

  // Gallery images for all projects
  const galerias: { id: string; nombre: string; imgs: { url: string; categoria: string; esPrincipal: boolean; orden: number }[] }[] = [
    { id: "cmmtx7u1a0003lkgtsx73abw4", nombre: "Barrio Los Álamos", imgs: [
      { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "RENDER", esPrincipal: true, orden: 1 },
      { url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 2 },
      { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 3 },
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
      { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
    ]},
    { id: "cmmtx7u2b0008lkgtp2jr7yy6", nombre: "Reserva Geodevia", imgs: [
      { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "RENDER", esPrincipal: true, orden: 1 },
      { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 2 },
      { url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 3 },
      { url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
      { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", categoria: "MASTERPLAN", esPrincipal: false, orden: 6 },
    ]},
    { id: "cmn17kl8t000b12c7ydytv95v", nombre: "Barrio Las Casuarinas", imgs: [
      { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "RENDER", esPrincipal: true, orden: 1 },
      { url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 2 },
      { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 3 },
      { url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
    ]},
    { id: "cmn17klcv001z12c7e4wf59to", nombre: "Loteo San Martín", imgs: [
      { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "RENDER", esPrincipal: true, orden: 1 },
      { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 2 },
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 3 },
      { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
    ]},
    { id: "cmn17klfo003d12c7zx9y9waq", nombre: "Chacras del Norte", imgs: [
      { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "RENDER", esPrincipal: true, orden: 1 },
      { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 2 },
      { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 3 },
      { url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
    ]},
    { id: "cmn17klhr004f12c72nqx7sky", nombre: "Villa del Lago", imgs: [
      { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", categoria: "RENDER", esPrincipal: true, orden: 1 },
      { url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 2 },
      { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 3 },
      { url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80", categoria: "INTERIOR", esPrincipal: false, orden: 4 },
      { url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
      { url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1200&q=80", categoria: "MASTERPLAN", esPrincipal: false, orden: 6 },
    ]},
    { id: "cmn1bohka00007natajuqb8zt", nombre: "Barrio Capinota", imgs: [
      { url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80", categoria: "RENDER", esPrincipal: true, orden: 1 },
      { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 2 },
      { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "EXTERIOR", esPrincipal: false, orden: 3 },
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
      { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
    ]},
  ];

  for (const g of galerias) {
    await prisma.proyectoImagen.deleteMany({ where: { proyectoId: g.id } });
    await prisma.proyectoImagen.createMany({
      data: g.imgs.map(img => ({ ...img, proyectoId: g.id }))
    });
    console.log(`✅ ${g.nombre}: ${g.imgs.length} imágenes en galería`);
  }

  console.log("\n✅ Fix completo!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
