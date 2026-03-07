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
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            precioM2Inversor: 120,
            precioM2Mercado: 210,
            metaM2Objetivo: 5000,
            m2VendidosInversores: 1250,
            descripcion: "Reserva Geodevia es el primer desarrollo eco-sustentable de alta gama en el Valle de Punilla. Un refugio natural que combina arquitectura bioclimática con servicios de primer nivel, diseñado para quienes buscan equilibrio entre confort y respeto por el entorno serrano.",
            ubicacion: "Valle de Punilla, Córdoba, Argentina",
            mapCenterLat: -31.3129,
            mapCenterLng: -64.4444,
            imagenPortada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
            galeria: JSON.stringify([
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000",
                "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000",
                "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1000"
            ]),
            fechaLimiteFondeo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        create: {
            nombre: "Reserva Geodevia",
            slug: "reserva-geodevia",
            descripcion: "Reserva Geodevia es el primer desarrollo eco-sustentable de alta gama en el Valle de Punilla. Un refugio natural que combina arquitectura bioclimática con servicios de primer nivel, diseñado para quienes buscan equilibrio entre confort y respeto por el entorno serrano.",
            ubicacion: "Valle de Punilla, Córdoba, Argentina",
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            tipo: "URBANIZACION",
            invertible: true,
            precioM2Inversor: 120,
            precioM2Mercado: 210,
            metaM2Objetivo: 5000,
            m2VendidosInversores: 1250,
            mapCenterLat: -31.3129,
            mapCenterLng: -64.4444,
            fechaLimiteFondeo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            imagenPortada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
            hitosEscrow: {
                create: [
                    { titulo: "Soft Cap: 20%", porcentaje: 20, estado: "COMPLETADO", fechaLogro: new Date() },
                    { titulo: "Apertura de Calles", porcentaje: 30, estado: "PENDIENTE" },
                    { titulo: "Servicios Básicos", porcentaje: 50, estado: "PENDIENTE" },
                ]
            },
            etapas: {
                create: [{
                    nombre: "Etapa Unica",
                    orden: 1,
                    manzanas: {
                        create: [{
                            nombre: "Manzana 01",
                            unidades: {
                                create: [
                                    { numero: "01", tipo: "LOTE", superficie: 1200, precio: 35000, estado: "DISPONIBLE" },
                                    { numero: "02", tipo: "LOTE", superficie: 1100, precio: 32000, estado: "RESERVADA" },
                                    { numero: "03", tipo: "LOTE", superficie: 1500, precio: 45000, estado: "VENDIDA" }
                                ]
                            }
                        }]
                    }
                }]
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
