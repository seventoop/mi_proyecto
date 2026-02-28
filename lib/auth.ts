import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
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
                    demoEndsAt: user.demoEndsAt,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 horas
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.orgId = (user as any).orgId;
                token.kycStatus = (user as any).kycStatus;
                token.demoEndsAt = (user as any).demoEndsAt;
            }

            // High-security refetch: If we are already logged in, 
            // periodically or on trigger, refresh from DB
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { rol: true, orgId: true, kycStatus: true, demoEndsAt: true }
                });
                if (dbUser) {
                    token.role = dbUser.rol;
                    token.orgId = dbUser.orgId;
                    token.kycStatus = dbUser.kycStatus;
                    token.demoEndsAt = dbUser.demoEndsAt;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).orgId = token.orgId;
                (session.user as any).kycStatus = token.kycStatus;
                (session.user as any).demoEndsAt = token.demoEndsAt;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
};
