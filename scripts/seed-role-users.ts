/**
 * scripts/seed-role-users.ts
 *
 * Idempotent bootstrap script for SevenToop role/permission testing.
 *
 * What it does:
 *   1. Ensures the canonical SUPERADMIN / ADMIN accounts exist (Juani, Dani,
 *      admin@seventoop.com) and that their `rol` is correct in the DB.
 *      → Passwords are ONLY written if you explicitly set the matching env
 *        variable. This keeps Google-OAuth-only users intact.
 *   2. Ensures one demo user per non-admin role (CLIENTE / INVERSOR /
 *      VENDEDOR / DESARROLLADOR) under a "demo-org" Organization, with a
 *      shared password taken from SEED_DEMO_PASSWORD (defaults to
 *      "Demo@123456" if the env var is not set — only acceptable in dev).
 *
 * Safety rails:
 *   - No credentials are hardcoded in runtime code (auth.ts, middleware,
 *     components). All secrets come from this script + env vars.
 *   - No special per-email logic in the app — login keeps using the normal
 *     credentials/Google flows.
 *   - Other users in the DB are NOT touched.
 *   - Passwords are always hashed with bcrypt (10 rounds).
 *   - Real-user passwords are NEVER overwritten unless you explicitly set
 *     the corresponding env var, so Google-only logins keep working.
 *
 * Run:
 *   npm run db:seed:users
 *
 * Recommended environments:
 *   - dev / staging / preview: safe to run any time (idempotent).
 *   - production: only run if you really want to (re)assert these roles. The
 *     script will NOT delete users, NOT reset passwords unless env vars are
 *     explicitly provided, and NOT touch other accounts.
 *
 * To rotate / set a real-user password (one-off, before running):
 *   SEED_SUPERADMIN_JUANI_PASSWORD='nueva-pass-fuerte' \
 *   SEED_SUPERADMIN_DANI_PASSWORD='otra-pass-fuerte' \
 *   SEED_ADMIN_SHARED_PASSWORD='pass-admin-compartido' \
 *   SEED_DEMO_PASSWORD='pass-demo-uniforme' \
 *     npm run db:seed:users
 *
 * To change the target emails, edit the REAL_USERS / DEMO_USERS arrays
 * below. Do not move that data into runtime code.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;
const DEFAULT_DEMO_PASSWORD = "Demo@123456";

type Role =
    | "SUPERADMIN"
    | "ADMIN"
    | "DESARROLLADOR"
    | "VENDEDOR"
    | "INVERSOR"
    | "CLIENTE";

type RealUser = {
    email: string;
    nombre: string;
    rol: Role;
    /** Env var name where the optional password lives. Password is only
     *  written if the env var is set — otherwise we leave the existing
     *  password (or null, for Google-only accounts) untouched. */
    passwordEnv: string;
    kycStatus?: string;
};

type DemoUser = {
    email: string;
    nombre: string;
    rol: Role;
    orgId?: string;
    kycStatus?: string;
};

const REAL_USERS: RealUser[] = [
    {
        email: "ascenzimarquezjuanignacio@gmail.com",
        nombre: "Juan Ignacio Ascenzi Marquez",
        rol: "SUPERADMIN",
        passwordEnv: "SEED_SUPERADMIN_JUANI_PASSWORD",
        kycStatus: "VERIFICADO",
    },
    {
        email: "dany76162@gmail.com",
        nombre: "Dani",
        rol: "SUPERADMIN",
        passwordEnv: "SEED_SUPERADMIN_DANI_PASSWORD",
        kycStatus: "VERIFICADO",
    },
    {
        email: "admin@seventoop.com",
        nombre: "SevenToop Admin",
        rol: "ADMIN",
        passwordEnv: "SEED_ADMIN_SHARED_PASSWORD",
        kycStatus: "VERIFICADO",
    },
];

