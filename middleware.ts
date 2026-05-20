import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { checkRateLimit, getClientIp, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

// Cookie-only public preferences can bypass auth while keeping API rate limiting active.
const PUBLIC_API_PATHS = new Set(["/api/set-language"]);

async function rateLimitPublicApi(req: NextRequest) {
    const ip = getClientIp(req);
    const { allowed } = await checkRateLimit(ip, RATE_LIMIT_POLICIES.GENERAL_API);

    if (!allowed) {
        return new NextResponse(
            JSON.stringify({ error: "Demasiadas solicitudes a la API." }),
            { status: 429 }
        );
    }

    return NextResponse.next();
}

const authMiddleware = withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;

        // Admin routes: require ADMIN or SUPERADMIN role
        if (pathname.startsWith("/dashboard/admin")) {
            const role = token?.role as string | undefined;
            if (role !== "ADMIN" && role !== "SUPERADMIN") {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }

        // --- Rate Limiting (Production Grade) ---
        const ip = getClientIp(req);
        const userId = token?.sub as string | undefined;

        // 1. Auth & Signin (IP based)
        if ((pathname === "/api/auth/signin" || pathname.startsWith("/api/auth/callback/credentials")) && req.method === "POST") {
            const { allowed } = await checkRateLimit(ip, RATE_LIMIT_POLICIES.AUTH);
            if (!allowed) {
                console.warn(`[AUTH] Rate limit exceeded for IP: ${ip}`);
                return new NextResponse(
                    JSON.stringify({ error: "Demasiados intentos. Intenta de nuevo en un minuto." }),
                    { status: 429, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // 2. Password Reset (IP based)
        if (pathname === "/reset-password" || pathname.includes("forgot-password")) {
            const { allowed } = await checkRateLimit(ip, RATE_LIMIT_POLICIES.RESET);
            if (!allowed) {
                return new NextResponse(
                    JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo más tarde." }),
                    { status: 429, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // 3. Sensitive Webhooks (Source/IP based)
        if (pathname.startsWith("/api/webhooks")) {
            const { allowed } = await checkRateLimit(ip, RATE_LIMIT_POLICIES.WEBHOOK);
            if (!allowed) {
                return new NextResponse(
                    JSON.stringify({ error: "Exceso de tráfico" }),
                    { status: 429 }
                );
            }
        }

        // 4. General API (User based if authenticated, else IP)
        if (
            pathname.startsWith("/api/") &&
            !pathname.startsWith("/api/auth") &&
            !pathname.startsWith("/api/webhooks") &&
            pathname !== "/api/upload/360"
        ) {
            const identifier = userId || ip;
            const { allowed } = await checkRateLimit(identifier, RATE_LIMIT_POLICIES.GENERAL_API);
            if (!allowed) {
                return new NextResponse(
                    JSON.stringify({ error: "Demasiadas solicitudes a la API." }),
                    { status: 429 }
                );
            }
        }

        // Demo / KYC enforcement ...
        const isKycRoute = pathname.startsWith("/onboarding/kyc");
        const isDemoExpiredRoute = pathname.startsWith("/demo-expired");

        if (!isKycRoute && !isDemoExpiredRoute && !pathname.startsWith("/api/")) {
            const role = token?.role as string | undefined;
            const kycStatus = token?.kycStatus as string | undefined;
            const demoEndsAt = token?.demoEndsAt as string | Date | null | undefined;

            // --- KYC/Demo Bypass for ADMIN & SUPERADMIN ---
            const isPrivileged = role === "ADMIN" || role === "SUPERADMIN";

            if (!isPrivileged) {
                // Demo expired but KYC not yet triggered → send to KYC onboarding
                if (
                    kycStatus === "NINGUNO" &&
                    demoEndsAt &&
                    new Date(demoEndsAt) < new Date()
                ) {
                    return NextResponse.redirect(new URL("/onboarding/kyc", req.url));
                }

                // KYC window expired without submission → send to demo-expired
                if (kycStatus === "DEMO_EXPIRADO") {
                    return NextResponse.redirect(new URL("/demo-expired", req.url));
                }
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // API routes handle their own auth via guards — allow all through for rate limiting.
            // Page routes (dashboard, onboarding) require a valid session token.
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;
                if (pathname.startsWith("/api/")) return true;
                return !!token;
            },
        },
    }
);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
    if (PUBLIC_API_PATHS.has(req.nextUrl.pathname)) {
        return rateLimitPublicApi(req);
    }

    return authMiddleware(req as NextRequestWithAuth, event);
}

export const config = {
    matcher: [
        "/dashboard",
        "/dashboard/:path*",
        "/onboarding/:path*",
        "/demo-expired",
        "/reset-password",
        "/api/auth/signin",
        "/api/auth/callback/credentials",
        "/api/webhooks/:path*",
        // Include authenticated API routes for GENERAL_API rate limiting.
        // withAuth authorized callback returns true for API routes regardless of token
        // so unauthenticated API calls are handled by individual route guards, not here.
        "/api/:path*",
    ],
};
