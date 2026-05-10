import { createHmac, timingSafeEqual } from "crypto";

export function createPaperclipIdempotencyKey(params: {
    taskId: string;
    orgId: string;
    executionId?: string;
    action: string;
    timestampBucket: string;
}): string {
    const { taskId, orgId, executionId, action, timestampBucket } = params;
    const base = `${orgId}:${executionId || 'no_exec'}:${taskId}:${action}:${timestampBucket}`;
    
    // We create a hash to ensure length and deterministic behavior
    const hash = createHmac("sha256", "internal_idempotency_salt")
        .update(base)
        .digest("hex");
        
    return `ik_${hash.substring(0, 16)}`;
}

export function signPaperclipPayload(payload: Record<string, any>, secret: string): string | null {
    if (!secret || typeof secret !== "string") {
        console.error("[PaperclipSecurity] Cannot sign payload: Invalid or missing secret");
        return null;
    }

    try {
        const stringifiedPayload = JSON.stringify(payload);
        const signature = createHmac("sha256", secret)
            .update(stringifiedPayload)
            .digest("hex");
        return signature;
    } catch (error) {
        console.error("[PaperclipSecurity] Error signing payload:", error);
        return null;
    }
}

export function verifyPaperclipSignature(payload: string, signature: string, secret: string): boolean {
    if (!secret || !signature || !payload) {
        return false;
    }

    try {
        const expectedSignature = createHmac("sha256", secret)
            .update(payload)
            .digest("hex");
            
        // Use timingSafeEqual to prevent timing attacks
        const expectedBuffer = Buffer.from(expectedSignature, "hex");
        const actualBuffer = Buffer.from(signature, "hex");
        
        if (expectedBuffer.length !== actualBuffer.length) {
            return false;
        }

        return timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (error) {
        console.error("[PaperclipSecurity] Signature verification failed:", error);
        return false;
    }
}

export function sanitizePaperclipMetadata(metadata: Record<string, any>): Record<string, any> {
    if (!metadata || typeof metadata !== "object") return {};
    
    const sensitiveKeys = [
        "password", 
        "token", 
        "jwt", 
        "secret", 
        "apikey", 
        "authorization", 
        "email"
    ];
    
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase();
        
        // Skip sensitive keys
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            sanitized[key] = "[REDACTED]";
            continue;
        }
        
        // Handle nested objects safely (limit depth to 1 for simplicity and performance)
        if (value && typeof value === "object" && !Array.isArray(value)) {
             sanitized[key] = "[COMPLEX_OBJECT_TRUNCATED]";
             continue;
        }

        sanitized[key] = value;
    }
    
    return sanitized;
}
