const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    const commonPassword = "catalina0112192122";
    const hashedPassword = await bcrypt.hash(commonPassword, 10);

    // 1. Admin User
    const admin = await prisma.user.upsert({
        where: { email: "dany76162@gmail.com" },
        update: { password: hashedPassword, rol: "ADMIN" },
        create: {
            email: "dany76162@gmail.com",
            password: hashedPassword,
            nombre: "Dany Admin",
            rol: "ADMIN",
        },
    });

    // 2. Developer User
    const developer = await prisma.user.upsert({
        where: { email: "dany202109@gmail.com" },
        update: { password: hashedPassword, rol: "VENDEDOR" },
        create: {
            email: "dany202109@gmail.com",
            password: hashedPassword,
            nombre: "Héctor Desarrollador",
            rol: "VENDEDOR",
        },
    });

    console.log("✅ Users created.");

    // 4. Regular Sales Project
    const proyectoVenta = await prisma.proyecto.upsert({
        where: { slug: "barrio-los-alamos" },
        update: { estado: "EN_VENTA", invertible: false },
        create: {
            nombre: "Barrio Los Álamos",
            slug: "barrio-los-alamos",
            descripcion: "Urbanización premium con lotes amplios en zona norte",
            ubicacion: "Córdoba, Argentina",
            estado: "EN_VENTA",
            tipo: "URBANIZACION",
            invertible: false,
        },
    });

    // 5. Whitelist Investment Project
    const proyectoInversion = await prisma.proyecto.upsert({
        where: { slug: "reserva-geodevia" },
        update: {
            invertible: true,
            estado: "PLANIFICACION",
            precioM2Inversor: 120,
            precioM2Mercado: 210,
            metaM2Objetivo: 5000,
        },
        create: {
            nombre: "Reserva Geodevia",
            slug: "reserva-geodevia",
            descripcion: "Proyecto ecosustentable en preventa exclusiva para inversores mayoristas.",
            ubicacion: "Valle de Punilla, Córdoba",
            estado: "PLANIFICACION",
            tipo: "ECO_BARRIO",
            invertible: true,
            precioM2Inversor: 120,
            precioM2Mercado: 210,
            metaM2Objetivo: 5000,
            m2VendidosInversores: 1250,
            fechaLimiteFondeo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            imagenPortada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
        },
    });

    console.log(`✅ Project created: ${proyectoInversion.nombre} (${proyectoInversion.id})`);

    // 6. Mock Tour 360
    await prisma.tour360.upsert({
        where: { id: "mock-tour-id" },
        update: {},
        create: {
            id: "mock-tour-id",
            proyectoId: proyectoInversion.id,
            nombre: "Vista Panorámica del Valle",
            escenas: JSON.stringify([
                {
                    id: "scene-1",
                    name: "Entrada Principal",
                    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
                    hotspots: [
                        { id: "h1", type: "info", text: "Bienvenido a Reserva Geodevia", x: 50, y: 50 }
                    ]
                }
            ]),
            estado: "APROBADO"
        }
    });

    console.log("✅ Mock Tour 360 created.");
    console.log("✅ Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
