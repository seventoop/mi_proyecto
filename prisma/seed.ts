import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database for Seventoop Investment Fund...");

    const commonPassword = "catalina0112192122";
    const hashedPassword = await bcrypt.hash(commonPassword, 10);

    // ─── 0. Organization principal (deterministic ID) ───
    const org = await prisma.organization.upsert({
        where: { slug: "seventoop" },
        update: { nombre: "Seventoop" },
        create: {
            id: "seventoop-main",
            nombre: "Seventoop",
            slug: "seventoop",
            plan: "FREE",
        },
    });

    console.log(`✅ Organization: ${org.nombre} (id: ${org.id})`);

    // ─── 1. Admin User ───
    const admin = await prisma.user.upsert({
        where: { email: "dany76162@gmail.com" },
        update: { password: hashedPassword, rol: "ADMIN", orgId: org.id },
        create: {
            email: "dany76162@gmail.com",
            password: hashedPassword,
            nombre: "Dany Admin",
            rol: "ADMIN",
            orgId: org.id,
        },
    });

    // ─── 2. Developer User ───
    const developer = await prisma.user.upsert({
        where: { email: "dany202109@gmail.com" },
        update: { password: hashedPassword, rol: "VENDEDOR", orgId: org.id },
        create: {
            email: "dany202109@gmail.com",
            password: hashedPassword,
            nombre: "Héctor Desarrollador",
            rol: "VENDEDOR",
            orgId: org.id,
        },
    });

    // ─── 3. Investor User (INVERSOR) ───
    const investor = await prisma.user.upsert({
        where: { email: "danielcata2023@gmail.com" },
        update: { password: hashedPassword, rol: "INVERSOR", orgId: org.id },
        create: {
            email: "danielcata2023@gmail.com",
            password: hashedPassword,
            nombre: "Daniel Inversor",
            rol: "INVERSOR",
            orgId: org.id,
        },
    });

    console.log("✅ Users created/updated: Admin, Developer, Inversor.");

    // ─── 4. Regular Sales Project ───
    await prisma.proyecto.upsert({
        where: { slug: "barrio-los-alamos" },
        update: {
            estado: "EN_VENTA",
            invertible: false,
            visibilityStatus: "PUBLICADO",
            orgId: org.id,
            creadoPorId: admin.id,
        },
        create: {
            nombre: "Barrio Los Álamos",
            slug: "barrio-los-alamos",
            descripcion: "Urbanización premium con lotes amplios en zona norte",
            ubicacion: "Córdoba, Argentina",
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            tipo: "URBANIZACION",
            invertible: false,
            imagenPortada: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=800&q=80",
            orgId: org.id,
            creadoPorId: admin.id,
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
                                            { numero: "A-01", tipo: "LOTE", superficie: 450, precio: 45000, estado: "DISPONIBLE", responsableId: developer.id },
                                            { numero: "A-02", tipo: "LOTE", superficie: 480, precio: 48000, estado: "DISPONIBLE", responsableId: developer.id },
                                            { numero: "A-03", tipo: "LOTE", superficie: 420, precio: 42000, estado: "RESERVADA", responsableId: developer.id },
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

    // ─── 5. Geodevia — 24 lotes con polígonos reales ───
    const existingGeodevia = await prisma.proyecto.findUnique({ where: { slug: "reserva-geodevia" }, select: { id: true } });
    if (existingGeodevia) {
        await prisma.etapa.deleteMany({ where: { proyectoId: existingGeodevia.id } });
    }

    const BASE_LAT_A = -31.4530;
    const BASE_LAT_B = -31.4535;
    const BASE_LNG = -64.4825;
    const LOT_W_LNG = 0.00018;
    const LOT_H_LAT = 0.00030;

    const makePoly = (row: number, col: number, baseLat: number) => {
        const lng0 = BASE_LNG + col * (LOT_W_LNG + 0.00002);
        const lat0 = baseLat;
        return [
            { lat: lat0,             lng: lng0 },
            { lat: lat0,             lng: lng0 + LOT_W_LNG },
            { lat: lat0 - LOT_H_LAT, lng: lng0 + LOT_W_LNG },
            { lat: lat0 - LOT_H_LAT, lng: lng0 },
        ];
    };

    const manzanaALotes = Array.from({ length: 12 }, (_, i) => {
        const num = String(i + 1).padStart(2, "0");
        const estado = i < 6 ? "DISPONIBLE" : i < 9 ? "RESERVADA" : "VENDIDA";
        const precio = 45000 + i * 1000;
        return { numero: `A-${num}`, tipo: "LOTE", frente: 10, fondo: 33.04, superficie: 330.4, moneda: "USD", estado, precio, polygon: makePoly(0, i, BASE_LAT_A) };
    });

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
            orgId: org.id,
            creadoPorId: admin.id,
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
            orgId: org.id,
            creadoPorId: admin.id,
            hitosEscrow: {
                create: [
                    { titulo: "Soft Cap: 20%", porcentaje: 20, estado: "COMPLETADO", fechaLogro: new Date() },
                    { titulo: "Apertura de Calles", porcentaje: 30, estado: "PENDIENTE" },
                    { titulo: "Servicios Básicos", porcentaje: 50, estado: "PENDIENTE" },
                ]
            },
        } as any,
    });

    const etapa1Geodevia = await prisma.etapa.create({
        data: { proyectoId: proyectoInversion.id, nombre: "Etapa 1", orden: 1, estado: "EN_CURSO" }
    });
    await prisma.manzana.create({ data: { etapaId: etapa1Geodevia.id, nombre: "Manzana A", unidades: { create: manzanaALotes as any } } });
    await prisma.manzana.create({ data: { etapaId: etapa1Geodevia.id, nombre: "Manzana B", unidades: { create: manzanaBLotes as any } } });

    console.log(`✅ Geodevia: 24 lotes creados (Manzana A + B)`);

    // ─── 6. Mock investment for investor ───
    const existingInversion = await prisma.inversion.findFirst({ where: { proyectoId: proyectoInversion.id, inversorId: investor.id } });
    if (!existingInversion) {
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
    }
    console.log(`✅ Investment scenario: ${proyectoInversion.nombre}`);

    // ─── 7. Barrio Las Casuarinas ───
    const existCasuarinas = await prisma.proyecto.findUnique({ where: { slug: "barrio-las-casuarinas" }, select: { id: true } });
    if (existCasuarinas) {
        await prisma.etapa.deleteMany({ where: { proyectoId: existCasuarinas.id } });
    }
    const casuarinas = await prisma.proyecto.upsert({
        where: { slug: "barrio-las-casuarinas" },
        update: { orgId: org.id, creadoPorId: admin.id, visibilityStatus: "PUBLICADO" },
        create: {
            nombre: "Barrio Las Casuarinas",
            slug: "barrio-las-casuarinas",
            descripcion: "Loteo residencial en las afueras de Córdoba Capital, con excelente acceso y servicios completos. Lotes de 300 a 600 m² en un entorno natural privilegiado.",
            ubicacion: "Av. Los Plátanos 1200, Corralejo, Córdoba",
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            tipo: "URBANIZACION",
            invertible: false,
            imagenPortada: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=800&q=80",
            mapCenterLat: -31.32905492696033,
            mapCenterLng: -64.2240085854358,
            mapZoom: 17,
            precioM2Inversor: 70,
            precioM2Mercado: 85,
            orgId: org.id,
            creadoPorId: admin.id,
        } as any,
    });

    const etapa1Cas = await prisma.etapa.create({ data: { proyectoId: casuarinas.id, nombre: "Etapa 1", orden: 1, estado: "EN_CURSO" } });
    const etapa2Cas = await prisma.etapa.create({ data: { proyectoId: casuarinas.id, nombre: "Etapa 2", orden: 2, estado: "PENDIENTE" } });
    await prisma.manzana.create({
        data: {
            etapaId: etapa1Cas.id, nombre: "Manzana A",
            unidades: {
                create: [
                    { numero: "A-01", tipo: "LOTE", superficie: 418, frente: 12, fondo: 35, precio: 75000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
                    { numero: "A-02", tipo: "LOTE", superficie: 457, frente: 14, fondo: 38, precio: 78000, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "A-03", tipo: "LOTE", superficie: 343, frente: 16, fondo: 29, precio: 81000, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "A-04", tipo: "LOTE", superficie: 472, frente: 12, fondo: 39, precio: 84000, estado: "RESERVADA", moneda: "USD" },
                    { numero: "A-05", tipo: "LOTE", superficie: 450, frente: 14, fondo: 38, precio: 87000, estado: "RESERVADA", moneda: "USD" },
                    { numero: "A-06", tipo: "LOTE", superficie: 428, frente: 16, fondo: 36, precio: 90000, estado: "VENDIDA", moneda: "USD" },
                    { numero: "A-07", tipo: "LOTE", superficie: 455, frente: 12, fondo: 38, precio: 93000, estado: "VENDIDA", moneda: "USD" },
                    { numero: "A-08", tipo: "LOTE", superficie: 476, frente: 14, fondo: 40, precio: 96000, estado: "VENDIDA", moneda: "USD" },
                    { numero: "A-09", tipo: "LOTE", superficie: 458, frente: 16, fondo: 38, precio: 99000, estado: "SEÑADA", moneda: "USD" },
                    { numero: "A-10", tipo: "LOTE", superficie: 400, frente: 12, fondo: 33, precio: 102000, estado: "NO_DISPONIBLE", moneda: "USD", esEsquina: true },
                ] as any
            }
        }
    });
    await prisma.manzana.create({
        data: {
            etapaId: etapa1Cas.id, nombre: "Manzana B",
            unidades: {
                create: [
                    { numero: "B-01", tipo: "LOTE", superficie: 403, frente: 14, fondo: 29, precio: 80000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
                    { numero: "B-02", tipo: "LOTE", superficie: 370, frente: 14, fondo: 26, precio: 82500, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "B-03", tipo: "LOTE", superficie: 458, frente: 14, fondo: 33, precio: 85000, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "B-04", tipo: "LOTE", superficie: 486, frente: 14, fondo: 35, precio: 87500, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "B-05", tipo: "LOTE", superficie: 389, frente: 14, fondo: 28, precio: 90000, estado: "RESERVADA", moneda: "USD" },
                    { numero: "B-06", tipo: "LOTE", superficie: 474, frente: 14, fondo: 34, precio: 92500, estado: "VENDIDA", moneda: "USD" },
                    { numero: "B-07", tipo: "LOTE", superficie: 467, frente: 14, fondo: 33, precio: 95000, estado: "SEÑADA", moneda: "USD" },
                    { numero: "B-08", tipo: "LOTE", superficie: 445, frente: 14, fondo: 32, precio: 97500, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
                ] as any
            }
        }
    });
    await prisma.manzana.create({
        data: {
            etapaId: etapa2Cas.id, nombre: "Manzana C",
            unidades: {
                create: [
                    { numero: "C-01", tipo: "LOTE", superficie: 400, frente: 15, fondo: 27, precio: 92000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
                    { numero: "C-02", tipo: "LOTE", superficie: 425, frente: 15, fondo: 28, precio: 96000, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "C-03", tipo: "LOTE", superficie: 450, frente: 15, fondo: 30, precio: 100000, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "C-04", tipo: "LOTE", superficie: 475, frente: 15, fondo: 32, precio: 104000, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "C-05", tipo: "LOTE", superficie: 500, frente: 15, fondo: 33, precio: 108000, estado: "DISPONIBLE", moneda: "USD" },
                    { numero: "C-06", tipo: "LOTE", superficie: 525, frente: 15, fondo: 35, precio: 112000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
                ] as any
            }
        }
    });
    console.log(`✅ Barrio Las Casuarinas: 24 lotes creados`);

    // ─── 8. Loteo San Martín ───
    const existSanMartin = await prisma.proyecto.findUnique({ where: { slug: "loteo-san-martin-mendoza" }, select: { id: true } });
    if (existSanMartin) {
        await prisma.etapa.deleteMany({ where: { proyectoId: existSanMartin.id } });
    }
    const sanMartin = await prisma.proyecto.upsert({
        where: { slug: "loteo-san-martin-mendoza" },
        update: { orgId: org.id, creadoPorId: admin.id, visibilityStatus: "PUBLICADO" },
        create: {
            nombre: "Loteo San Martín",
            slug: "loteo-san-martin-mendoza",
            descripcion: "Desarrollo de lotes residenciales en Maipú, Mendoza. Zona con alta demanda, a minutos del centro mendocino. Escrituración inmediata disponible.",
            ubicacion: "Calle Sarmiento 450, Maipú, Mendoza",
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            tipo: "URBANIZACION",
            invertible: false,
            imagenPortada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
            mapCenterLat: -32.9812,
            mapCenterLng: -68.7783,
            mapZoom: 16,
            precioM2Inversor: 52,
            precioM2Mercado: 65,
            orgId: org.id,
            creadoPorId: admin.id,
        } as any,
    });

    const etapa1SM = await prisma.etapa.create({ data: { proyectoId: sanMartin.id, nombre: "Etapa Única", orden: 1, estado: "EN_CURSO" } });
    const m1SM = await prisma.manzana.create({ data: { etapaId: etapa1SM.id, nombre: "Manzana 1" } });
    await prisma.unidad.createMany({ data: [
        { manzanaId: m1SM.id, numero: "1-01", tipo: "LOTE", superficie: 374, frente: 10, fondo: 25, precio: 55000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
        { manzanaId: m1SM.id, numero: "1-02", tipo: "LOTE", superficie: 281, frente: 12, fondo: 25, precio: 57000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: m1SM.id, numero: "1-03", tipo: "LOTE", superficie: 263, frente: 10, fondo: 25, precio: 59000, estado: "VENDIDA", moneda: "USD" },
        { manzanaId: m1SM.id, numero: "1-04", tipo: "LOTE", superficie: 359, frente: 12, fondo: 25, precio: 61000, estado: "VENDIDA", moneda: "USD" },
        { manzanaId: m1SM.id, numero: "1-05", tipo: "LOTE", superficie: 256, frente: 10, fondo: 25, precio: 63000, estado: "VENDIDA", moneda: "USD" },
        { manzanaId: m1SM.id, numero: "1-06", tipo: "LOTE", superficie: 364, frente: 12, fondo: 25, precio: 65000, estado: "RESERVADA", moneda: "USD" },
        { manzanaId: m1SM.id, numero: "1-07", tipo: "LOTE", superficie: 294, frente: 10, fondo: 25, precio: 67000, estado: "DISPONIBLE", moneda: "USD" },
    ] as any });
    const m2SM = await prisma.manzana.create({ data: { etapaId: etapa1SM.id, nombre: "Manzana 2" } });
    await prisma.unidad.createMany({ data: [
        { manzanaId: m2SM.id, numero: "2-01", tipo: "LOTE", superficie: 299, frente: 10, fondo: 25, precio: 69000, estado: "RESERVADA", moneda: "USD", esEsquina: true },
        { manzanaId: m2SM.id, numero: "2-02", tipo: "LOTE", superficie: 369, frente: 12, fondo: 25, precio: 71000, estado: "RESERVADA", moneda: "USD" },
        { manzanaId: m2SM.id, numero: "2-03", tipo: "LOTE", superficie: 385, frente: 10, fondo: 25, precio: 73000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: m2SM.id, numero: "2-04", tipo: "LOTE", superficie: 364, frente: 12, fondo: 25, precio: 75000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: m2SM.id, numero: "2-05", tipo: "LOTE", superficie: 378, frente: 10, fondo: 25, precio: 77000, estado: "SEÑADA", moneda: "USD" },
        { manzanaId: m2SM.id, numero: "2-06", tipo: "LOTE", superficie: 253, frente: 12, fondo: 25, precio: 79000, estado: "VENDIDA", moneda: "USD" },
        { manzanaId: m2SM.id, numero: "2-07", tipo: "LOTE", superficie: 252, frente: 10, fondo: 25, precio: 81000, estado: "DISPONIBLE", moneda: "USD" },
    ] as any });
    const m3SM = await prisma.manzana.create({ data: { etapaId: etapa1SM.id, nombre: "Manzana 3" } });
    await prisma.unidad.createMany({ data: [
        { manzanaId: m3SM.id, numero: "3-01", tipo: "LOTE", superficie: 350, frente: 10, fondo: 25, precio: 83000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
        { manzanaId: m3SM.id, numero: "3-02", tipo: "LOTE", superficie: 299, frente: 12, fondo: 25, precio: 85000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: m3SM.id, numero: "3-03", tipo: "LOTE", superficie: 344, frente: 10, fondo: 25, precio: 87000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: m3SM.id, numero: "3-04", tipo: "LOTE", superficie: 346, frente: 12, fondo: 25, precio: 89000, estado: "NO_DISPONIBLE", moneda: "USD" },
        { manzanaId: m3SM.id, numero: "3-05", tipo: "LOTE", superficie: 345, frente: 10, fondo: 25, precio: 91000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: m3SM.id, numero: "3-06", tipo: "LOTE", superficie: 347, frente: 12, fondo: 25, precio: 93000, estado: "RESERVADA", moneda: "USD" },
    ] as any });
    console.log(`✅ Loteo San Martín: 20 lotes creados`);

    // ─── 9. Chacras del Norte ───
    const existChacras = await prisma.proyecto.findUnique({ where: { slug: "chacras-del-norte-santa-fe" }, select: { id: true } });
    if (existChacras) {
        await prisma.etapa.deleteMany({ where: { proyectoId: existChacras.id } });
    }
    const chacras = await prisma.proyecto.upsert({
        where: { slug: "chacras-del-norte-santa-fe" },
        update: { orgId: org.id, creadoPorId: admin.id, visibilityStatus: "PUBLICADO" },
        create: {
            nombre: "Chacras del Norte",
            slug: "chacras-del-norte-santa-fe",
            descripcion: "Parcelamiento rural-residencial en las afueras de Rafaela, Santa Fe. Lotes amplios de 600 a 1200 m² ideales para vivienda permanente o segunda residencia.",
            ubicacion: "Ruta Provincial 70 km 4, Rafaela, Santa Fe",
            estado: "PREVENTA",
            visibilityStatus: "PUBLICADO",
            tipo: "CHACRA",
            invertible: false,
            imagenPortada: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
            mapCenterLat: -31.25360211347008,
            mapCenterLng: -61.48596167564393,
            mapZoom: 17,
            precioM2Inversor: 36,
            precioM2Mercado: 45,
            orgId: org.id,
            creadoPorId: admin.id,
        } as any,
    });

    const etapa1Ch = await prisma.etapa.create({ data: { proyectoId: chacras.id, nombre: "Parcelamiento Principal", orden: 1, estado: "EN_CURSO" } });
    const sectNorte = await prisma.manzana.create({ data: { etapaId: etapa1Ch.id, nombre: "Sector Norte" } });
    await prisma.unidad.createMany({ data: [
        { manzanaId: sectNorte.id, numero: "N-01", tipo: "CHACRA", superficie: 600,  frente: 20, fondo: 30, precio: 35000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
        { manzanaId: sectNorte.id, numero: "N-02", tipo: "CHACRA", superficie: 675,  frente: 22, fondo: 31, precio: 40000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectNorte.id, numero: "N-03", tipo: "CHACRA", superficie: 750,  frente: 24, fondo: 31, precio: 45000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectNorte.id, numero: "N-04", tipo: "CHACRA", superficie: 825,  frente: 26, fondo: 32, precio: 50000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectNorte.id, numero: "N-05", tipo: "CHACRA", superficie: 900,  frente: 28, fondo: 32, precio: 55000, estado: "RESERVADO", moneda: "USD" },
        { manzanaId: sectNorte.id, numero: "N-06", tipo: "CHACRA", superficie: 975,  frente: 30, fondo: 33, precio: 60000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectNorte.id, numero: "N-07", tipo: "CHACRA", superficie: 1050, frente: 32, fondo: 33, precio: 65000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectNorte.id, numero: "N-08", tipo: "CHACRA", superficie: 1125, frente: 34, fondo: 33, precio: 70000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
    ] as any });
    const sectSur = await prisma.manzana.create({ data: { etapaId: etapa1Ch.id, nombre: "Sector Sur" } });
    await prisma.unidad.createMany({ data: [
        { manzanaId: sectSur.id, numero: "S-01", tipo: "CHACRA", superficie: 700,  frente: 22, fondo: 32, precio: 38000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectSur.id, numero: "S-02", tipo: "CHACRA", superficie: 750,  frente: 22, fondo: 34, precio: 42000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectSur.id, numero: "S-03", tipo: "CHACRA", superficie: 800,  frente: 22, fondo: 36, precio: 46000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectSur.id, numero: "S-04", tipo: "CHACRA", superficie: 850,  frente: 22, fondo: 39, precio: 50000, estado: "NO_DISPONIBLE", moneda: "USD" },
        { manzanaId: sectSur.id, numero: "S-05", tipo: "CHACRA", superficie: 900,  frente: 22, fondo: 41, precio: 54000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectSur.id, numero: "S-06", tipo: "CHACRA", superficie: 950,  frente: 22, fondo: 43, precio: 58000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: sectSur.id, numero: "S-07", tipo: "CHACRA", superficie: 1000, frente: 22, fondo: 45, precio: 62000, estado: "VENDIDA", moneda: "USD" },
    ] as any });
    console.log(`✅ Chacras del Norte: 15 chacras creadas`);

    // ─── 10. Villa del Lago ───
    const existVilla = await prisma.proyecto.findUnique({ where: { slug: "villa-del-lago-buenos-aires" }, select: { id: true } });
    if (existVilla) {
        await prisma.etapa.deleteMany({ where: { proyectoId: existVilla.id } });
    }
    const villa = await prisma.proyecto.upsert({
        where: { slug: "villa-del-lago-buenos-aires" },
        update: { orgId: org.id, creadoPorId: admin.id, visibilityStatus: "PUBLICADO" },
        create: {
            nombre: "Villa del Lago",
            slug: "villa-del-lago-buenos-aires",
            descripcion: "Barrio cerrado con laguna en Cañuelas, Buenos Aires. Lotes premium con acceso al agua, seguridad 24hs y amenities de primer nivel.",
            ubicacion: "Ruta 3 km 89, Cañuelas, Buenos Aires",
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            tipo: "BARRIO_CERRADO",
            invertible: false,
            imagenPortada: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
            mapCenterLat: -35.0563,
            mapCenterLng: -58.7534,
            mapZoom: 16,
            precioM2Inversor: 95,
            precioM2Mercado: 120,
            orgId: org.id,
            creadoPorId: admin.id,
        } as any,
    });

    const etapa1VL = await prisma.etapa.create({ data: { proyectoId: villa.id, nombre: "Etapa 1 - Frente al Lago", orden: 1, estado: "EN_CURSO" } });
    const etapa2VL = await prisma.etapa.create({ data: { proyectoId: villa.id, nombre: "Etapa 2 - Sector Interior", orden: 2, estado: "PENDIENTE" } });
    const mLago = await prisma.manzana.create({ data: { etapaId: etapa1VL.id, nombre: "Manzana Lago" } });
    await prisma.unidad.createMany({ data: [
        { manzanaId: mLago.id, numero: "L-01", tipo: "LOTE", superficie: 450, frente: 15, fondo: 30, precio: 185000, estado: "VENDIDA",    moneda: "USD", esEsquina: true },
        { manzanaId: mLago.id, numero: "L-02", tipo: "LOTE", superficie: 460, frente: 15, fondo: 31, precio: 190000, estado: "VENDIDA",    moneda: "USD" },
        { manzanaId: mLago.id, numero: "L-03", tipo: "LOTE", superficie: 480, frente: 15, fondo: 32, precio: 195000, estado: "VENDIDA",    moneda: "USD" },
        { manzanaId: mLago.id, numero: "L-04", tipo: "LOTE", superficie: 500, frente: 15, fondo: 33, precio: 200000, estado: "RESERVADA",  moneda: "USD" },
        { manzanaId: mLago.id, numero: "L-05", tipo: "LOTE", superficie: 520, frente: 15, fondo: 35, precio: 210000, estado: "SEÑADA",     moneda: "USD" },
        { manzanaId: mLago.id, numero: "L-06", tipo: "LOTE", superficie: 510, frente: 15, fondo: 34, precio: 215000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: mLago.id, numero: "L-07", tipo: "LOTE", superficie: 530, frente: 15, fondo: 35, precio: 220000, estado: "DISPONIBLE", moneda: "USD" },
        { manzanaId: mLago.id, numero: "L-08", tipo: "LOTE", superficie: 540, frente: 15, fondo: 36, precio: 225000, estado: "DISPONIBLE", moneda: "USD", esEsquina: true },
    ] as any });
    const mParque = await prisma.manzana.create({ data: { etapaId: etapa1VL.id, nombre: "Manzana Parque" } });
    await prisma.unidad.createMany({ data: [
        { manzanaId: mParque.id, numero: "P-01", tipo: "LOTE", superficie: 380, frente: 14, fondo: 27, precio: 145000, estado: "DISPONIBLE",    moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-02", tipo: "LOTE", superficie: 400, frente: 14, fondo: 29, precio: 150000, estado: "DISPONIBLE",    moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-03", tipo: "LOTE", superficie: 420, frente: 14, fondo: 30, precio: 155000, estado: "DISPONIBLE",    moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-04", tipo: "LOTE", superficie: 440, frente: 14, fondo: 31, precio: 160000, estado: "RESERVADA",     moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-05", tipo: "LOTE", superficie: 460, frente: 14, fondo: 33, precio: 165000, estado: "RESERVADA",     moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-06", tipo: "LOTE", superficie: 480, frente: 14, fondo: 34, precio: 170000, estado: "VENDIDA",       moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-07", tipo: "LOTE", superficie: 500, frente: 14, fondo: 36, precio: 175000, estado: "DISPONIBLE",    moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-08", tipo: "LOTE", superficie: 520, frente: 14, fondo: 37, precio: 180000, estado: "DISPONIBLE",    moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-09", tipo: "LOTE", superficie: 540, frente: 14, fondo: 39, precio: 185000, estado: "NO_DISPONIBLE", moneda: "USD" },
        { manzanaId: mParque.id, numero: "P-10", tipo: "LOTE", superficie: 560, frente: 14, fondo: 40, precio: 190000, estado: "DISPONIBLE",    moneda: "USD" },
    ] as any });
    const mInterior = await prisma.manzana.create({ data: { etapaId: etapa2VL.id, nombre: "Manzana Interior" } });
    await prisma.unidad.createMany({ data: Array.from({ length: 12 }, (_, i) => ({
        manzanaId: mInterior.id,
        numero: `I-${String(i + 1).padStart(2, "0")}`,
        tipo: "LOTE",
        superficie: 320 + i * 15,
        frente: 12,
        fondo: 27 + i,
        precio: 110000 + i * 3500,
        estado: "DISPONIBLE",
        moneda: "USD",
    })) as any });
    console.log(`✅ Villa del Lago: 30 lotes creados (Lago + Parque + Interior)`);

    // ─── 11. Barrio Capinota ───
    const capinota = await prisma.proyecto.upsert({
        where: { slug: "barrio-capinota" },
        update: {
            orgId: org.id, creadoPorId: admin.id, visibilityStatus: "PUBLICADO",
            precioM2Inversor: 40, precioM2Mercado: 55,
            mapCenterLat: -17.4506, mapCenterLng: -66.2774, mapZoom: 16,
        } as any,
        create: {
            nombre: "Barrio Capinota",
            slug: "barrio-capinota",
            descripcion: "Barrio privado con lotes de 300 a 600 m² en entorno natural. Calles internas pavimentadas, espacios verdes y acceso controlado. Financiación disponible.",
            ubicacion: "Capinota, Cochabamba, Bolivia",
            estado: "EN_VENTA",
            visibilityStatus: "PUBLICADO",
            tipo: "URBANIZACION",
            invertible: false,
            imagenPortada: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&auto=format&fit=crop",
            mapCenterLat: -17.4506,
            mapCenterLng: -66.2774,
            mapZoom: 16,
            precioM2Inversor: 40,
            precioM2Mercado: 55,
            orgId: org.id,
            creadoPorId: admin.id,
        } as any,
    });

    const existCapinota = await prisma.etapa.findFirst({ where: { proyectoId: capinota.id } });
    if (!existCapinota) {
        const etapaCap = await prisma.etapa.create({
            data: { proyectoId: capinota.id, nombre: "Etapa 1", orden: 1, estado: "EN_CURSO" }
        });
        const lotesCapA = Array.from({ length: 10 }, (_, i) => {
            const estados = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","VENDIDA","VENDIDA"];
            return { numero: `A-${String(i+1).padStart(2,"0")}`, tipo: "LOTE", superficie: 300 + i*20, frente: 10 + (i%3), fondo: 28, precio: 15000 + i*2000, estado: estados[i], moneda: "USD", esEsquina: i === 0 || i === 9 };
        });
        const lotesCapB = Array.from({ length: 10 }, (_, i) => {
            const estados = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","RESERVADA","VENDIDA","DISPONIBLE","DISPONIBLE","DISPONIBLE"];
            return { numero: `B-${String(i+1).padStart(2,"0")}`, tipo: "LOTE", superficie: 310 + i*18, frente: 10 + (i%3), fondo: 29, precio: 16000 + i*1800, estado: estados[i], moneda: "USD", esEsquina: i === 0 || i === 9 };
        });
        await prisma.manzana.create({ data: { etapaId: etapaCap.id, nombre: "Manzana A", unidades: { create: lotesCapA as any } } });
        await prisma.manzana.create({ data: { etapaId: etapaCap.id, nombre: "Manzana B", unidades: { create: lotesCapB as any } } });
    }
    console.log(`✅ Barrio Capinota: proyecto + 20 lotes creados`);

    // ─── 12. Imágenes de galería para todos los proyectos ───
    type GaleriaItem = { url: string; categoria: string; esPrincipal: boolean; orden: number };
    const galeriasPorSlug: { slug: string; imgs: GaleriaItem[] }[] = [
        { slug: "barrio-los-alamos", imgs: [
            { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "RENDER",      esPrincipal: true,  orden: 1 },
            { url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 2 },
            { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 3 },
            { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
            { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
        ]},
        { slug: "reserva-geodevia", imgs: [
            { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "RENDER",      esPrincipal: true,  orden: 1 },
            { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 2 },
            { url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 3 },
            { url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
            { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
            { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", categoria: "MASTERPLAN",  esPrincipal: false, orden: 6 },
        ]},
        { slug: "barrio-las-casuarinas", imgs: [
            { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "RENDER",      esPrincipal: true,  orden: 1 },
            { url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 2 },
            { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 3 },
            { url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
        ]},
        { slug: "loteo-san-martin-mendoza", imgs: [
            { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "RENDER",      esPrincipal: true,  orden: 1 },
            { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 2 },
            { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 3 },
            { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
        ]},
        { slug: "chacras-del-norte-santa-fe", imgs: [
            { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "RENDER",      esPrincipal: true,  orden: 1 },
            { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 2 },
            { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 3 },
            { url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
            { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
        ]},
        { slug: "villa-del-lago-buenos-aires", imgs: [
            { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", categoria: "RENDER",      esPrincipal: true,  orden: 1 },
            { url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 2 },
            { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 3 },
            { url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80", categoria: "INTERIOR",    esPrincipal: false, orden: 4 },
            { url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
            { url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1200&q=80", categoria: "MASTERPLAN",  esPrincipal: false, orden: 6 },
        ]},
        { slug: "barrio-capinota", imgs: [
            { url: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80", categoria: "RENDER",      esPrincipal: true,  orden: 1 },
            { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 2 },
            { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", categoria: "EXTERIOR",    esPrincipal: false, orden: 3 },
            { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 4 },
            { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", categoria: "AVANCE_OBRA", esPrincipal: false, orden: 5 },
        ]},
    ];

    for (const g of galeriasPorSlug) {
        const p = await prisma.proyecto.findUnique({ where: { slug: g.slug }, select: { id: true } });
        if (!p) continue;
        await prisma.proyectoImagen.deleteMany({ where: { proyectoId: p.id } });
        await prisma.proyectoImagen.createMany({ data: g.imgs.map(img => ({ ...img, proyectoId: p.id })) });
    }
    console.log(`✅ Galería: imágenes cargadas para los 7 proyectos`);

    // ─── 12. Default CRM Pipeline Stages ───
    await prisma.pipelineEtapa.deleteMany({ where: { orgId: org.id } });
    await prisma.pipelineEtapa.createMany({
        data: [
            { nombre: "Nuevo",           color: "#6366f1", orden: 1, esDefault: true,  orgId: org.id },
            { nombre: "Contactado",      color: "#3b82f6", orden: 2, esDefault: false, orgId: org.id },
            { nombre: "Calificado",      color: "#f59e0b", orden: 3, esDefault: false, orgId: org.id },
            { nombre: "Propuesta",       color: "#8b5cf6", orden: 4, esDefault: false, orgId: org.id },
            { nombre: "Cerrado Ganado",  color: "#10b981", orden: 5, esDefault: false, orgId: org.id },
            { nombre: "Cerrado Perdido", color: "#ef4444", orden: 6, esDefault: false, orgId: org.id },
        ],
    });
    console.log(`✅ Pipeline: 6 etapas CRM creadas`);

    // ─── 13. Banners HOME_TOP ───
    await prisma.banner.deleteMany({ where: { orgId: org.id, posicion: "HOME_TOP" } });
    await prisma.banner.createMany({
        data: [
            {
                titulo: "Villa del Lago",
                internalName: "villa-del-lago-home",
                tipo: "IMAGEN",
                mediaUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
                posicion: "HOME_TOP",
                prioridad: 95,
                estado: "PUBLISHED",
                ctaText: "Ver disponibilidad",
                ctaUrl: "/proyectos/villa-del-lago-buenos-aires",
                headline: "Vivir con vista al lago",
                subheadline: "Villa del Lago — Cañuelas, Buenos Aires",
                tagline: "Barrio cerrado premium · Desde USD 110.000",
                context: "SEVENTOOP_GLOBAL",
                orgId: org.id,
                creadoPorId: admin.id,
            },
            {
                titulo: "Barrio Las Casuarinas",
                internalName: "barrio-las-casuarinas-home",
                tipo: "IMAGEN",
                mediaUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=2070&auto=format&fit=crop",
                posicion: "HOME_TOP",
                prioridad: 90,
                estado: "PUBLISHED",
                ctaText: "Ver lotes disponibles",
                ctaUrl: "/proyectos/barrio-las-casuarinas",
                headline: "Tu lote en Córdoba te espera",
                subheadline: "Barrio Las Casuarinas — Corralejo, Córdoba",
                tagline: "Desde USD 75.000 · Escrituración inmediata",
                context: "SEVENTOOP_GLOBAL",
                orgId: org.id,
                creadoPorId: admin.id,
            },
            {
                titulo: "Loteo San Martín",
                internalName: "loteo-san-martin-home",
                tipo: "IMAGEN",
                mediaUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop",
                posicion: "HOME_TOP",
                prioridad: 85,
                estado: "PUBLISHED",
                ctaText: "Conocer el proyecto",
                ctaUrl: "/proyectos/loteo-san-martin-mendoza",
                headline: "Invertí en Mendoza",
                subheadline: "Loteo San Martín — Maipú, Mendoza",
                tagline: "Lotes residenciales desde USD 55.000",
                context: "SEVENTOOP_GLOBAL",
                orgId: org.id,
                creadoPorId: admin.id,
            },
            {
                titulo: "Chacras del Norte",
                internalName: "chacras-del-norte-home",
                tipo: "IMAGEN",
                mediaUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
                posicion: "HOME_TOP",
                prioridad: 80,
                estado: "PUBLISHED",
                ctaText: "Reservar en preventa",
                ctaUrl: "/proyectos/chacras-del-norte-santa-fe",
                headline: "Chacras amplias en Santa Fe",
                subheadline: "Chacras del Norte — Rafaela, Santa Fe",
                tagline: "Preventa exclusiva · Chacras de 600 a 1200 m²",
                context: "SEVENTOOP_GLOBAL",
                orgId: org.id,
                creadoPorId: admin.id,
            },
            {
                titulo: "Barrio Capinota",
                internalName: "barrio-capinota-home",
                tipo: "IMAGEN",
                mediaUrl: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&auto=format&fit=crop",
                posicion: "HOME_TOP",
                prioridad: 75,
                estado: "PUBLISHED",
                ctaText: "Ver el proyecto",
                ctaUrl: "/proyectos/barrio-capinota",
                headline: "Barrio Capinota",
                subheadline: "Entre 1500 y 1800 lotes a la venta",
                tagline: "Preventa",
                context: "SEVENTOOP_GLOBAL",
                orgId: org.id,
                creadoPorId: admin.id,
            },
        ] as any,
    });
    console.log(`✅ Banners: 5 banners HOME_TOP creados`);

    console.log("\n✅ Seed completed successfully!");
    console.log(`\n📌 SEVENTOOP_MAIN_ORG_ID=${org.id}`);
    console.log("   Add this value to your .env and Neon dashboard environment variables.\n");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
