/**
 * scripts/fix-key-user-roles.ts
 *
 * Targeted, NON-DESTRUCTIVE fix for THREE specific user roles.
 *
 *   - Solo toca estos 3 usuarios (por email normalizado):
 *       ascenzimarquezjuanignacio@gmail.com  -> SUPERADMIN
 *       dany76162@gmail.com                  -> SUPERADMIN
 *       admin@seventoop.com                  -> ADMIN
 *   - NO toca password.
 *   - NO toca googleId.
 *   - NO toca orgId.
 *   - NO crea usuarios. Si el email no existe, lo loguea y sigue.
 *   - Por defecto corre en DRY_RUN. Para aplicar de verdad: APPLY=true.
 *
 * Uso:
 *   # Dry-run contra la DB actual del entorno
 *   npm run fix:key-roles:dry-run
 *
 *   # Aplicar (DB del entorno actual)
 *   APPLY=true npm run fix:key-roles
 *
 *   # Aplicar contra otra DB (ej. produccion) sin cambiar la del entorno
 *   TARGET_DATABASE_URL="postgresql://..." APPLY=true npm run fix:key-roles
 */

import { PrismaClient } from "@prisma/client";

const APPLY = process.env.APPLY === "true";
const TARGET_URL = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

if (!TARGET_URL) {
    console.error("ERROR: ni TARGET_DATABASE_URL ni DATABASE_URL estan definidas");
    process.exit(1);
}

const db = new PrismaClient({ datasources: { db: { url: TARGET_URL } } });

const FIXES: { email: string; rol: string }[] = [
    { email: "ascenzimarquezjuanignacio@gmail.com", rol: "SUPERADMIN" },
    { email: "dany76162@gmail.com",                 rol: "SUPERADMIN" },
    { email: "admin@seventoop.com",                 rol: "ADMIN" },
];

function hostOf(url: string): string {
    try {
        const u = new URL(url);
        return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")}`;
    } catch { return "<invalid>"; }
}

async function main() {
    console.log(`=== fix-key-user-roles (${APPLY ? "APPLY" : "DRY_RUN"}) ===`);
    console.log(`Target: ${hostOf(TARGET_URL!)}`);
    console.log("");

    let changed = 0;
    let alreadyOk = 0;
    let missing = 0;

    for (const fx of FIXES) {
        const emailNorm = fx.email.toLowerCase().trim();
        // Buscar case-insensitive sin tocar nada
        const found = await db.user.findFirst({
            where: { email: { equals: emailNorm, mode: "insensitive" } },
            select: { id: true, email: true, rol: true, googleId: true, orgId: true },
        });

        if (!found) {
            console.log(`  [MISSING] ${fx.email}: no existe en target -> NO se crea`);
            missing++;
            continue;
        }

        if (found.rol === fx.rol) {
            console.log(`  [OK] ${found.email}: ya es ${fx.rol} (id=${found.id}) -> sin cambios`);
            alreadyOk++;
            continue;
        }

        console.log(`  [CHANGE] ${found.email}: ${found.rol} -> ${fx.rol} (id=${found.id})`);
        if (APPLY) {
            await db.user.update({
                where: { id: found.id },
                data: { rol: fx.rol },
                // explicit: no se tocan password, googleId, orgId, etc.
            });
            changed++;
        }
    }

    console.log("");
    console.log("=== SUMMARY ===");
    console.log(`  ya correctos:      ${alreadyOk}`);
    console.log(`  ${APPLY ? "actualizados" : "would update"}:    ${APPLY ? changed : FIXES.length - alreadyOk - missing}`);
    console.log(`  no encontrados:    ${missing}`);
    if (!APPLY) {
        console.log("");
        console.log(">> DRY RUN. Nada fue escrito. Para aplicar: APPLY=true npm run fix:key-roles");
    }

    await db.$disconnect();
}

main().catch(async (e) => {
    console.error("FAILED:", e);
    await db.$disconnect().catch(() => {});
    process.exit(1);
});
