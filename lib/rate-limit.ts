import { NextRequest } from "next/server";

/**
 * Basic In-Memory Rate Limiter
 * 
 * Note: In a distributed production environment (e.g., Vercel Functions), 
 * this in-memory map will only persist per instance. For a 100% reliable 
 * global rate limit, Redis or a professional service like Upstash is recommended.
 * 
 * However, for a baseline protection, this helps prevent basic brute force and flooding.
 */

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
    limit: number;      // Max requests
    windowMs: number;   // Time window in ms
    keyPrefix?: string; // Optional prefix for the key
}

/**
 * Checks if a request should be rate limited.
 * Returns true if the request is ALLOWED, false if it should be BLOCKED (429).
 */
export function checkRateLimit(identifier: string, options: RateLimitOptions): {
    allowed: boolean;
    remaining: number;
    reset: number;
} {
    const { limit, windowMs, keyPrefix = "" } = options;
    const key = `${keyPrefix}${identifier}`;
    const now = Date.now();

    let entry = rateLimitMap.get(key);

    // If no entry or expired, reset
    if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + windowMs };
        rateLimitMap.set(key, entry);
        return {
            allowed: true,
            remaining: limit - 1,
            reset: entry.resetAt
        };
    }

    // Increment
    entry.count++;

    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);

    return {
        allowed,
        remaining,
        reset: entry.resetAt
    };
}

/**
 * Helper to get client IP from NextRequest
 */
export function getClientIp(req: Request | NextRequest): string {
    // Check for standard proxy headers
    const xForwardedFor = (req.headers.get("x-forwarded-for") || "").split(",")[0];
    const xRealIp = req.headers.get("x-real-ip");

    return xForwardedFor || xRealIp || "127.0.0.1";
}
