import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { createGooglePreRegistrationToken } from "@/lib/auth/google-pre-registration";

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
                        googleId: true,
                        nombre: true,
                        rol: true,
                        orgId: true,
                        kycStatus: true,
                        demoEndsAt: true,
                    }
                });

                // Anti-enumeration: same generic error when user does not exist.
                if (!user) {
                    throw new Error("Credenciales inválidas");
                }

                // User exists but only registered with Google (no password set).
                // Surface a specific, non-leaky error so the UI can guide them.
                if (!user.password && user.googleId) {
                    throw new Error("GOOGLE_ONLY_ACCOUNT");
                }

                // User exists but has no password and no googleId — should not
                // happen normally; treat as generic invalid creds.
                if (!user.password) {
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
        maxAge: 24 * 60 * 60,
    },
    callbacks: {
        async signIn({ user, account, profile }) {
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

            const emailMask = email ? `${email.substring(0, 3)}***@${email.split("@")[1] ?? ""}` : "(no-email)";

            if (!email || emailVerified !== true) {
                console.warn(`[AUTH] google signIn rejected: missing email or unverified (emailVerified=${emailVerified})`);
                return false;
            }

            const existing = await prisma.user.findUnique({
                where: { email },
                select: { id: true, googleId: true, avatar: true, nombre: true },
            });

            if (existing) {
                const needsLink = !existing.googleId;
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
                    (user as any).email = email;
                    (user as any).role = (await prisma.user.findUnique({
                        where: { id: existing.id },
                        select: { rol: true, orgId: true, kycStatus: true, demoEndsAt: true },
                    }))?.rol;
                console.log(`[AUTH] google signIn ok: provider=google email=${emailMask} existing=true googleIdLinked=${needsLink} -> true`);
                return true;
            }

            const token = createGooglePreRegistrationToken({
                email,
                googleSub,
                fullName,
                picture,
            });

            console.log(`[AUTH] google signIn pre-registration: provider=google email=${emailMask} existing=false -> /google-register`);
            return `/google-register?token=${encodeURIComponent(token)}`;
        },
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = (user as any).id;
                token.email = (user as any).email ?? token.email;
                // Always re-fetch googleId / hasPassword for the JWT — these are
                // needed downstream (e.g. /forgot-password shows a self-service
                // hint to authenticated only-Google users) and they are not
                // included on the `user` object that next-auth passes here.
                const dbUser = await prisma.user.findUnique({
                    where: { id: (user as any).id },
                    select: { rol: true, orgId: true, kycStatus: true, demoEndsAt: true, email: true, googleId: true, password: true },
                });
                if (dbUser) {
                    if (!(user as any).role) {
                        token.role = dbUser.rol;
                        token.orgId = dbUser.orgId;
                        token.kycStatus = dbUser.kycStatus;
                        token.demoEndsAt = dbUser.demoEndsAt
                            ? dbUser.demoEndsAt.toISOString()
                            : null;
                        token.email = dbUser.email;
                    } else {
                        token.role = (user as any).role;
                        token.orgId = (user as any).orgId;
                        token.kycStatus = (user as any).kycStatus;
                        token.demoEndsAt = (user as any).demoEndsAt;
                    }
                    token.googleId = dbUser.googleId;
                    token.hasPassword = Boolean(dbUser.password);
                } else if (!(user as any).role) {
                    // No DB row; fall through with whatever the user object has.
                    token.role = (user as any).role;
                    token.orgId = (user as any).orgId;
                    token.kycStatus = (user as any).kycStatus;
                    token.demoEndsAt = (user as any).demoEndsAt;
                }
                token.lastDbSync = Math.floor(Date.now() / 1000);
                return token;
            }

            const DB_SYNC_INTERVAL_S = 5 * 60;
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - (token.lastDbSync ?? 0);
            const needsSync = trigger === "update" || elapsed >= DB_SYNC_INTERVAL_S;

            if (token.id && needsSync) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id },
                    select: { rol: true, orgId: true, kycStatus: true, demoEndsAt: true, email: true, googleId: true, password: true }
                });
                if (dbUser) {
                    token.role = dbUser.rol;
                    token.orgId = dbUser.orgId;
                    token.kycStatus = dbUser.kycStatus;
                    token.demoEndsAt = dbUser.demoEndsAt ? dbUser.demoEndsAt.toISOString() : null;
                    token.email = dbUser.email;
                    token.googleId = dbUser.googleId;
                    token.hasPassword = Boolean(dbUser.password);
                    token.lastDbSync = now;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.email = token.email ?? session.user.email;
                session.user.role = token.role;
                session.user.orgId = token.orgId;
                session.user.kycStatus = token.kycStatus;
                session.user.demoEndsAt = token.demoEndsAt;
                session.user.googleId = token.googleId ?? null;
                // Pass `hasPassword` through verbatim (including `undefined`)
                // instead of defaulting to `false`. Pre-existing JWTs minted
                // before this field was added would otherwise look like
                // "no password" until the next 5-min DB sync, which would
                // briefly show the only-Google self-service hint to users
                // who actually have a password. Consumers should treat
                // `undefined` as "unknown" and check strictly for `=== false`
                // before acting on it (see app/(auth)/forgot-password/page.tsx).
                session.user.hasPassword = token.hasPassword;
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
