import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database for Seventoop Investment Fund...");

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

    // 3. Investor User (INVERSOR)
    const investor = await prisma.user.upsert({
        where: { email: "danielcata2023@gmail.com" },
        update: { password: hashedPassword, rol: "INVERSOR" },
        create: {
            email: "danielcata2023@gmail.com",
            password: hashedPassword,
            nombre: "Daniel Inversor",
            rol: "INVERSOR",
        },
    });

    console.log("✅ Users created/updated: Admin, Developer, Inversor.");

    // 4. Regular Sales Project
    const proyectoVenta = await prisma.proyecto.upsert({
        where: { slug: "barrio-los-alamos" },
        update: {
            estado: "EN_VENTA",
            invertible: false
        },
        create: {
            nombre: "Barrio Los Álamos",
            slug: "barrio-los-alamos",
            descripcion: "Urbanización premium con lotes amplios en zona norte",
            ubicacion: "Córdoba, Argentina",
            estado: "EN_VENTA",
            tipo: "URBANIZACION",
            invertible: false,
            etapas: {
                create: [
                    {
                        nombre: "Etapa 1",
                        orden: 1,
                        estado: "EN_CURSO",
                        manzanas: {
                            create: [
                                {
                                    nombre: "Manzana A",
                                    unidades: {
                                        create: [
                                            {
                                                numero: "A-01",
                                                tipo: "LOTE",
                                                superficie: 450,
                                                precio: 45000,
                                                estado: "DISPONIBLE",
                                                responsableId: developer.id,
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });

    // 5. Whitelist Investment Project (The success case)
    const proyectoInversion = await prisma.proyecto.upsert({
        where: { slug: "reserva-geodevia" },
        update: {
            invertible: true,
            estado: "PLANIFICACION",
            precioM2Inversor: 120,
            precioM2Mercado: 210,
            metaM2Objetivo: 5000,
            m2VendidosInversores: 1250,
            fechaLimiteFondeo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
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
            hitosEscrow: {
                create: [
                    { titulo: "Soft Cap: 20%", porcentaje: 20, estado: "COMPLETADO", fechaLogro: new Date() },
                    { titulo: "Apertura de Calles", porcentaje: 30, estado: "PENDIENTE" },
                    { titulo: "Servicios Básicos", porcentaje: 50, estado: "PENDIENTE" },
                ]
            }
        },
    });

    // 6. Create a mock investment for our investor
    await prisma.inversion.create({
        data: {
            proyectoId: proyectoInversion.id,
            inversorId: investor.id,
            m2Comprados: 100,
            precioM2Aplicado: 120,
            montoTotal: 12000,
            estado: "ESCROW",
            hashTransaccion: "0x4fb...92c",
        }
    });

    console.log(`✅ Investment scenario created: ${proyectoInversion.nombre}`);
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
