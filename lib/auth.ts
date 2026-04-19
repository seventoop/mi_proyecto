import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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

                const email = credentials.email.toLowerCase().trim();

                const user = await prisma.user.findUnique({
                    where: { email },
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

                if (!user || !user.password) {
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
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 horas
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            // Only Google needs the linking/upsert step. Credentials already authorized().
            if (account?.provider !== "google") return true;

            const email = (profile as any)?.email?.toLowerCase()?.trim();
            const emailVerified = (profile as any)?.email_verified;
            const googleSub = (profile as any)?.sub ?? account.providerAccountId;
            const fullName =
                (profile as any)?.name ||
                user?.name ||
                email?.split("@")[0] ||
                "Usuario";
            const picture = (profile as any)?.picture || user?.image || null;

            if (!email || emailVerified !== true) {
                // Strict: require Google to explicitly assert email_verified === true
                // before linking/creating accounts (prevents account-takeover via
                // unverified email assertions).
                return false;
            }

            // Upsert: link by email if user already exists, else create a new one
            // with safe defaults that match the existing CredentialsProvider flow.
            const existing = await prisma.user.findUnique({
                where: { email },
                select: { id: true, googleId: true, avatar: true, nombre: true },
            });

            if (existing) {
                // Link Google account on first Google sign-in for this email
                if (!existing.googleId || !existing.avatar) {
                    await prisma.user.update({
                        where: { id: existing.id },
                        data: {
                            googleId: existing.googleId ?? googleSub,
                            avatar: existing.avatar ?? picture,
                        },
                    });
                }
                (user as any).id = existing.id;
            } else {
                const created = await prisma.user.create({
                    data: {
                        email,
                        googleId: googleSub,
                        nombre: fullName,
                        avatar: picture,
                        // password stays null — OAuth-only account
                        // rol, kycStatus, riskLevel, etc. use schema defaults
                    },
                    select: { id: true },
                });
                (user as any).id = created.id;
            }

            return true;
        },
        async jwt({ token, user, trigger }) {
            // Initial sign-in: populate token from the authorize() / signIn() return value
            if (user) {
                token.id = (user as any).id;
                // For OAuth, role/orgId/kycStatus aren't on `user` — fetch from DB once
                if (!(user as any).role) {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: (user as any).id },
                        select: { rol: true, orgId: true, kycStatus: true, demoEndsAt: true },
                    });
                    if (dbUser) {
                        token.role = dbUser.rol;
                        token.orgId = dbUser.orgId;
                        token.kycStatus = dbUser.kycStatus;
                        token.demoEndsAt = dbUser.demoEndsAt
                            ? dbUser.demoEndsAt.toISOString()
                            : null;
                    }
                } else {
                    token.role = (user as any).role;
                    token.orgId = (user as any).orgId;
                    token.kycStatus = (user as any).kycStatus;
                    token.demoEndsAt = (user as any).demoEndsAt;
                }
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
