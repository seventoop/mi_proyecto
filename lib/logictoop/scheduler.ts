import { db } from "@/lib/db";
import { dispatchTrigger } from "./dispatcher";

/**
 * Main entry point for scheduled LogicToop tasks.
 * Should be called by a cron job or a background worker every few minutes.
 */
export async function processScheduledAutomations() {
    console.log("[LogicToop Scheduler] Starting scheduled processing...");
    
    try {
        // 1. Check for time-based triggers (Phase 2)
        await checkLeadsNoResponse();
        await checkCuotasDueSoon();

        // 2. Resume WAITING executions (Phase 3)
        await processResumingAutomations();

        // 3. Process Job Queue (Phase 3 - Retries & Async Actions)
        await processQueuedJobs();

    } catch (error) {
        console.error("[LogicToop Scheduler] Global processing error:", error);
    }
    
    console.log("[LogicToop Scheduler] Cycle finished.");
}

/**
 * Resumes executions that were paused by a WAIT step.
 */
async function processResumingAutomations() {
    const resumingExecs = await (db as any).logicToopExecution.findMany({
        where: {
            status: "WAITING",
            resumeAt: { lte: new Date() }
        },
        include: { flow: true }
    });

    if (resumingExecs.length > 0) {
        console.log(`[LogicToop Scheduler] Found ${resumingExecs.length} executions to resume.`);
        const { executeFlow } = await import("./dispatcher");
        
        for (const exec of resumingExecs) {
            try {
                // Mark it as RUNNING first to avoid collision if two schedulers run
                await (db as any).logicToopExecution.update({
                    where: { id: exec.id },
                    data: { status: "RUNNING" }
                });
                
                await executeFlow(exec.flow, exec.triggerPayload, exec.id);
            } catch (error) {
                console.error(`[LogicToop Scheduler] Failed to resume execution ${exec.id}:`, error);
            }
        }
    }
}

/**
 * Processes the LogicToopJob queue for retries and deferred actions.
 */
async function processQueuedJobs() {
    const { processLogicToopJobs } = await import("./worker");
    await processLogicToopJobs();
}

/**
 * TRIGGER: LEAD_NO_RESPONSE
 * Checks for leads that haven't been responded to in X minutes.
 * We'll check for leads created more than X minutes ago that are still in 'INICIAL' stage
 * (or similar) and haven't had a manual interaction recorded.
 */
async function checkLeadsNoResponse() {
    // Get all active flows with this trigger
    const flows = await (db as any).logicToopFlow.findMany({
        where: { 
            triggerType: "LEAD_NO_RESPONSE",
            activo: true
        }
    });

    if (flows.length === 0) return;

    // For each unique organization that has this flow active
    const orgIds = Array.from(new Set(flows.map((f: any) => f.orgId as string)));

    for (const orgId of orgIds) {
        // Find leads for this org that:
        // 1. Are in an initial stage (e.g. stage with index 0 or named "NUEVO")
        // 2. Were created more than N minutes ago
        // 3. Haven't been processed by this trigger yet in the last X hours
        
        // For MVP, we'll look for leads created > 30 mins ago in the last 24h
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60000);

        const leads = await db.lead.findMany({
            where: {
                orgId: orgId as string,
                createdAt: {
                    lt: thirtyMinsAgo,
                    gt: oneDayAgo
                }
            }
        });

        for (const lead of leads) {
            // Deduplication: Check if this specific lead was already processed for this trigger recently
            const alreadyProcessed = await (db as any).logicToopExecution.findFirst({
                where: {
                    flow: {
                        triggerType: "LEAD_NO_RESPONSE",
                        orgId: orgId as string
                    },
                    triggerPayload: {
                        path: ["leadId"],
                        equals: lead.id
                    }
                }
            });

            if (!alreadyProcessed) {
                console.log(`[LogicToop Scheduler] Triggering LEAD_NO_RESPONSE for lead ${lead.id} in org ${orgId}`);
                await dispatchTrigger("LEAD_NO_RESPONSE", { 
                    leadId: lead.id, 
                    nombre: lead.nombre, 
                    email: lead.email, 
                    telefono: lead.telefono 
                }, orgId as string);
            }
        }
    }
}

/**
 * TRIGGER: CUOTA_DUE_SOON
 * Checks for upcoming payment quotas.
 * Bounded implementation as requested if model is not fully ready.
 */
async function checkCuotasDueSoon() {
    // TODO: Integrate with the actual payment/quota model when it's stabilized.
    // For now, we provide the structure and a safe logging point.
    console.log("[LogicToop Scheduler] CUOTA_DUE_SOON: Checking for upcoming quotas (Bounded implementation)");
}
