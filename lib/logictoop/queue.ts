import { db } from "@/lib/db";

/**
 * LogicToop V1 Queue System
 * Handles DB-backed job enqueuing for automation actions.
 */

export async function enqueueAction(
    executionId: string, 
    orgId: string, 
    action: { type: string, config?: any }, 
    payload: any, 
    scheduledAt: Date = new Date()
) {
    return await (db as any).logicToopJob.create({
        data: {
            executionId,
            orgId,
            actionType: action.type,
            config: action.config || {},
            payload: payload,
            status: "PENDING",
            scheduledAt,
            attempts: 0,
            maxRetries: action.config?.maxRetries || 0
        }
    });
}

/**
 * Retrieves the next batch of pending or retrying jobs.
 */
export async function getNextBatch(batchSize: number = 10) {
    return await (db as any).logicToopJob.findMany({
        where: {
            status: { in: ["PENDING", "RETRYING"] },
            scheduledAt: { lte: new Date() }
        },
        orderBy: { scheduledAt: "asc" },
        take: batchSize
    });
}

/**
 * Atomically marks a job as RUNNING to prevent double processing.
 */
export async function claimJob(jobId: string) {
    try {
        return await (db as any).logicToopJob.update({
            where: { 
                id: jobId, 
                status: { in: ["PENDING", "RETRYING"] } 
            },
            data: { 
                status: "RUNNING", 
                updatedAt: new Date() 
            }
        });
    } catch (error) {
        // Under high concurrency, another worker might have claimed it first
        return null;
    }
}

/**
 * Updates a job outcome.
 */
export async function updateJobStatus(jobId: string, status: string, error?: string) {
    return await (db as any).logicToopJob.update({
        where: { id: jobId },
        data: { 
            status, 
            attempts: { increment: status === "RETRYING" ? 1 : 0 },
            updatedAt: new Date()
        }
    });
}
