/**
 * Seed de ejemplos ricos para auditar el flujo Proyecto -> Masterplan -> Lotes.
 *
 * Dry-run por defecto:
 *   npm run seed:elpampa-projects:dry-run
 *
 * Escritura explicita:
 *   npm run seed:elpampa-projects:apply
 *
 * No borra datos ajenos. Solo crea/actualiza proyectos con slugs controlados.
 */

import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true });
loadEnv();

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply") || process.env.APPLY === "true";
const ORG_ID = "seventoop-main";
const OPERATOR_EMAIL = "elpampa-demo@seventoop.local";

type LotStatus = "DISPONIBLE" | "RESERVADO" | "VENDIDO" | "BLOQUEADO";

type LotSeed = {
  numero: string;
  etapa: string;
  manzana: string;
  row: number;
  col: number;
  estado: LotStatus;
  superficie: number;
  frente: number;
  fondo: number;
  precio: number;
};

type ProjectSeed = {
  slug: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  tipo: string;
  mapCenterLat: number;
  mapCenterLng: number;
  overlayBounds: [[number, number], [number, number]];
  imageUrl: string;
  lots: LotSeed[];
  infrastructures: Array<{
    nombre: string;
    categoria: string;
    tipo: string;
    geometriaTipo: string;
    coordenadas: Array<[number, number]>;
    estado: string;
    porcentajeAvance: number;
    descripcion: string;
    colorPersonalizado: string;
  }>;
};

function maskUrl(url: string | undefined) {
  if (!url) return "(no DATABASE_URL)";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username ? "***@" : ""}${parsed.hostname}:${parsed.port || "?"}${parsed.pathname}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

function makeLots(options: {
  stages: number;
  blocksPerStage: number;
  lotsPerBlock: number;
  prefix: string;
  basePrice: number;
  baseSurface: number;
}) {
  const lots: LotSeed[] = [];
  for (let stage = 1; stage <= options.stages; stage++) {
    for (let block = 1; block <= options.blocksPerStage; block++) {
      for (let n = 1; n <= options.lotsPerBlock; n++) {
        const globalIndex =
          (stage - 1) * options.blocksPerStage * options.lotsPerBlock +
          (block - 1) * options.lotsPerBlock +
          n;
        const estado: LotStatus =
          globalIndex % 13 === 0 ? "BLOQUEADO" :
          globalIndex % 7 === 0 ? "VENDIDO" :
          globalIndex % 5 === 0 ? "RESERVADO" :
          "DISPONIBLE";

        lots.push({
          numero: `${options.prefix}${stage}-${String(block).padStart(2, "0")}-${String(n).padStart(3, "0")}`,
          etapa: `Etapa ${stage}`,
          manzana: `Manzana ${String.fromCharCode(64 + block)}`,
          row: stage * 4 + block,
          col: n,
          estado,
          superficie: options.baseSurface + (n % 4) * 35,
          frente: 12 + (n % 3),
          fondo: 32 + (n % 5),
          precio: options.basePrice + globalIndex * 1250,
        });
      }
    }
  }
  return lots;
}

function lotPath(lot: LotSeed) {
  const w = 34;
  const h = 56;
  const gapX = 8;
  const gapY = 14;
  const x = 80 + (lot.col - 1) * (w + gapX);
  const y = 70 + lot.row * (h + gapY);
  return {
    path: `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`,
    center: { x: x + w / 2, y: y + h / 2 },
  };
}

function buildMasterplanSvg(project: ProjectSeed) {
  const statusFill: Record<LotStatus, string> = {
    DISPONIBLE: "rgba(16,185,129,0.22)",
    RESERVADO: "rgba(245,158,11,0.28)",
    VENDIDO: "rgba(239,68,68,0.24)",
    BLOQUEADO: "rgba(100,116,139,0.24)",
  };
  const lots = project.lots.map((lot, index) => {
    const geom = lotPath(lot);
    return `<path data-lot="${lot.numero}" data-area="${lot.superficie}" d="${geom.path}" fill="${statusFill[lot.estado]}" stroke="#0f172a" stroke-width="1" vector-effect="non-scaling-stroke" />
<text x="${geom.center.x}" y="${geom.center.y}" text-anchor="middle" dominant-baseline="central" font-size="8" fill="#0f172a" font-family="Arial" font-weight="700">${index + 1}</text>`;
  }).join("\n");

  const meta = {
    sourceKind: "svg",
    sourceName: `${project.slug}.svg`,
    processingMode: "detected-lots",
    warnings: ["Masterplan sintetico de prueba creado por El Pampa; no representa mensura real."],
    detectedPaths: project.lots.length,
    detectedLots: project.lots.length,
    savedAt: new Date().toISOString(),
  };

  return `<!--SEVENTOOP_BLUEPRINT_META:${JSON.stringify(meta)}-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 980">
<rect width="920" height="980" fill="#f8fafc" />
<path d="M 48 54 L 870 54 L 845 925 L 58 900 Z" fill="#e2e8f0" stroke="#64748b" stroke-width="3" />
<path d="M 70 180 L 850 180" stroke="#475569" stroke-width="10" stroke-linecap="round" />
<path d="M 70 460 L 850 460" stroke="#475569" stroke-width="10" stroke-linecap="round" />
<path d="M 70 740 L 850 740" stroke="#475569" stroke-width="10" stroke-linecap="round" />
<rect x="690" y="90" width="120" height="70" rx="8" fill="#bae6fd" stroke="#0284c7" />
<text x="750" y="128" text-anchor="middle" font-size="14" font-family="Arial" fill="#075985">Club house</text>
${lots}
</svg>`;
}

