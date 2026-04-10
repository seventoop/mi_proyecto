import { PrismaClient } from "@prisma/client";

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
  console.error("Set PROD_DATABASE_URL env var");
  process.exit(1);
}

const local = new PrismaClient();
const prod = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  console.log("=== MIGRATION: Replit -> Production (Neon) ===\n");

  const prodUsers = await prod.$queryRaw`SELECT id, email FROM users`;
  const prodEmails = new Set(prodUsers.map((u) => u.email));
  const prodUserIds = new Set(prodUsers.map((u) => u.id));
  console.log("Prod users before:", prodUsers.length);

  const prodOrgs = await prod.$queryRaw`SELECT id FROM organizations`;
  const prodOrgIds = new Set(prodOrgs.map((o) => o.id));

  const localOrgs = await local.organization.findMany();
  let orgsInserted = 0;
  for (const org of localOrgs) {
    if (!prodOrgIds.has(org.id)) {
      await prod.$executeRaw`
        INSERT INTO organizations (id, nombre, slug, plan, "createdAt", "updatedAt")
        VALUES (${org.id}, ${org.nombre}, ${org.slug}, ${org.plan || "FREE"}, ${org.createdAt}, ${org.updatedAt})
      `;
      orgsInserted++;
      console.log("  Inserted org:", org.slug);
    }
  }
  console.log("Organizations inserted:", orgsInserted);

  const localUsers = await local.user.findMany();
  let usersInserted = 0;
  for (const u of localUsers) {
    if (prodEmails.has(u.email)) {
      console.log("  SKIP user (duplicate email):", u.email);
      continue;
    }
    await prod.$executeRaw`
      INSERT INTO users (
        id, email, password, nombre, rol, "orgId", "kycStatus",
        "demoEndsAt", "demoUsed", "createdAt", "updatedAt"
      ) VALUES (
        ${u.id}, ${u.email}, ${u.password}, ${u.nombre}, ${u.rol},
        ${u.orgId}, ${u.kycStatus || "NINGUNO"},
        ${u.demoEndsAt}, ${u.demoUsed || false},
        ${u.createdAt}, ${u.updatedAt}
      )
    `;
    usersInserted++;
    console.log("  Inserted user:", u.email, "|", u.rol);
  }
  console.log("Users inserted:", usersInserted);

  console.log("\n--- Cleaning prod content tables (projects, etapas, manzanas, unidades, banners) ---");
  await prod.$executeRaw`DELETE FROM unidades`;
  await prod.$executeRaw`DELETE FROM manzanas`;
  await prod.$executeRaw`DELETE FROM etapas`;
  await prod.$executeRaw`DELETE FROM banners`;
  await prod.$executeRaw`DELETE FROM proyectos`;
  console.log("  Cleaned: unidades, manzanas, etapas, banners, proyectos");

  const localProjects = await local.proyecto.findMany();
  for (const p of localProjects) {
    await prod.$executeRaw`
      INSERT INTO proyectos (
        id, nombre, slug, descripcion, ubicacion, estado, tipo,
        "imagenPortada", galeria, documentos,
        "mapCenterLat", "mapCenterLng", "mapZoom",
        invertible, "precioM2Inversor", "precioM2Mercado", "metaM2Objetivo",
        "visibilityStatus", "orgId", "isDemo", "requireKyc",
        "createdAt", "updatedAt"
      ) VALUES (
        ${p.id}, ${p.nombre}, ${p.slug}, ${p.descripcion}, ${p.ubicacion},
        ${p.estado}, ${p.tipo}, ${p.imagenPortada},
        ${JSON.stringify(p.galeria) || "[]"}, ${JSON.stringify(p.documentos) || "[]"},
        ${p.mapCenterLat}, ${p.mapCenterLng}, ${p.mapZoom},
        ${p.invertible || false}, ${p.precioM2Inversor}, ${p.precioM2Mercado}, ${p.metaM2Objetivo},
        ${p.visibilityStatus || "PUBLICADO"}, ${p.orgId}, ${p.isDemo || false}, ${p.requireKyc || false},
        ${p.createdAt}, ${p.updatedAt}
      )
    `;
  }
  console.log("Projects inserted:", localProjects.length);

  const localEtapas = await local.etapa.findMany();
  for (const e of localEtapas) {
    await prod.$executeRaw`
      INSERT INTO etapas (
        id, nombre, descripcion, orden, "proyectoId", "createdAt", "updatedAt"
      ) VALUES (
        ${e.id}, ${e.nombre}, ${e.descripcion}, ${e.orden || 0},
        ${e.proyectoId}, ${e.createdAt}, ${e.updatedAt}
      )
    `;
  }
  console.log("Etapas inserted:", localEtapas.length);

  const localManzanas = await local.manzana.findMany();
  for (const m of localManzanas) {
    await prod.$executeRaw`
      INSERT INTO manzanas (
        id, nombre, descripcion, orden, color, "etapaId", "createdAt", "updatedAt"
      ) VALUES (
        ${m.id}, ${m.nombre}, ${m.descripcion}, ${m.orden || 0}, ${m.color},
        ${m.etapaId}, ${m.createdAt}, ${m.updatedAt}
      )
    `;
  }
  console.log("Manzanas inserted:", localManzanas.length);

  const localUnidades = await local.unidad.findMany();
  let unidadesCount = 0;
  for (const u of localUnidades) {
    await prod.$executeRaw`
      INSERT INTO unidades (
        id, numero, tipo, superficie, frente, fondo,
        "esEsquina", orientacion, precio, moneda, estado,
        "financiacion", "tour360Url", "manzanaId",
        "createdAt", "updatedAt"
      ) VALUES (
        ${u.id}, ${u.numero}, ${u.tipo}, ${u.superficie}, ${u.frente}, ${u.fondo},
        ${u.esEsquina || false}, ${u.orientacion}, ${u.precio}, ${u.moneda || "ARS"}, ${u.estado || "DISPONIBLE"},
        ${u.financiacion || false}, ${u.tour360Url}, ${u.manzanaId},
        ${u.createdAt}, ${u.updatedAt}
      )
    `;
    unidadesCount++;
  }
  console.log("Unidades inserted:", unidadesCount);

  const localBanners = await local.banner.findMany();
  for (const b of localBanners) {
    await prod.$executeRaw`
      INSERT INTO banners (
        id, titulo, "internalName", headline, subheadline, tagline,
        "ctaText", "ctaUrl", "linkDestino", tipo, "mediaUrl",
        context, "posicion", prioridad, estado,
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

  console.log("\n=== VERIFICATION ===");
  const finalUsers = await prod.$queryRaw`SELECT COUNT(*) as c FROM users`;
  const finalProjects = await prod.$queryRaw`SELECT COUNT(*) as c FROM proyectos`;
  const finalEtapas = await prod.$queryRaw`SELECT COUNT(*) as c FROM etapas`;
  const finalManzanas = await prod.$queryRaw`SELECT COUNT(*) as c FROM manzanas`;
  const finalUnidades = await prod.$queryRaw`SELECT COUNT(*) as c FROM unidades`;
  const finalBanners = await prod.$queryRaw`SELECT COUNT(*) as c FROM banners`;

  console.log("Users:", finalUsers[0].c.toString());
  console.log("Projects:", finalProjects[0].c.toString());
  console.log("Etapas:", finalEtapas[0].c.toString());
  console.log("Manzanas:", finalManzanas[0].c.toString());
  console.log("Unidades:", finalUnidades[0].c.toString());
  console.log("Banners:", finalBanners[0].c.toString());

  await local.$disconnect();
  await prod.$disconnect();
  console.log("\n=== MIGRATION COMPLETE ===");
}

main().catch((e) => {
  console.error("MIGRATION FAILED:", e);
  process.exit(1);
});
