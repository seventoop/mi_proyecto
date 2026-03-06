import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Rate limiting map for login (single instance only)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Cleanup old entries every hour
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        const windowMs = 15 * 60 * 1000;
        for (const [ip, data] of loginAttempts.entries()) {
            if (now - data.firstAttempt > windowMs) {
                loginAttempts.delete(ip);
            }
        }
    }, 60 * 60 * 1000);
}

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;

        // Admin routes: require ADMIN or SUPERADMIN role
        if (pathname.startsWith("/dashboard/admin")) {
            const role = token?.role as string | undefined;
            if (role !== "ADMIN" && role !== "SUPERADMIN") {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }

        // --- Rate Limiting for Login (STP-LANDING-AUTH-FIXES-V1) ---
        // Simple in-memory map (resets on server restart/redeploy)
        if (pathname === "/api/auth/signin" || pathname.startsWith("/api/auth/callback/credentials")) {
            const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown";
            const now = Date.now();
            const windowMs = 15 * 60 * 1000; // 15 minutes
            const maxAttempts = 10;

            const rateData = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

            // Reset if window expired
            if (now - rateData.firstAttempt > windowMs) {
                rateData.count = 1;
                rateData.firstAttempt = now;
            } else {
                rateData.count++;
            }

            loginAttempts.set(ip, rateData);

            if (rateData.count > maxAttempts) {
                console.warn(`[AUTH] Rate limit exceeded for IP: ${ip}`);
                return new NextResponse(
                    JSON.stringify({ error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }),
                    { status: 429, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // Demo / KYC enforcement ...
        const isKycRoute = pathname.startsWith("/onboarding/kyc");
        const isDemoExpiredRoute = pathname.startsWith("/demo-expired");

        if (!isKycRoute && !isDemoExpiredRoute) {
            const kycStatus = token?.kycStatus as string | undefined;
            const demoEndsAt = token?.demoEndsAt as string | Date | null | undefined;

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

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/onboarding/:path*",
        "/demo-expired",
    ],
};