function projectSeeds(): ProjectSeed[] {
  return [
    {
      slug: "valles-del-pino-demo",
      nombre: "Valles del Pino Demo",
      descripcion:
        "Barrio privado de escala mayor inspirado en loteos argentinos de gran superficie. La muestra reduce el volumen real a 36 lotes para probar etapas, inventario, masterplan, fotos aereas e infraestructura sin cargar miles de filas.",
      ubicacion: "Zona norte de Buenos Aires, Argentina",
      tipo: "URBANIZACION",
      mapCenterLat: -34.4587,
      mapCenterLng: -58.9142,
      overlayBounds: [[-34.4642, -58.9212], [-34.4532, -58.9072]],
      imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
      lots: makeLots({ stages: 3, blocksPerStage: 2, lotsPerBlock: 6, prefix: "VP", basePrice: 42000, baseSurface: 510 }),
      infrastructures: [
        {
          nombre: "Acceso principal",
          categoria: "accesos",
          tipo: "portico",
          geometriaTipo: "point",
          coordenadas: [[-34.4601, -58.9182]],
          estado: "en_obra",
          porcentajeAvance: 35,
          descripcion: "Portal de ingreso con control y preinstalacion de seguridad.",
          colorPersonalizado: "#f97316",
        },
        {
          nombre: "Avenida central",
          categoria: "vial",
          tipo: "calle_principal",
          geometriaTipo: "line",
          coordenadas: [[-34.4635, -58.919], [-34.454, -58.909]],
          estado: "planificado",
          porcentajeAvance: 10,
          descripcion: "Eje vial que conecta las tres etapas del desarrollo.",
          colorPersonalizado: "#64748b",
        },
      ],
    },
    {
      slug: "campo-la-reserva-demo",
      nombre: "Campo La Reserva Demo",
      descripcion:
        "Loteo rural premium pensado para validar carga comercial, planos simples, estados de lotes, imagenes de mapa y recorridos 360 de baja complejidad.",
      ubicacion: "Canelones, Uruguay",
      tipo: "URBANIZACION",
      mapCenterLat: -34.522,
      mapCenterLng: -56.286,
      overlayBounds: [[-34.527, -56.292], [-34.517, -56.279]],
      imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2000&auto=format&fit=crop",
      lots: makeLots({ stages: 2, blocksPerStage: 2, lotsPerBlock: 6, prefix: "CR", basePrice: 36000, baseSurface: 620 }),
      infrastructures: [
        {
          nombre: "Plaza central",
          categoria: "amenities",
          tipo: "plaza",
          geometriaTipo: "polygon",
          coordenadas: [[-34.523, -56.287], [-34.522, -56.285], [-34.521, -56.287]],
          estado: "planificado",
          porcentajeAvance: 0,
          descripcion: "Area verde comun para validar dibujo de espacios publicos.",
          colorPersonalizado: "#22c55e",
        },
      ],
    },
  ];
}

async function ensureOrgAndOperator() {
  const org = await prisma.organization.upsert({
    where: { slug: "seventoop" },
    update: { nombre: "Seventoop" },
    create: { id: ORG_ID, slug: "seventoop", nombre: "Seventoop", plan: "FREE" },
  });

  const user = await prisma.user.upsert({
    where: { email: OPERATOR_EMAIL },
    update: {
      nombre: "El Pampa Demo Operator",
      rol: "ADMIN",
      orgId: org.id,
      kycStatus: "VERIFICADO",
      developerVerified: true,
    },
    create: {
      email: OPERATOR_EMAIL,
      nombre: "El Pampa Demo Operator",
      rol: "ADMIN",
      orgId: org.id,
      kycStatus: "VERIFICADO",
      developerVerified: true,
    },
  });

  return { org, user };
}

