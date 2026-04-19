/**
 * scripts/db-audit.ts
 *
 * NON-DESTRUCTIVE diagnostic script.
 * Compares two PostgreSQL databases (typically Neon vs Railway) on a
 * fixed list of business-critical tables. Reports counts, host info,
 * and per-entity overlap / unique sets so you can decide what to migrate.
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgres://..." \
 *   TARGET_DATABASE_URL="postgres://..." \
 *   npm run db:audit
 *
 * SOURCE = base de origen (ej: Neon).
 * TARGET = base destino canonica (ej: Railway).
 *
 * El script:
 *   - solo ejecuta SELECT
 *   - no escribe nada
 *   - no abre transacciones de modificacion
 *   - imprime un resumen comparativo y un detalle por tabla
 */

import { PrismaClient } from "@prisma/client";

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL || !TARGET_URL) {
    console.error("ERROR: faltan SOURCE_DATABASE_URL y/o TARGET_DATABASE_URL");
    process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } });

type IdRow = { id: string };
type EmailRow = { email: string };

function hostOf(url: string): string {
    try {
        const u = new URL(url);
        return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")}`;
    } catch {
        return "<invalid url>";
    }
}

function describeProvider(host: string): string {
    if (/neon\.tech/i.test(host)) return "NEON";
    if (/railway\.app|rlwy\.net|proxy\.rlwy/i.test(host)) return "RAILWAY";
    if (/vercel-storage|supabase|aws|amazonaws/i.test(host)) return "OTHER-CLOUD";
    if (/localhost|127\.0\.0\.1/i.test(host)) return "LOCAL";
    return "UNKNOWN";
}

