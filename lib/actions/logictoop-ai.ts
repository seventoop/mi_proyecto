"use server";

export async function getPendingApprovals(orgId: string) {
    // SECURITY FLAG: Prevents querying non-existent tables if DB is not migrated
    if (process.env.FEATURE_FLAG_LOGICTOOP_AI_UI !== "true") {
        return { success: true, data: [] };
    }

    // TODO: In subsequent subphases, add real DB query here
    return { success: true, data: [] };
}
