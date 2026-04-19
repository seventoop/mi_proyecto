/**
 * scripts/sync-to-railway.ts
 *
 * Idempotent NON-DESTRUCTIVE sync: copies missing rows from SOURCE to TARGET.
 *
 *   - NUNCA borra ni trunca nada en el destino.
 *   - NUNCA actualiza filas existentes en el destino (a menos que pases UPDATE_EXISTING=true,
 *     y aun en ese caso solo actualiza un set blanco de columnas seguras).
 *   - Detecta duplicados por:
 *       * users          -> email normalizado (lowercase + trim) Y por id.
 *       * el resto       -> id estable (cuid).
 *   - Inserta en orden de dependencias: organizations -> users -> proyectos ->
 *     proyecto_imagenes -> etapas -> manzanas -> unidades -> banners.
 *   - Loguea cada accion: INSERTED / SKIP_EXISTS / SKIP_FK_MISSING / WOULD_INSERT (dry-run).
 *
 * Modo seguro:
 *   - Por defecto corre en DRY_RUN (no escribe). Hay que pasar APPLY=true explicitamente.
 *
 * Uso:
 *   # 1) Dry-run (recomendado primera vez)
 *   SOURCE_DATABASE_URL="postgres://USER:PASS@NEON_HOST/db" \
 *   TARGET_DATABASE_URL="postgres://USER:PASS@RAILWAY_HOST/db" \
 *   npm run db:sync:dry-run
 *
 *   # 2) Aplicar de verdad (revisar el output del dry-run primero)
 *   SOURCE_DATABASE_URL="..." \
 *   TARGET_DATABASE_URL="..." \
 *   APPLY=true npm run db:sync:apply
 *
 * Variables opcionales:
 *   ONLY_TABLES="organizations,users,proyectos"   -> limita a esas tablas
 *   UPDATE_EXISTING=true                          -> habilita updates de campos blancos
 *
 * Garantias:
 *   - No usa DELETE / TRUNCATE / DROP / ALTER.
 *   - No corre migraciones.
 *   - Si falla a mitad, solo deja insertadas las filas ya commiteadas. El script es reentrante.
 */

import { PrismaClient } from "@prisma/client";

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;
const APPLY = process.env.APPLY === "true";
const UPDATE_EXISTING = process.env.UPDATE_EXISTING === "true";
const ONLY_TABLES = (process.env.ONLY_TABLES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

if (!SOURCE_URL || !TARGET_URL) {
    console.error("ERROR: faltan SOURCE_DATABASE_URL y/o TARGET_DATABASE_URL");
    process.exit(1);
}
if (SOURCE_URL === TARGET_URL) {
    console.error("ERROR: SOURCE y TARGET son la misma URL. Abortando.");
    process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } });

const MODE = APPLY ? "APPLY" : "DRY_RUN";
console.log(`=== SYNC ${MODE} ${UPDATE_EXISTING ? "(UPDATE_EXISTING=on)" : ""} ===`);

interface Stats {
    inserted: number;
    skippedExists: number;
    skippedFk: number;
    updated: number;
    errors: number;
}

function newStats(): Stats {
    return { inserted: 0, skippedExists: 0, skippedFk: 0, updated: 0, errors: 0 };
}

function shouldRun(table: string): boolean {
    if (ONLY_TABLES.length === 0) return true;
    return ONLY_TABLES.includes(table);
}

