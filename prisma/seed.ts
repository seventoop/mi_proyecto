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

    // 5. Geodevia — 24 lotes con polígonos reales
    // Primero, borrar etapas existentes de Geodevia para evitar duplicados
    const existingGeodevia = await prisma.proyecto.findUnique({ where: { slug: "reserva-geodevia" }, select: { id: true } });
    if (existingGeodevia) {
        await prisma.etapa.deleteMany({ where: { proyectoId: existingGeodevia.id } });
    }

    const BASE_LAT_A = -31.4530; // Fila norte (Manzana A)
    const BASE_LAT_B = -31.4535; // Fila sur (Manzana B, separada por calle)
    const BASE_LNG = -64.4825;
    const LOT_W_LNG = 0.00018; // ancho lon de cada lote (~10m)
    const LOT_H_LAT = 0.00030; // alto lat de cada lote (~33m)

    const makePoly = (row: number, col: number, baseLat: number) => {
        const lng0 = BASE_LNG + col * (LOT_W_LNG + 0.00002);
        const lat0 = baseLat;
        return [
            { lat: lat0,            lng: lng0 },
            { lat: lat0,            lng: lng0 + LOT_W_LNG },
            { lat: lat0 - LOT_H_LAT, lng: lng0 + LOT_W_LNG },
            { lat: lat0 - LOT_H_LAT, lng: lng0 },
        ];
    };

    // Manzana A: lotes 01-12
    const manzanaALotes = Array.from({ length: 12 }, (_, i) => {
        const num = String(i + 1).padStart(2, "0");
        const estado = i < 6 ? "DISPONIBLE" : i < 9 ? "RESERVADA" : "VENDIDA";
        const precio = 45000 + i * 1000;
        return { numero: `A-${num}`, tipo: "LOTE", frente: 10, fondo: 33.04, superficie: 330.4, moneda: "USD", estado, precio, polygon: makePoly(0, i, BASE_LAT_A) };
    });

    // Manzana B: lotes 13-24
    const manzanaBLotes = Array.from({ length: 12 }, (_, i) => {
        const num = String(i + 13).padStart(2, "0");
        const estado = i < 8 ? "DISPONIBLE" : i < 10 ? "RESERVADA" : "VENDIDA";
        const precio = 38000 + i * 1000;
        return { numero: `B-${num}`, tipo: "LOTE", frente: 10, fondo: 33.04, superficie: 330.4, moneda: "USD", estado, precio, polygon: makePoly(1, i, BASE_LAT_B) };
    });

    const proyectoInversion = await prisma.proyecto.upsert({
        where: { slug: "reserva-geodevia" },
        update: {
            deletedAt: null,
            invertible: true,
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            precioM2Inversor: 120,
            precioM2Mercado: 210,
            metaM2Objetivo: 5000,
            m2VendidosInversores: 1250,
            descripcion: "Reserva Geodevia es el primer desarrollo eco-sustentable de alta gama en el Valle de Punilla. Un refugio natural que combina arquitectura bioclimática con servicios de primer nivel, diseñado para quienes buscan equilibrio entre confort y respeto por el entorno serrano.",
            ubicacion: "Valle de Punilla, Córdoba, Argentina",
            mapCenterLat: -31.4532,
            mapCenterLng: -64.4823,
            mapZoom: 16,
            imagenPortada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
            galeria: JSON.stringify([
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000",
                "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000",
                "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1000"
            ]),
            fechaLimiteFondeo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        } as any,
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
            mapCenterLat: -31.4532,
            mapCenterLng: -64.4823,
            mapZoom: 16,
            fechaLimiteFondeo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            imagenPortada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
            hitosEscrow: {
                create: [
                    { titulo: "Soft Cap: 20%", porcentaje: 20, estado: "COMPLETADO", fechaLogro: new Date() },
                    { titulo: "Apertura de Calles", porcentaje: 30, estado: "PENDIENTE" },
                    { titulo: "Servicios Básicos", porcentaje: 50, estado: "PENDIENTE" },
                ]
            },
        } as any,
    });

    // Crear etapa + manzanas + lotes
    const etapa1 = await prisma.etapa.create({
        data: {
            proyectoId: proyectoInversion.id,
            nombre: "Etapa 1",
            orden: 1,
            estado: "EN_CURSO",
        }
    });

    await prisma.manzana.create({
        data: {
            etapaId: etapa1.id,
            nombre: "Manzana A",
            unidades: { create: manzanaALotes as any }
        }
    });

    await prisma.manzana.create({
        data: {
            etapaId: etapa1.id,
            nombre: "Manzana B",
            unidades: { create: manzanaBLotes as any }
        }
    });

    console.log(`✅ Geodevia: 24 lotes creados (Manzana A + B)`);

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
