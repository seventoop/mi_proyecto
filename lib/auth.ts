import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credenciales",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Contraseña", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email y contraseña son requeridos");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    select: {
                        id: true,
                        email: true,
                        password: true,
                        nombre: true,
                        rol: true,
                        orgId: true,
                        kycStatus: true,
                        demoEndsAt: true,
                    }
                });

                if (!user) {
                    // Generic error to avoid user enumeration
                    throw new Error("Credenciales inválidas");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error("Credenciales inválidas");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.nombre,
                    role: user.rol,
                    orgId: user.orgId,
                    kycStatus: user.kycStatus,
                    demoEndsAt: user.demoEndsAt ? user.demoEndsAt.toISOString() : null,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 horas
    },
    callbacks: {
        async jwt({ token, user, trigger }) {
            // Initial sign-in: populate token from the authorize() return value
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.orgId = user.orgId;
                token.kycStatus = user.kycStatus;
                token.demoEndsAt = user.demoEndsAt;
                token.lastDbSync = Math.floor(Date.now() / 1000);
                return token;
            }

            // Subsequent validations: only refetch from DB if TTL has elapsed
            // or if an explicit session update was triggered (e.g. SessionSyncHandler).
            // This prevents a DB query on every page navigation and API call.
            const DB_SYNC_INTERVAL_S = 5 * 60; // 5 minutes
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - (token.lastDbSync ?? 0);
            const needsSync = trigger === "update" || elapsed >= DB_SYNC_INTERVAL_S;

            if (token.id && needsSync) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id },
                    select: { rol: true, orgId: true, kycStatus: true, demoEndsAt: true }
                });
                if (dbUser) {
                    token.role = dbUser.rol;
                    token.orgId = dbUser.orgId;
                    token.kycStatus = dbUser.kycStatus;
                    token.demoEndsAt = dbUser.demoEndsAt ? dbUser.demoEndsAt.toISOString() : null;
                    token.lastDbSync = now;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.orgId = token.orgId;
                session.user.kycStatus = token.kycStatus;
                session.user.demoEndsAt = token.demoEndsAt;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    events: {
        async signIn({ user }) {
            try {
                const { audit } = await import("@/lib/actions/audit");
                await audit({
                    userId: user.id,
                    action: "AUTH_LOGIN_SUCCESS",
                    entity: "User",
                    entityId: user.id,
                    details: { email: user.email }
                });
            } catch (err) {
                console.error("[LoginAudit] Failed to log success:", err);
            }
        }
    }
};
