import { db } from "@/lib/db";
import { getNextBatch, claimJob, updateJobStatus } from "./queue";
import { performAction } from "./actions";

/**
 * LogicToop V1 Worker
 * Processes queued jobs for retries and asynchronous actions.
 */

export async function processLogicToopJobs() {
    console.log("[LogicToop Worker] Checking for jobs...");
    const jobs = await getNextBatch(20);
    
    if (jobs.length === 0) return;
    
    console.log(`[LogicToop Worker] Processing ${jobs.length} jobs.`);

    for (const job of jobs as any[]) {
        const claimed = await claimJob(job.id);
        if (!claimed) continue;

        try {
            console.log(`[LogicToop Worker] Executing job ${job.id} (Action: ${job.actionType})`);
            
            const result = await performAction(job.actionType, job.config, job.payload, job.orgId);
            
            await updateJobStatus(job.id, "COMPLETED");
            
            // Log success to the main execution record
            await appendLogToExecution(job.executionId, {
                action: job.actionType,
                status: "SUCCESS_QUEUED",
                details: { result, fromQueue: true },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[LogicToop Worker] Job ${job.id} failed:`, msg);

            // Check retries
            const currentAttempts = job.attempts + 1;
            const maxRetries = job.maxRetries || 0;

            if (currentAttempts <= maxRetries) {
                const retryDelay = (job.config?.retryDelay || 5); // Default 5 mins
                const nextScheduled = new Date();
                nextScheduled.setMinutes(nextScheduled.getMinutes() + retryDelay);

                console.log(`[LogicToop Worker] Job ${job.id} will retry at ${nextScheduled.toISOString()} (Attempt ${currentAttempts}/${maxRetries})`);

                await (db as any).logicToopJob.update({
                    where: { id: job.id },
                    data: {
                        status: "RETRYING",
                        scheduledAt: nextScheduled,
                        attempts: currentAttempts
                    }
                });

                await appendLogToExecution(job.executionId, {
                    action: job.actionType,
                    status: "RETRYING",
                    details: { error: msg, attempt: currentAttempts, nextRetry: nextScheduled },
                    timestamp: new Date().toISOString()
                });
            } else {
                await updateJobStatus(job.id, "FAILED", msg);

                await appendLogToExecution(job.executionId, {
                    action: job.actionType,
                    status: "FAILED_QUEUED",
                    details: { error: msg, finalAttempt: true },
                    timestamp: new Date().toISOString()
                });
                
                // Also update the main execution status to FAILED
                await (db as any).logicToopExecution.update({
                    where: { id: job.executionId },
                    data: { status: "FAILED", errorMessage: `Job failed after ${currentAttempts} attempts: ${msg}` }
                });
            }
        }
    }
}

/**
 * Helper to append logs to LogicToopExecution.
 */
async function appendLogToExecution(executionId: string, logEntry: any) {
    const execution = await (db as any).logicToopExecution.findUnique({
        where: { id: executionId },
        select: { logs: true }
    });

    if (execution) {
        const currentLogs = Array.isArray(execution.logs) ? execution.logs : [];
        await (db as any).logicToopExecution.update({
            where: { id: executionId },
            data: {
                logs: [...currentLogs, logEntry]
            }
        });
    }
}
