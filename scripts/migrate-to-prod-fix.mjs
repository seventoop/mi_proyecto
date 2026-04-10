import { PrismaClient } from "@prisma/client";

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) { console.error("Set PROD_DATABASE_URL"); process.exit(1); }

const local = new PrismaClient();
const prod = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  console.log("=== MIGRATION PART 2: etapas, manzanas, unidades, banners ===\n");

  const localEtapas = await local.etapa.findMany();
  for (const e of localEtapas) {
    await prod.$executeRaw`
      INSERT INTO etapas (id, "proyectoId", nombre, orden, estado, "createdAt", "updatedAt")
      VALUES (${e.id}, ${e.proyectoId}, ${e.nombre}, ${e.orden || 0}, ${e.estado || "ACTIVA"}, ${e.createdAt}, ${e.updatedAt})
    `;
  }
  console.log("Etapas inserted:", localEtapas.length);

  const localManzanas = await local.manzana.findMany();
  for (const m of localManzanas) {
    await prod.$executeRaw`
      INSERT INTO manzanas (id, "etapaId", nombre, coordenadas, "createdAt", "updatedAt")
      VALUES (${m.id}, ${m.etapaId}, ${m.nombre}, ${m.coordenadas || null}, ${m.createdAt}, ${m.updatedAt})
    `;
  }
  console.log("Manzanas inserted:", localManzanas.length);

  const localUnidades = await local.unidad.findMany();
  let uCount = 0;
  for (const u of localUnidades) {
    await prod.$executeRaw`
      INSERT INTO unidades (
        id, "manzanaId", numero, tipo, superficie, frente, fondo,
        "esEsquina", orientacion, precio, moneda, estado,
        financiacion, "tour360Url", "createdAt", "updatedAt"
      ) VALUES (
        ${u.id}, ${u.manzanaId}, ${u.numero}, ${u.tipo}, ${u.superficie},
        ${u.frente}, ${u.fondo}, ${u.esEsquina || false}, ${u.orientacion},
        ${u.precio}, ${u.moneda || "ARS"}, ${u.estado || "DISPONIBLE"},
        ${u.financiacion || false}, ${u.tour360Url},
        ${u.createdAt}, ${u.updatedAt}
      )
    `;
    uCount++;
  }
  console.log("Unidades inserted:", uCount);

  const localBanners = await local.banner.findMany();
  for (const b of localBanners) {
    await prod.$executeRaw`
      INSERT INTO banners (
        id, titulo, "internalName", headline, subheadline, tagline,
        "ctaText", "ctaUrl", "linkDestino", tipo, "mediaUrl",
        context, posicion, prioridad, estado,
        "orgId", "projectId", "createdAt", "updatedAt"
      ) VALUES (
        ${b.id}, ${b.titulo}, ${b.internalName}, ${b.headline}, ${b.subheadline}, ${b.tagline},
        ${b.ctaText}, ${b.ctaUrl}, ${b.linkDestino}, ${b.tipo || "IMAGEN"}, ${b.mediaUrl},
        ${b.context || "SEVENTOOP_GLOBAL"}, ${b.posicion || "HOME_TOP"}, ${b.prioridad || 0}, ${b.estado || "DRAFT"},
        ${b.orgId}, ${b.projectId}, ${b.createdAt}, ${b.updatedAt}
      )
    `;
  }
  console.log("Banners inserted:", localBanners.length);

  console.log("\n=== FINAL VERIFICATION ===");
  const counts = await Promise.all([
    prod.$queryRaw`SELECT COUNT(*) as c FROM users`,
    prod.$queryRaw`SELECT COUNT(*) as c FROM proyectos`,
    prod.$queryRaw`SELECT COUNT(*) as c FROM etapas`,
    prod.$queryRaw`SELECT COUNT(*) as c FROM manzanas`,
    prod.$queryRaw`SELECT COUNT(*) as c FROM unidades`,
    prod.$queryRaw`SELECT COUNT(*) as c FROM banners`,
  ]);
  const labels = ["Users", "Projects", "Etapas", "Manzanas", "Unidades", "Banners"];
  counts.forEach((r, i) => console.log(labels[i] + ":", r[0].c.toString()));

  await local.$disconnect();
  await prod.$disconnect();
  console.log("\n=== MIGRATION COMPLETE ===");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
