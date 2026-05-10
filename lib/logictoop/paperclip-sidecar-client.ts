export type PaperclipSidecarMode = "DISABLED" | "STUB" | "SANDBOX" | "REAL";

export interface PaperclipSidecarRequest {
    taskId: string;
    orgId: string;
    agentKey?: string;
    executionId?: string;
    idempotencyKey: string;
    inputPayload: Record<string, any>;
    mode: "dry_run" | "sandbox" | "production";
    callbackUrl?: string;
    requestedAt: string;
}

export interface PaperclipSidecarResponse {
    success: boolean;
    paperclipRunId?: string;
    status: string;
    message: string;
    metadata?: Record<string, any>;
}

export function getPaperclipMode(): PaperclipSidecarMode {
    const isFeatureEnabled = process.env.FEATURE_FLAG_PAPERCLIP === "true";
    const isRealConnectionEnabled = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";
    const isSandboxEnabled = process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX === "true";

    if (!isFeatureEnabled) {
        return "DISABLED";
    }

    if (isSandboxEnabled && !isRealConnectionEnabled) {
        return "SANDBOX";
    }

    if (!isRealConnectionEnabled) {
        return "STUB";
    }

    // Both flags are true. This is phase 10, REAL connection is blocked.
    // We return REAL, but the dispatcher will catch it and block it.
    return "REAL";
}

export async function dispatchToPaperclipSidecar(request: PaperclipSidecarRequest): Promise<PaperclipSidecarResponse> {
    const mode = getPaperclipMode();

    if (mode === "DISABLED") {
        return {
            success: false,
            status: "DISABLED",
            message: "Paperclip sidecar disabled",
        };
    }

    if (mode === "STUB") {
        return {
            success: true,
            status: "STUB_ACCEPTED",
            paperclipRunId: "stub_" + request.taskId,
            message: "Paperclip sidecar stub accepted. No external call executed.",
            metadata: { sideEffects: false, externalCall: false }
        };
    }

    if (mode === "SANDBOX") {
        if (!request.taskId || !request.orgId || !request.idempotencyKey) {
            return {
                success: false,
                status: "SANDBOX_VALIDATION_ERROR",
                message: "Missing required fields for Sandbox mode (taskId, orgId, idempotencyKey)",
            };
        }
        
        if (request.mode !== "dry_run" && request.mode !== "sandbox") {
             return {
                success: false,
                status: "SANDBOX_VALIDATION_ERROR",
                message: "Invalid mode for Sandbox. Must be dry_run or sandbox.",
            };
        }

        const shortHash = request.idempotencyKey.substring(0, 8);
        return {
            success: true,
            status: "SANDBOX_COMPLETED_NO_SIDE_EFFECTS",
            paperclipRunId: `sandbox_${request.taskId}_${shortHash}`,
            message: "Paperclip sandbox simulated successfully. No external call executed.",
            metadata: {
                mode: "sandbox",
                externalCall: false,
                sideEffects: false,
                simulated: true,
                contractVersion: "v0"
            }
        };
    }

    // mode === "REAL"
    // REAL is blocked for this phase.
    return {
        success: false,
        status: "NOT_IMPLEMENTED",
        message: "REAL Paperclip connection is not implemented in this phase.",
    };
}