async function fetchExistingIds(table: string): Promise<Set<string>> {
    const rows = await target.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "${table}"`);
    return new Set(rows.map((r) => r.id));
}

async function fetchExistingUserEmails(): Promise<Map<string, string>> {
    // email normalizado -> id
    const rows = await target.$queryRawUnsafe<{ id: string; email: string }[]>(
        `SELECT id, email FROM "users"`
    );
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.email.toLowerCase().trim(), r.id);
    return map;
}

// ---------- ORGANIZATIONS ----------
async function syncOrganizations(stats: Stats) {
    const table = "organizations";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existing = await fetchExistingIds(table);
    const rows = await source.organization.findMany();
    for (const o of rows) {
        if (existing.has(o.id)) {
            stats.skippedExists++;
            continue;
        }
        if (!APPLY) {
            stats.inserted++;
            console.log(`  WOULD_INSERT org ${o.id} (${o.slug})`);
            continue;
        }
        try {
            await target.$executeRaw`
                INSERT INTO organizations (id, nombre, slug, plan, "planId", "createdAt", "updatedAt")
                VALUES (${o.id}, ${o.nombre}, ${o.slug}, ${o.plan ?? "FREE"}, ${o.planId}, ${o.createdAt}, ${o.updatedAt})
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED org ${o.id} (${o.slug})`);
        } catch (e) {
            stats.errors++;
            console.error(`  ERROR org ${o.id}:`, (e as Error).message);
        }
    }
}

// ---------- USERS ----------
async function syncUsers(stats: Stats) {
    const table = "users";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existingIds = await fetchExistingIds(table);
    const existingEmails = await fetchExistingUserEmails();
    const orgIds = await fetchExistingIds("organizations");

    const rows = await source.user.findMany();
    for (const u of rows) {
        const emailKey = u.email.toLowerCase().trim();
        if (existingIds.has(u.id) || existingEmails.has(emailKey)) {
            stats.skippedExists++;
            continue;
        }
        if (u.orgId && !orgIds.has(u.orgId)) {
            stats.skippedFk++;
            console.log(`  SKIP_FK user ${u.email} (orgId ${u.orgId} no existe en target)`);
            continue;
        }
        if (!APPLY) {
            stats.inserted++;
            console.log(`  WOULD_INSERT user ${u.email} (${u.rol})`);
            continue;
        }
        try {
            await target.$executeRaw`
                INSERT INTO users (
                    id, email, password, "googleId", nombre, rol, "orgId", "kycStatus",
                    "demoEndsAt", "demoUsed", apellido, telefono, direccion, apodo, avatar, bio,
                    "fechaNacimiento", configuracion, saldo, "whatsappNumber", "aiAgentTone",
                    "useAiCopilot", "createdAt", "updatedAt"
                ) VALUES (
                    ${u.id}, ${u.email}, ${u.password}, ${u.googleId}, ${u.nombre}, ${u.rol},
                    ${u.orgId}, ${u.kycStatus ?? "NINGUNO"},
                    ${u.demoEndsAt}, ${u.demoUsed ?? false},
                    ${u.apellido}, ${u.telefono}, ${u.direccion}, ${u.apodo}, ${u.avatar}, ${u.bio},
                    ${u.fechaNacimiento}, ${u.configuracion}, ${u.saldo}, ${u.whatsappNumber},
                    ${u.aiAgentTone ?? "PROFESIONAL"}, ${u.useAiCopilot ?? true},
                    ${u.createdAt}, ${u.updatedAt}
                )
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED user ${u.email} (${u.rol})`);
        } catch (e) {
            stats.errors++;
            console.error(`  ERROR user ${u.email}:`, (e as Error).message);
        }
    }
}

// ---------- PROYECTOS ----------
async function syncProyectos(stats: Stats) {
    const table = "proyectos";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existing = await fetchExistingIds(table);
    const orgIds = await fetchExistingIds("organizations");
    const userIds = await fetchExistingIds("users");

    const rows = await source.proyecto.findMany();
    for (const p of rows) {
        if (existing.has(p.id)) {
            stats.skippedExists++;
            continue;
        }
        if (p.orgId && !orgIds.has(p.orgId)) {
            stats.skippedFk++;
            console.log(`  SKIP_FK proyecto ${p.id} (orgId ${p.orgId} no existe)`);
            continue;
        }
        if (p.creadoPorId && !userIds.has(p.creadoPorId)) {
            console.log(`  WARN proyecto ${p.id}: creadoPorId ${p.creadoPorId} no existe en target, se inserta como NULL`);
        }
        if (!APPLY) {
            stats.inserted++;
            console.log(`  WOULD_INSERT proyecto ${p.id} (${p.slug || p.nombre})`);
            continue;
        }
        try {
            await target.$executeRaw`
                INSERT INTO proyectos (
                    id, nombre, slug, descripcion, ubicacion, estado, tipo,
                    "imagenPortada", galeria, documentos, "masterplanSVG",
                    "mapCenterLat", "mapCenterLng", "mapZoom",
                    "overlayUrl", "overlayBounds", "overlayRotation",
                    invertible, "precioM2Inversor", "precioM2Mercado", "metaM2Objetivo",
                    "m2VendidosInversores", "fechaLimiteFondeo",
                    "documentacionEstado", "creadoPorId",
                    "aiKnowledgeBase", "aiSystemPrompt",
                    "demoExpiresAt", "isDemo", "requireKyc",
                    "visibilityStatus", "orgId", "deletedAt", "tour360Url",
                    "planGallery", "estadoValidacion",
                    "flagsOverrideAt", "flagsOverridePorId",
                    "puedeCaptarLeads", "puedePublicarse", "puedeReservarse",
                    "createdAt", "updatedAt"
                ) VALUES (
                    ${p.id}, ${p.nombre}, ${p.slug}, ${p.descripcion}, ${p.ubicacion},
                    ${p.estado}, ${p.tipo}, ${p.imagenPortada}, ${p.galeria}, ${p.documentos},
                    ${p.masterplanSVG},
                    ${p.mapCenterLat}, ${p.mapCenterLng}, ${p.mapZoom},
                    ${p.overlayUrl}, ${p.overlayBounds}, ${p.overlayRotation},
                    ${p.invertible ?? false}, ${p.precioM2Inversor}, ${p.precioM2Mercado}, ${p.metaM2Objetivo},
                    ${p.m2VendidosInversores ?? 0}, ${p.fechaLimiteFondeo},
                    ${p.documentacionEstado ?? "PENDIENTE"},
                    ${p.creadoPorId && userIds.has(p.creadoPorId) ? p.creadoPorId : null},
                    ${p.aiKnowledgeBase}, ${p.aiSystemPrompt},
                    ${p.demoExpiresAt}, ${p.isDemo ?? false}, ${p.requireKyc ?? true},
                    ${p.visibilityStatus ?? "PUBLICADO"}, ${p.orgId}, ${p.deletedAt}, ${p.tour360Url},
                    ${p.planGallery}, ${p.estadoValidacion}::"EstadoValidacionProyecto",
                    ${p.flagsOverrideAt}, ${p.flagsOverridePorId},
                    ${p.puedeCaptarLeads ?? false}, ${p.puedePublicarse ?? false}, ${p.puedeReservarse ?? false},
                    ${p.createdAt}, ${p.updatedAt}
                )
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED proyecto ${p.id} (${p.slug || p.nombre})`);
        } catch (e) {
            stats.errors++;
            console.error(`  ERROR proyecto ${p.id}:`, (e as Error).message);
        }
    }
}

// ---------- PROYECTO IMAGENES ----------
async function syncProyectoImagenes(stats: Stats) {
    const table = "proyecto_imagenes";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existing = await fetchExistingIds(table);
    const proyectoIds = await fetchExistingIds("proyectos");
    const rows = await source.proyectoImagen.findMany();
    for (const img of rows) {
        if (existing.has(img.id)) { stats.skippedExists++; continue; }
        if (!proyectoIds.has(img.proyectoId)) { stats.skippedFk++; continue; }
        if (!APPLY) { stats.inserted++; console.log(`  WOULD_INSERT imagen ${img.id}`); continue; }
        try {
            await target.$executeRaw`
                INSERT INTO proyecto_imagenes (id, "proyectoId", url, categoria, "esPrincipal", orden, "createdAt")
                VALUES (${img.id}, ${img.proyectoId}, ${img.url}, ${img.categoria},
                        ${img.esPrincipal ?? false}, ${img.orden ?? 0}, ${img.createdAt})
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED imagen ${img.id}`);
        } catch (e) {
            stats.errors++;
            console.error(`  ERROR imagen ${img.id}:`, (e as Error).message);
        }
    }
}

// ---------- ETAPAS ----------
async function syncEtapas(stats: Stats) {
    const table = "etapas";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existing = await fetchExistingIds(table);
    const proyectoIds = await fetchExistingIds("proyectos");
    const rows = await source.etapa.findMany();
    for (const e of rows) {
        if (existing.has(e.id)) { stats.skippedExists++; continue; }
        if (!proyectoIds.has(e.proyectoId)) { stats.skippedFk++; continue; }
        if (!APPLY) { stats.inserted++; console.log(`  WOULD_INSERT etapa ${e.id}`); continue; }
        try {
            await target.$executeRaw`
                INSERT INTO etapas (id, "proyectoId", nombre, orden, estado, "createdAt", "updatedAt")
                VALUES (${e.id}, ${e.proyectoId}, ${e.nombre}, ${e.orden ?? 0},
                        ${e.estado ?? "PENDIENTE"}, ${e.createdAt}, ${e.updatedAt})
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED etapa ${e.id}`);
        } catch (err) {
            stats.errors++;
            console.error(`  ERROR etapa ${e.id}:`, (err as Error).message);
        }
    }
}

// ---------- MANZANAS ----------
async function syncManzanas(stats: Stats) {
    const table = "manzanas";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existing = await fetchExistingIds(table);
    const etapaIds = await fetchExistingIds("etapas");
    const rows = await source.manzana.findMany();
    for (const m of rows) {
        if (existing.has(m.id)) { stats.skippedExists++; continue; }
        if (!etapaIds.has(m.etapaId)) { stats.skippedFk++; continue; }
        if (!APPLY) { stats.inserted++; console.log(`  WOULD_INSERT manzana ${m.id}`); continue; }
        try {
            await target.$executeRaw`
                INSERT INTO manzanas (id, "etapaId", nombre, coordenadas, "createdAt", "updatedAt")
                VALUES (${m.id}, ${m.etapaId}, ${m.nombre}, ${m.coordenadas}, ${m.createdAt}, ${m.updatedAt})
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED manzana ${m.id}`);
        } catch (err) {
            stats.errors++;
            console.error(`  ERROR manzana ${m.id}:`, (err as Error).message);
        }
    }
}

// ---------- UNIDADES ----------
async function syncUnidades(stats: Stats) {
    const table = "unidades";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existing = await fetchExistingIds(table);
    const manzanaIds = await fetchExistingIds("manzanas");
    const userIds = await fetchExistingIds("users");
    const rows = await source.unidad.findMany();
    for (const u of rows) {
        if (existing.has(u.id)) { stats.skippedExists++; continue; }
        if (!manzanaIds.has(u.manzanaId)) { stats.skippedFk++; continue; }
        const responsableId = u.responsableId && userIds.has(u.responsableId) ? u.responsableId : null;
        if (!APPLY) { stats.inserted++; console.log(`  WOULD_INSERT unidad ${u.id}`); continue; }
        try {
            await target.$executeRaw`
                INSERT INTO unidades (
                    id, "manzanaId", numero, tipo, superficie, frente, fondo,
                    "esEsquina", orientacion, precio, moneda, "geoJSON",
                    "centerLat", "centerLng", financiacion, estado,
                    "coordenadasMasterplan", imagenes, "tour360Url",
                    "responsableId", polygon, "bloqueadoHasta",
                    "createdAt", "updatedAt"
                ) VALUES (
                    ${u.id}, ${u.manzanaId}, ${u.numero}, ${u.tipo}, ${u.superficie},
                    ${u.frente}, ${u.fondo}, ${u.esEsquina ?? false}, ${u.orientacion},
                    ${u.precio}, ${u.moneda ?? "USD"}, ${u.geoJSON},
                    ${u.centerLat}, ${u.centerLng}, ${u.financiacion}, ${u.estado ?? "DISPONIBLE"},
                    ${u.coordenadasMasterplan}, ${u.imagenes}, ${u.tour360Url},
                    ${responsableId}, ${u.polygon ?? null}::jsonb, ${u.bloqueadoHasta},
                    ${u.createdAt}, ${u.updatedAt}
                )
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED unidad ${u.id}`);
        } catch (err) {
            stats.errors++;
            console.error(`  ERROR unidad ${u.id}:`, (err as Error).message);
        }
    }
}

// ---------- BANNERS ----------
async function syncBanners(stats: Stats) {
    const table = "banners";
    if (!shouldRun(table)) return;
    console.log(`\n[${table}]`);
    const existing = await fetchExistingIds(table);
    const orgIds = await fetchExistingIds("organizations");
    const proyectoIds = await fetchExistingIds("proyectos");
    const userIds = await fetchExistingIds("users");
    const rows = await source.banner.findMany();
    for (const b of rows) {
        if (existing.has(b.id)) { stats.skippedExists++; continue; }
        if (b.orgId && !orgIds.has(b.orgId)) {
            stats.skippedFk++;
            console.log(`  SKIP_FK banner ${b.id} (org ${b.orgId} no existe)`);
            continue;
        }
        const projectId = b.projectId && proyectoIds.has(b.projectId) ? b.projectId : null;
        const creadoPorId = b.creadoPorId && userIds.has(b.creadoPorId) ? b.creadoPorId : null;
        const approvedById = b.approvedById && userIds.has(b.approvedById) ? b.approvedById : null;
        if (!APPLY) { stats.inserted++; console.log(`  WOULD_INSERT banner ${b.id} (${b.titulo})`); continue; }
        try {
            await target.$executeRaw`
                INSERT INTO banners (
                    id, titulo, "internalName", headline, subheadline, tagline,
                    "ctaText", "ctaUrl", "linkDestino", tipo, "mediaUrl",
                    context, posicion, prioridad, estado,
                    "fechaInicio", "fechaFin", "notasAdmin",
                    "creadoPorId", "approvedAt", "approvedById", "publishedAt",
                    "orgId", "projectId", "createdAt", "updatedAt"
                ) VALUES (
                    ${b.id}, ${b.titulo}, ${b.internalName}, ${b.headline}, ${b.subheadline}, ${b.tagline},
                    ${b.ctaText}, ${b.ctaUrl}, ${b.linkDestino}, ${b.tipo ?? "IMAGEN"}, ${b.mediaUrl},
                    ${b.context ?? "ORG_LANDING"}, ${b.posicion ?? "HOME_TOP"}, ${b.prioridad ?? 0}, ${b.estado ?? "DRAFT"},
                    ${b.fechaInicio}, ${b.fechaFin}, ${b.notasAdmin},
                    ${creadoPorId}, ${b.approvedAt}, ${approvedById}, ${b.publishedAt},
                    ${b.orgId}, ${projectId}, ${b.createdAt}, ${b.updatedAt}
                )
                ON CONFLICT (id) DO NOTHING
            `;
            stats.inserted++;
            console.log(`  INSERTED banner ${b.id} (${b.titulo})`);
        } catch (err) {
            stats.errors++;
            console.error(`  ERROR banner ${b.id}:`, (err as Error).message);
        }
    }
}

async function main() {
    const stats: Record<string, Stats> = {};

    const tasks: { name: string; fn: (s: Stats) => Promise<void> }[] = [
        { name: "organizations", fn: syncOrganizations },
        { name: "users", fn: syncUsers },
        { name: "proyectos", fn: syncProyectos },
        { name: "proyecto_imagenes", fn: syncProyectoImagenes },
        { name: "etapas", fn: syncEtapas },
        { name: "manzanas", fn: syncManzanas },
        { name: "unidades", fn: syncUnidades },
        { name: "banners", fn: syncBanners },
    ];

    for (const t of tasks) {
        const s = newStats();
        await t.fn(s);
        stats[t.name] = s;
    }

    console.log("\n=== SUMMARY ===");
    console.log("table              | inserted | skipExists | skipFk | updated | errors");
    console.log("-------------------+----------+------------+--------+---------+-------");
    for (const [name, s] of Object.entries(stats)) {
        const pad = (n: number, w: number) => String(n).padStart(w, " ");
        console.log(
            `${name.padEnd(18, " ")} | ${pad(s.inserted, 8)} | ${pad(s.skippedExists, 10)} | ${pad(s.skippedFk, 6)} | ${pad(s.updated, 7)} | ${pad(s.errors, 6)}`
        );
    }

    if (!APPLY) {
        console.log("\n>> DRY RUN. Ninguna fila fue escrita en TARGET.");
        console.log(">> Para aplicar de verdad: APPLY=true npm run db:sync:apply");
    }

    if (UPDATE_EXISTING) {
        console.log("\nNOTA: UPDATE_EXISTING esta activo pero este script aun no implementa updates.");
        console.log("      Por seguridad, las filas ya existentes en TARGET NO fueron modificadas.");
    }

    await source.$disconnect();
    await target.$disconnect();
    console.log(`\n=== SYNC ${MODE} COMPLETE ===`);
}

main().catch(async (e) => {
    console.error("SYNC FAILED:", e);
    await source.$disconnect().catch(() => {});
    await target.$disconnect().catch(() => {});
    process.exit(1);
});