async function upsertRealUser(user: RealUser) {
    const rawPassword = process.env[user.passwordEnv];
    const passwordHash = rawPassword
        ? await bcrypt.hash(rawPassword, BCRYPT_ROUNDS)
        : null;

    const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, password: true },
    });

    if (existing) {
        // Update role + display name + kyc; only touch password if env var
        // was explicitly provided (don't break Google-only logins).
        await prisma.user.update({
            where: { email: user.email },
            data: {
                nombre: user.nombre,
                rol: user.rol,
                kycStatus: user.kycStatus ?? "VERIFICADO",
                ...(passwordHash ? { password: passwordHash } : {}),
            },
        });
        return {
            email: user.email,
            rol: user.rol,
            action: "updated",
            password: passwordHash ? "rotated" : "kept",
        };
    }

    await prisma.user.create({
        data: {
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            kycStatus: user.kycStatus ?? "VERIFICADO",
            password: passwordHash, // null is fine — user logs in via Google
        },
    });
    return {
        email: user.email,
        rol: user.rol,
        action: "created",
        password: passwordHash ? "set-from-env" : "google-only",
    };
}

async function upsertDemoUser(user: DemoUser, passwordHash: string) {
    const result = await prisma.user.upsert({
        where: { email: user.email },
        update: {
            nombre: user.nombre,
            rol: user.rol,
            orgId: user.orgId ?? null,
            kycStatus: user.kycStatus ?? "PENDIENTE",
            password: passwordHash,
        },
        create: {
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            orgId: user.orgId ?? null,
            kycStatus: user.kycStatus ?? "PENDIENTE",
            password: passwordHash,
        },
        select: { email: true, rol: true, orgId: true },
    });
    return { ...result, action: "upserted", password: "rotated" };
}

async function main() {
    const isProd = process.env.NODE_ENV === "production";
    const demoPassword = process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;

    if (isProd && demoPassword === DEFAULT_DEMO_PASSWORD) {
        console.error(
            "Refusing to seed demo users in production with the default " +
            "demo password. Set SEED_DEMO_PASSWORD explicitly or run this " +
            "script only in dev / staging / preview.",
        );
        process.exit(1);
    }

    console.log("\n=== SevenToop role users seed ===\n");
    console.log(`NODE_ENV: ${process.env.NODE_ENV ?? "undefined"}`);
    console.log("Real users (SUPERADMIN / ADMIN):");

    const realResults = [];
    for (const u of REAL_USERS) {
        try {
            const res = await upsertRealUser(u);
            realResults.push(res);
        } catch (err) {
            console.error(`  ✗ ${u.email}:`, err);
            throw err;
        }
    }
    console.table(realResults);

    console.log("Demo users (one per non-admin role):");
    const demoOrg = await prisma.organization.upsert({
        where: { slug: "demo-org" },
        update: { nombre: "Demo Organization", plan: "FREE" },
        create: { nombre: "Demo Organization", slug: "demo-org", plan: "FREE" },
        select: { id: true },
    });

    const demoPasswordHash = await bcrypt.hash(demoPassword, BCRYPT_ROUNDS);

    const DEMO_USERS: DemoUser[] = [
        {
            email: "desarrollador.demo@seventoop.local",
            nombre: "Desarrollador Demo",
            rol: "DESARROLLADOR",
            orgId: demoOrg.id,
            kycStatus: "VERIFICADO",
        },
        {
            email: "vendedor.demo@seventoop.local",
            nombre: "Vendedor Demo",
            rol: "VENDEDOR",
            orgId: demoOrg.id,
            kycStatus: "VERIFICADO",
        },
        {
            email: "inversor.demo@seventoop.local",
            nombre: "Inversor Demo",
            rol: "INVERSOR",
            orgId: demoOrg.id,
            kycStatus: "VERIFICADO",
        },
        {
            email: "cliente.demo@seventoop.local",
            nombre: "Cliente Demo",
            rol: "CLIENTE",
            orgId: demoOrg.id,
            kycStatus: "PENDIENTE",
        },
    ];

    const demoResults = [];
    for (const u of DEMO_USERS) {
        const res = await upsertDemoUser(u, demoPasswordHash);
        demoResults.push(res);
    }
    console.table(demoResults);

    console.log("\nDone.");
    console.log(
        "Demo users password: " +
        (process.env.SEED_DEMO_PASSWORD
            ? "(read from SEED_DEMO_PASSWORD env)"
            : `'${DEFAULT_DEMO_PASSWORD}' (default — set SEED_DEMO_PASSWORD to override)`),
    );
    console.log(
        "Real users password: only rotated when its env var is provided " +
        "(SEED_SUPERADMIN_JUANI_PASSWORD, SEED_SUPERADMIN_DANI_PASSWORD, " +
        "SEED_ADMIN_SHARED_PASSWORD). Otherwise Google login is preserved.\n",
    );
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
