import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            orgId: string | null;
            kycStatus: string;
            demoEndsAt: string | null;
            googleId?: string | null;
            hasPassword?: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        role: string;
        orgId: string | null;
        kycStatus: string;
        demoEndsAt: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        orgId: string | null;
        kycStatus: string;
        demoEndsAt: string | null;
        googleId?: string | null;
        hasPassword?: boolean;
        lastDbSync?: number; // unix timestamp (seconds) of last DB refetch
    }
}
