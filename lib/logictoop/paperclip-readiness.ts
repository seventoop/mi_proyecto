export type PaperclipReadinessStatus = "READY_FOR_STAGING_DESIGN" | "BLOCKED" | "WARNING_ONLY";

export interface PaperclipReadinessCheck {
    key: string;
    status: "pass" | "warning" | "blocker";
    message: string;
    requiredForReal: boolean;
}

export function getPaperclipStagingReadiness(): { status: PaperclipReadinessStatus, checks: PaperclipReadinessCheck[] } {
    const checks: PaperclipReadinessCheck[] = [];
    let hasBlocker = false;
    let hasWarning = false;

    // 1. Check FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION
    const isRealConnectionEnabled = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";
    if (isRealConnectionEnabled) {
        checks.push({
            key: "REAL_CONNECTION_FLAG",
            status: "blocker",
            message: "FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION is active. This is blocked in the current phase.",
            requiredForReal: true
        });
        hasBlocker = true;
    } else {
        checks.push({
            key: "REAL_CONNECTION_FLAG",
            status: "pass",
            message: "FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION is safely disabled.",
            requiredForReal: true
        });
    }

    // 2. Check Sandbox Flag (just for info, not a blocker)
    const isSandboxEnabled = process.env.FEATURE_FLAG_PAPERCLIP_SANDBOX === "true";
    checks.push({
        key: "SANDBOX_FLAG",
        status: "pass",
        message: `FEATURE_FLAG_PAPERCLIP_SANDBOX is ${isSandboxEnabled ? "active" : "inactive"}.`,
        requiredForReal: false
    });

    // 3. Webhook Secret Configuration
    const secret = process.env.PAPERCLIP_WEBHOOK_SECRET;
    if (!secret) {
        checks.push({
            key: "WEBHOOK_SECRET",
            status: "warning",
            message: "PAPERCLIP_WEBHOOK_SECRET is not configured. Required before real staging.",
            requiredForReal: true
        });
        hasWarning = true;
    } else {
        checks.push({
            key: "WEBHOOK_SECRET",
            status: "pass",
            message: "PAPERCLIP_WEBHOOK_SECRET is configured.",
            requiredForReal: true
        });
    }

    // 4. Base URL Configuration
    const baseUrl = process.env.PAPERCLIP_BASE_URL;
    if (baseUrl) {
        if (isRealConnectionEnabled) {
            checks.push({
                key: "BASE_URL",
                status: "blocker",
                message: "PAPERCLIP_BASE_URL exists while REAL_CONNECTION is active. Blocked.",
                requiredForReal: true
            });
            hasBlocker = true;
        } else {
             checks.push({
                key: "BASE_URL",
                status: "warning",
                message: "PAPERCLIP_BASE_URL exists but real connection is disabled. Safe, but unusual.",
                requiredForReal: false
            });
            hasWarning = true;
        }
    } else {
         checks.push({
            key: "BASE_URL",
            status: "pass",
            message: "PAPERCLIP_BASE_URL is not configured (safe for now).",
            requiredForReal: true
        });
    }
    
    // We assume the stub, security, contract script, spec, and webhook exist. 
    // Their physical existence is validated by the smoke script, not here.

    let status: PaperclipReadinessStatus = "READY_FOR_STAGING_DESIGN";
    if (hasBlocker) {
        status = "BLOCKED";
    } else if (hasWarning) {
        status = "WARNING_ONLY";
    }

    return { status, checks };
}