async function tableExists(client: PrismaClient, table: string): Promise<boolean> {
    const rows = await client.$queryRawUnsafe<{ exists: boolean }[]>(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
        ) AS exists`,
        table
    );
    return rows[0]?.exists === true;
}

async function countRows(client: PrismaClient, table: string): Promise<number> {
    const rows = await client.$queryRawUnsafe<{ c: bigint }[]>(
        `SELECT COUNT(*)::bigint AS c FROM "${table}"`
    );
    return Number(rows[0]?.c ?? 0);
}

async function fetchIds(client: PrismaClient, table: string): Promise<Set<string>> {
    const rows = await client.$queryRawUnsafe<IdRow[]>(`SELECT id FROM "${table}"`);
    return new Set(rows.map((r) => r.id));
}

async function fetchEmails(client: PrismaClient): Promise<Set<string>> {
    const rows = await client.$queryRawUnsafe<EmailRow[]>(`SELECT email FROM "users"`);
    return new Set(rows.map((r) => r.email.toLowerCase().trim()));
}

interface TableReport {
    table: string;
    sourceCount: number;
    targetCount: number;
    onlyInSource: number;
    onlyInTarget: number;
    inBoth: number;
    sampleOnlyInSource: string[];
    sampleOnlyInTarget: string[];
}

async function diffTable(table: string): Promise<TableReport | null> {
    const [srcExists, tgtExists] = await Promise.all([
        tableExists(source, table),
        tableExists(target, table),
    ]);
    if (!srcExists || !tgtExists) {
        console.log(`  [SKIP] ${table} — exists src=${srcExists} tgt=${tgtExists}`);
        return null;
    }
    const [srcIds, tgtIds] = await Promise.all([
        fetchIds(source, table),
        fetchIds(target, table),
    ]);
    const onlyInSource: string[] = [];
    const onlyInTarget: string[] = [];
    let inBoth = 0;
    for (const id of srcIds) {
        if (tgtIds.has(id)) inBoth++;
        else onlyInSource.push(id);
    }
    for (const id of tgtIds) {
        if (!srcIds.has(id)) onlyInTarget.push(id);
    }
    return {
        table,
        sourceCount: srcIds.size,
        targetCount: tgtIds.size,
        onlyInSource: onlyInSource.length,
        onlyInTarget: onlyInTarget.length,
        inBoth,
        sampleOnlyInSource: onlyInSource.slice(0, 5),
        sampleOnlyInTarget: onlyInTarget.slice(0, 5),
    };
}

async function diffUsersByEmail(): Promise<{
    sourceCount: number;
    targetCount: number;
    onlyInSource: string[];
    onlyInTarget: string[];
    inBoth: number;
}> {
    const [srcEmails, tgtEmails] = await Promise.all([
        fetchEmails(source),
        fetchEmails(target),
    ]);
    const onlyInSource: string[] = [];
    const onlyInTarget: string[] = [];
    let inBoth = 0;
    for (const e of srcEmails) {
        if (tgtEmails.has(e)) inBoth++;
        else onlyInSource.push(e);
    }
    for (const e of tgtEmails) {
        if (!srcEmails.has(e)) onlyInTarget.push(e);
    }
    return {
        sourceCount: srcEmails.size,
        targetCount: tgtEmails.size,
        onlyInSource,
        onlyInTarget,
        inBoth,
    };
}

const TABLES_IN_DEPENDENCY_ORDER = [
    "organizations",
    "users",
    "proyectos",
    "proyecto_imagenes",
    "etapas",
    "manzanas",
    "unidades",
    "banners",
];

async function main() {
    const srcHost = hostOf(SOURCE_URL!);
    const tgtHost = hostOf(TARGET_URL!);

    console.log("=== DB AUDIT (read-only) ===");
    console.log(`SOURCE: ${srcHost}  [${describeProvider(srcHost)}]`);
    console.log(`TARGET: ${tgtHost}  [${describeProvider(tgtHost)}]`);
    if (SOURCE_URL === TARGET_URL) {
        console.log("\nWARNING: SOURCE y TARGET apuntan al mismo host/db.");
    }
    console.log("");

    console.log("--- USERS BY EMAIL (case-insensitive) ---");
    const userDiff = await diffUsersByEmail();
    console.log(`  source emails: ${userDiff.sourceCount}`);
    console.log(`  target emails: ${userDiff.targetCount}`);
    console.log(`  in both:       ${userDiff.inBoth}`);
    console.log(`  only in source (${userDiff.onlyInSource.length}):`,
        userDiff.onlyInSource.slice(0, 10));
    console.log(`  only in target (${userDiff.onlyInTarget.length}):`,
        userDiff.onlyInTarget.slice(0, 10));
    console.log("");

    console.log("--- TABLES BY ID ---");
    const reports: TableReport[] = [];
    for (const table of TABLES_IN_DEPENDENCY_ORDER) {
        const r = await diffTable(table);
        if (r) reports.push(r);
    }

    console.log("\n=== SUMMARY ===");
    console.log("table                   | source | target | both  | onlySrc | onlyTgt");
    console.log("------------------------+--------+--------+-------+---------+--------");
    for (const r of reports) {
        const pad = (s: string | number, n: number) => String(s).padStart(n, " ");
        console.log(
            `${r.table.padEnd(23, " ")} | ${pad(r.sourceCount, 6)} | ${pad(r.targetCount, 6)} | ${pad(r.inBoth, 5)} | ${pad(r.onlyInSource, 7)} | ${pad(r.onlyInTarget, 7)}`
        );
    }

    console.log("\n=== SAMPLES (only in source = candidatos a migrar) ===");
    for (const r of reports) {
        if (r.onlyInSource > 0) {
            console.log(`  ${r.table}: ${r.sampleOnlyInSource.join(", ")}${r.onlyInSource > 5 ? " ..." : ""}`);
        }
    }
    console.log("\n=== SAMPLES (only in target = ya en Railway, NO se sobreescriben) ===");
    for (const r of reports) {
        if (r.onlyInTarget > 0) {
            console.log(`  ${r.table}: ${r.sampleOnlyInTarget.join(", ")}${r.onlyInTarget > 5 ? " ..." : ""}`);
        }
    }

    await source.$disconnect();
    await target.$disconnect();
    console.log("\n=== AUDIT COMPLETE (no se modifico ninguna base) ===");
}

main().catch(async (e) => {
    console.error("AUDIT FAILED:", e);
    await source.$disconnect().catch(() => {});
    await target.$disconnect().catch(() => {});
    process.exit(1);
});