async function upsertProject(seed: ProjectSeed, userId: string, orgId: string) {
  const masterplanSVG = buildMasterplanSvg(seed);
  const project = await prisma.proyecto.upsert({
    where: { slug: seed.slug },
    update: {
      nombre: seed.nombre,
      descripcion: seed.descripcion,
      ubicacion: seed.ubicacion,
      estado: "EN_VENTA",
      tipo: seed.tipo,
      imagenPortada: seed.imageUrl,
      masterplanSVG,
      mapCenterLat: seed.mapCenterLat,
      mapCenterLng: seed.mapCenterLng,
      mapZoom: 16,
      overlayBounds: JSON.stringify(seed.overlayBounds),
      overlayRotation: 0,
      visibilityStatus: "PUBLICADO",
      deletedAt: null,
      isDemo: false,
      requireKyc: true,
      estadoValidacion: "APROBADO",
      puedePublicarse: true,
      puedeReservarse: true,
      puedeCaptarLeads: true,
      orgId,
      creadoPorId: userId,
      aiKnowledgeBase: `${seed.nombre}: ${seed.descripcion}`,
      aiSystemPrompt: `Responde como asesor comercial de ${seed.nombre}. Prioriza disponibilidad, ubicacion, medidas y pasos para consulta o reserva.`,
    },
    create: {
      slug: seed.slug,
      nombre: seed.nombre,
      descripcion: seed.descripcion,
      ubicacion: seed.ubicacion,
      estado: "EN_VENTA",
      tipo: seed.tipo,
      imagenPortada: seed.imageUrl,
      masterplanSVG,
      mapCenterLat: seed.mapCenterLat,
      mapCenterLng: seed.mapCenterLng,
      mapZoom: 16,
      overlayBounds: JSON.stringify(seed.overlayBounds),
      overlayRotation: 0,
      visibilityStatus: "PUBLICADO",
      isDemo: false,
      requireKyc: true,
      estadoValidacion: "APROBADO",
      puedePublicarse: true,
      puedeReservarse: true,
      puedeCaptarLeads: true,
      orgId,
      creadoPorId: userId,
      aiKnowledgeBase: `${seed.nombre}: ${seed.descripcion}`,
      aiSystemPrompt: `Responde como asesor comercial de ${seed.nombre}. Prioriza disponibilidad, ubicacion, medidas y pasos para consulta o reserva.`,
    },
  });

  await prisma.proyectoUsuario.upsert({
    where: { proyectoId_userId: { proyectoId: project.id, userId } },
    update: {
      orgId,
      tipoRelacion: "OWNER",
      estadoRelacion: "ACTIVA",
      permisoEditarProyecto: true,
      permisoSubirDocumentacion: true,
      permisoVerLeadsGlobales: true,
      permisoVerMetricasGlobales: true,
    },
    create: {
      proyectoId: project.id,
      userId,
      orgId,
      tipoRelacion: "OWNER",
      estadoRelacion: "ACTIVA",
      permisoEditarProyecto: true,
      permisoSubirDocumentacion: true,
      permisoVerLeadsGlobales: true,
      permisoVerMetricasGlobales: true,
    },
  });

  for (const [stageIndex, stageName] of Array.from(new Set(seed.lots.map((lot) => lot.etapa))).entries()) {
    const etapa = await prisma.etapa.upsert({
      where: { id: `${seed.slug}-${stageName.toLowerCase().replace(/\s+/g, "-")}` },
      update: { nombre: stageName, orden: stageIndex + 1, estado: "ACTIVA" },
      create: {
        id: `${seed.slug}-${stageName.toLowerCase().replace(/\s+/g, "-")}`,
        proyectoId: project.id,
        nombre: stageName,
        orden: stageIndex + 1,
        estado: "ACTIVA",
      },
    });

    const blocks = Array.from(new Set(seed.lots.filter((lot) => lot.etapa === stageName).map((lot) => lot.manzana)));
    for (const blockName of blocks) {
      const manzanaId = `${etapa.id}-${blockName.toLowerCase().replace(/\s+/g, "-")}`;
      const manzana = await prisma.manzana.upsert({
        where: { id: manzanaId },
        update: { nombre: blockName },
        create: { id: manzanaId, etapaId: etapa.id, nombre: blockName },
      });

      for (const lot of seed.lots.filter((item) => item.etapa === stageName && item.manzana === blockName)) {
        const geom = lotPath(lot);
        const [[swLat, swLng], [neLat, neLng]] = seed.overlayBounds;
        const lat = neLat - (geom.center.y / 980) * (neLat - swLat);
        const lng = swLng + (geom.center.x / 920) * (neLng - swLng);
        const unidadId = `${seed.slug}-${lot.numero.toLowerCase()}`;

        await prisma.unidad.upsert({
          where: { id: unidadId },
          update: {
            numero: lot.numero,
            superficie: lot.superficie,
            frente: lot.frente,
            fondo: lot.fondo,
            precio: lot.precio,
            estado: lot.estado,
            geoJSON: JSON.stringify({ type: "Point", coordinates: [lng, lat] }),
            centerLat: lat,
            centerLng: lng,
            coordenadasMasterplan: JSON.stringify({
              path: geom.path,
              center: geom.center,
              internalId: seed.lots.indexOf(lot) + 1,
              lotLabel: lot.numero,
            }),
          },
          create: {
            id: unidadId,
            manzanaId: manzana.id,
            numero: lot.numero,
            tipo: "LOTE",
            superficie: lot.superficie,
            frente: lot.frente,
            fondo: lot.fondo,
            precio: lot.precio,
            moneda: "USD",
            estado: lot.estado,
            geoJSON: JSON.stringify({ type: "Point", coordinates: [lng, lat] }),
            centerLat: lat,
            centerLng: lng,
            coordenadasMasterplan: JSON.stringify({
              path: geom.path,
              center: geom.center,
              internalId: seed.lots.indexOf(lot) + 1,
              lotLabel: lot.numero,
            }),
          },
        });
      }
    }
  }

  await prisma.proyectoImagen.upsert({
    where: { id: `${seed.slug}-cover` },
    update: { url: seed.imageUrl, categoria: "PORTADA", esPrincipal: true, orden: 0 },
    create: { id: `${seed.slug}-cover`, proyectoId: project.id, url: seed.imageUrl, categoria: "PORTADA", esPrincipal: true, orden: 0 },
  });

  await prisma.imagenMapa.upsert({
    where: { id: `${seed.slug}-drone-1` },
    update: {
      url: seed.imageUrl,
      tipo: "aerea",
      titulo: "Vista aerea demo",
      lat: seed.mapCenterLat,
      lng: seed.mapCenterLng,
      altitudM: 500,
      imageHeading: 0,
    },
    create: {
      id: `${seed.slug}-drone-1`,
      proyectoId: project.id,
      url: seed.imageUrl,
      tipo: "aerea",
      titulo: "Vista aerea demo",
      lat: seed.mapCenterLat,
      lng: seed.mapCenterLng,
      altitudM: 500,
      imageHeading: 0,
    },
  });

  for (const [index, item] of seed.infrastructures.entries()) {
    await prisma.infraestructura.upsert({
      where: { id: `${seed.slug}-infra-${index + 1}` },
      update: {
        ...item,
        coordenadas: JSON.stringify(item.coordenadas),
        orden: index,
        visible: true,
      },
      create: {
        id: `${seed.slug}-infra-${index + 1}`,
        proyectoId: project.id,
        ...item,
        coordenadas: JSON.stringify(item.coordenadas),
        orden: index,
        visible: true,
      },
    });
  }

  await prisma.tour360.upsert({
    where: { id: `${seed.slug}-tour-general` },
    update: { nombre: "Recorrido general demo", estado: "APROBADO" },
    create: {
      id: `${seed.slug}-tour-general`,
      proyectoId: project.id,
      nombre: "Recorrido general demo",
      estado: "APROBADO",
      scenes: {
        create: [{
          id: `${seed.slug}-scene-access`,
          title: "Acceso principal",
          imageUrl: "/demo-360.jpg",
          thumbnailUrl: "/demo-360.jpg",
          isDefault: true,
          order: 0,
          category: "DRONE_360",
        }],
      },
    },
  });

  return project;
}

async function main() {
  const seeds = projectSeeds();

  console.log("SevenToop - seed El Pampa project examples");
  console.log("mode:", APPLY ? "APPLY" : "DRY-RUN");
  console.log("db:", maskUrl(process.env.DATABASE_URL));
  console.log("projects:", seeds.map((seed) => `${seed.slug} (${seed.lots.length} lots)`).join(", "));

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta definido.");
  }

  if (!APPLY) {
    console.log("No se escribio nada. Revisa el plan y ejecuta con --apply cuando el destino este confirmado.");
    return;
  }

  const { org, user } = await ensureOrgAndOperator();
  for (const seed of seeds) {
    const project = await upsertProject(seed, user.id, org.id);
    console.log(`[OK] ${project.slug}: ${seed.lots.length} lotes preparados.`);
  }
}

main()
  .catch((error) => {
    console.error("[seed-el-pampa-projects] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
