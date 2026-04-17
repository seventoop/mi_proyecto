import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Demo@123456";
const BCRYPT_ROUNDS = 10;

type SeedUser = {
    email: string;
    nombre: string;
    rol: "ADMIN" | "DESARROLLADOR" | "VENDEDOR" | "INVERSOR" | "CLIENTE";
    orgId?: string;
    kycStatus?: string;
};

async function upsertUser(user: SeedUser, passwordHash: string) {
    return prisma.user.upsert({
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
        select: {
            id: true,
            email: true,
            nombre: true,
            rol: true,
            orgId: true,
        },
    });
}

async function main() {
    console.log("Seeding demo role users...");

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

    const demoOrg = await prisma.organization.upsert({
        where: { slug: "demo-org" },
        update: { nombre: "Demo Organization", plan: "FREE" },
        create: { nombre: "Demo Organization", slug: "demo-org", plan: "FREE" },
        select: { id: true },
    });

    const users: SeedUser[] = [
        {
            email: "admin.demo@seventoop.local",
            nombre: "Admin Demo",
            rol: "ADMIN",
            kycStatus: "VERIFICADO",
        },
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
            kycStatus: "VERIFICADO",
        },
        {
            email: "cliente.demo@seventoop.local",
            nombre: "Cliente Demo",
            rol: "CLIENTE",
            kycStatus: "NINGUNO",
        },
    ];

    const created = [];
    for (const user of users) {
        const item = await upsertUser(user, passwordHash);
        created.push(item);
    }

    console.table(
        created.map((user) => ({
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            orgId: user.orgId ?? "-",
        })),
    );

    console.log("");
    console.log("Done. Default password for all demo users:");
    console.log(`  ${DEFAULT_PASSWORD}`);
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
