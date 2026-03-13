/**
 * Backfill Lead.orgId for legacy leads that have null orgId.
 *
 * Strategy (in order of confidence):
 * 1. Lead has proyectoId → use proyecto.orgId
 * 2. Lead has asignadoAId → use user.orgId
 * 3. Lead has no deducible org → leave null (admin-only access)
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/backfill-lead-orgid.ts
 *   OR: npx tsx scripts/backfill-lead-orgid.ts
 *
 * DRY RUN (default): set DRY_RUN=false to actually apply.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN !== "false";

async function main() {
    console.log(`[backfill] Starting lead orgId backfill. DRY_RUN=${DRY_RUN}`);

    const nullOrgLeads = await prisma.lead.findMany({
        where: { orgId: null },
        select: {
            id: true,
            proyectoId: true,
            asignadoAId: true,
        },
    });

    console.log(`[backfill] Found ${nullOrgLeads.length} leads with null orgId`);

    let fixedViaProyecto = 0;
    let fixedViaUser = 0;
    let unresolvable = 0;

    for (const lead of nullOrgLeads) {
        let orgId: string | null = null;

        // Strategy 1: via proyecto
        if (lead.proyectoId) {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: lead.proyectoId },
                select: { orgId: true },
            });
            if (proyecto?.orgId) {
                orgId = proyecto.orgId;
                fixedViaProyecto++;
            }
        }

        // Strategy 2: via asignadoA user
        if (!orgId && lead.asignadoAId) {
            const user = await prisma.user.findUnique({
                where: { id: lead.asignadoAId },
                select: { orgId: true },
            });
            if (user?.orgId) {
                orgId = user.orgId;
                fixedViaUser++;
            }
        }

        if (!orgId) {
            unresolvable++;
            continue;
        }

        if (!DRY_RUN) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { orgId },
            });
        } else {
            console.log(`[DRY_RUN] Would update lead ${lead.id} → orgId=${orgId}`);
        }
    }

    console.log("\n[backfill] Summary:");
    console.log(`  Fixed via proyecto: ${fixedViaProyecto}`);
    console.log(`  Fixed via asignadoA: ${fixedViaUser}`);
    console.log(`  Unresolvable (null after backfill): ${unresolvable}`);

    if (unresolvable > 0) {
        console.warn(`[backfill] WARNING: ${unresolvable} leads remain with null orgId.`);
        console.warn(`  These will only be accessible by ADMIN users.`);
        console.warn(`  To assign them manually, set SEVENTOOP_MAIN_ORG_ID in .env`);
        console.warn(`  and run: UPDATE leads SET "orgId" = '<orgId>' WHERE "orgId" IS NULL;`);
    }

    if (DRY_RUN) {
        console.log("\n[backfill] DRY RUN complete. Run with DRY_RUN=false to apply.");
    } else {
        console.log("\n[backfill] Backfill applied successfully.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
