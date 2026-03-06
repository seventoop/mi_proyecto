import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

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

        // Demo / KYC enforcement (skip onboarding and demo-expired pages to avoid loops)
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
