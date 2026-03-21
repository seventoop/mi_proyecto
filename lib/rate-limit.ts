import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

/**
 * Distributed Rate Limiting using Upstash Redis
 * 
 * In production/preview environments, we use Upstash Redis via REST to ensure
 * consistency across Vercel Serverless instances. In local development, we
 * strictly fallback to in-memory storage.
 */

const isDevelopment = process.env.NODE_ENV === "development";

// Initialize Upstash Redis client
let redis: Redis | null = null;
if (!isDevelopment) {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    } else {
        console.warn("[RateLimit] UPSTASH_REDIS environment variables missing in non-development environment.");
    }
}

// Strictly development-only fallback
type RateLimitEntry = {
    count: number;
    resetAt: number;
};
const localRateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
    limit: number;      // Max requests
    windowMs: number;   // Time window in ms
    keyPrefix?: string; // Optional prefix for the key
}

/**
 * Standard security policies as per SevenToop Hardening spec.
 */
export const RATE_LIMIT_POLICIES = {
    AUTH: { limit: 5, windowMs: 60 * 1000, keyPrefix: "rl:auth:" },           // 5 req/min per IP (Hardened)
    RESET: { limit: 5, windowMs: 60 * 1000, keyPrefix: "rl:reset:" },         // 5 req/min per IP
    PUBLIC_FORM: { limit: 10, windowMs: 60 * 1000, keyPrefix: "rl:form:" },   // 10 req/min per IP
    WEBHOOK: { limit: 30, windowMs: 60 * 1000, keyPrefix: "rl:webhook:" },    // 30 req/min per source
    GENERAL_API: { limit: 60, windowMs: 60 * 1000, keyPrefix: "rl:api:" },    // 60 req/min per user
};

/**
 * Checks if a request should be rate limited.
 * Supports both Redis (Production) and In-Memory (Dev only).
 */
export async function checkRateLimit(identifier: string, options: RateLimitOptions): Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
}> {
    const { limit, windowMs, keyPrefix = "" } = options;
    const key = `${keyPrefix}${identifier}`;
    const now = Date.now();

    // PRODUCTION: Redis logic
    if (redis && !isDevelopment) {
        try {
            // Using a simple atomic increment + expire strategy
            const pipe = redis.pipeline();
            pipe.incr(key);
            pipe.pexpire(key, windowMs);
            const results = await pipe.exec();
            
            const count = (results[0] as number) || 0;
            const allowed = count <= limit;
            const remaining = Math.max(0, limit - count);
            const reset = now + windowMs; 

            return { allowed, remaining, reset };
        } catch (error) {
            console.error("[RateLimit] Redis error, soft-failing to allow request:", error);
            // @security-note: We allow the request if Redis is down to maintain availability
            return { allowed: true, remaining: 1, reset: now + windowMs };
        }
    }

    // DEVELOPMENT: Strictly in-memory fallback
    if (isDevelopment) {
        let entry = localRateLimitMap.get(key);

        if (!entry || now > entry.resetAt) {
            entry = { count: 1, resetAt: now + windowMs };
            localRateLimitMap.set(key, entry);
            return {
                allowed: true,
                remaining: limit - 1,
                reset: entry.resetAt
            };
        }

        entry.count++;
        const allowed = entry.count <= limit;
        const remaining = Math.max(0, limit - entry.count);

        return { allowed, remaining, reset: entry.resetAt };
    }

    // Fallback if Redis is missing in non-dev: SOFT FAIL for availability
    console.warn("[RateLimit] Missing rate limiting backend in production. Allowing request (Soft-Fail).");
    return { allowed: true, remaining: 1, reset: now + windowMs };
}

/**
 * Helper to get client IP from NextRequest
 */
export function getClientIp(req: Request | NextRequest): string {
    const xForwardedFor = (req.headers.get("x-forwarded-for") || "").split(",")[0];
    const xRealIp = req.headers.get("x-real-ip");

    return xForwardedFor || xRealIp || "127.0.0.1";
}
