import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding demo data...");

    const SALT = 10;
    const PASSWORD = "Demo@123456";
    const hash = await bcrypt.hash(PASSWORD, SALT);

    // ─── ORGANIZATIONS ───────────────────────────────────────────
    console.log("Creating organizations...");
    const orgAlamos = await prisma.organization.upsert({
        where: { slug: "desarrollos-alamos" },
        update: {},
        create: {
            nombre: "Desarrollos Los Álamos S.A.",
            slug: "desarrollos-alamos",
            plan: "PRO",
        },
    });

    const orgSanMartin = await prisma.organization.upsert({
        where: { slug: "loteos-san-martin" },
        update: {},
        create: {
            nombre: "Loteos San Martín",
            slug: "loteos-san-martin",
            plan: "BASIC",
        },
    });

    // ─── USERS ───────────────────────────────────────────────────
    console.log("Creating users...");
    const hector = await prisma.user.upsert({
        where: { email: "hector.ruiz@demo.seventoop.com" },
        update: {},
        create: {
            email: "hector.ruiz@demo.seventoop.com",
            password: hash,
            nombre: "Héctor",
            apellido: "Ruiz",
            rol: "DESARROLLADOR",
            kycStatus: "APROBADO",
            orgId: orgAlamos.id,
        },
    });

    const maria = await prisma.user.upsert({
        where: { email: "maria.garcia@demo.seventoop.com" },
        update: {},
        create: {
            email: "maria.garcia@demo.seventoop.com",
            password: hash,
            nombre: "María",
            apellido: "García",
            rol: "VENDEDOR",
            kycStatus: "APROBADO",
            orgId: orgAlamos.id,
        },
    });

    const carlos = await prisma.user.upsert({
        where: { email: "carlos.lopez@demo.seventoop.com" },
        update: {},
        create: {
            email: "carlos.lopez@demo.seventoop.com",
            password: hash,
            nombre: "Carlos",
            apellido: "López",
            rol: "DESARROLLADOR",
            kycStatus: "APROBADO",
            orgId: orgSanMartin.id,
        },
    });

    const luisa = await prisma.user.upsert({
        where: { email: "luisa.fernandez@demo.seventoop.com" },
        update: {},
        create: {
            email: "luisa.fernandez@demo.seventoop.com",
            password: hash,
            nombre: "Luisa",
            apellido: "Fernández",
            rol: "VENDEDOR",
            kycStatus: "APROBADO",
            orgId: orgSanMartin.id,
        },
    });

    console.log("Users:", hector.email, maria.email, carlos.email, luisa.email);

    // ─── PROJECT 1: Barrio Las Casuarinas (Córdoba) ──────────────
    console.log("Creating project 1: Barrio Las Casuarinas...");
    const p1 = await prisma.proyecto.upsert({
        where: { slug: "barrio-las-casuarinas" },
        update: {},
        create: {
            nombre: "Barrio Las Casuarinas",
            slug: "barrio-las-casuarinas",
            descripcion: "Loteo residencial en las afueras de Córdoba Capital, con excelente acceso y servicios completos. Lotes de 300 a 600 m² en un entorno natural privilegiado.",
            ubicacion: "Av. Los Plátanos 1200, Corralejo, Córdoba",
            estado: "EN_VENTA",
            tipo: "URBANIZACION",
            visibilityStatus: "PUBLICADO",
            mapCenterLat: -31.3284,
            mapCenterLng: -64.2247,
            mapZoom: 16,
            precioM2Mercado: 85,
            precioM2Inversor: 70,
            creadoPorId: hector.id,
            orgId: orgAlamos.id,
            puedePublicarse: true,
            puedeReservarse: true,
            puedeCaptarLeads: true,
            documentacionEstado: "APROBADA",
            estadoValidacion: "APROBADO",
        },
    });

    // Etapa 1
    const p1e1 = await prisma.etapa.create({
        data: { proyectoId: p1.id, nombre: "Etapa 1", orden: 1, estado: "EN_CURSO" },
    });
    const p1m1 = await prisma.manzana.create({
        data: { etapaId: p1e1.id, nombre: "Manzana A" },
    });
    const p1m2 = await prisma.manzana.create({
        data: { etapaId: p1e1.id, nombre: "Manzana B" },
    });

    // Etapa 2
    const p1e2 = await prisma.etapa.create({
        data: { proyectoId: p1.id, nombre: "Etapa 2", orden: 2, estado: "PENDIENTE" },
    });
    const p1m3 = await prisma.manzana.create({
        data: { etapaId: p1e2.id, nombre: "Manzana C" },
    });

    // Lotes Manzana A (10 lotes mixtos)
    const estadosA = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","RESERVADA","VENDIDA","VENDIDA","VENDIDA","SEÑADA","NO_DISPONIBLE"];
    for (let i = 0; i < 10; i++) {
        const sup = 300 + Math.round(Math.random() * 200);
        await prisma.unidad.create({
            data: {
                manzanaId: p1m1.id,
                numero: `A-${String(i+1).padStart(2,"0")}`,
                tipo: "LOTE",
                superficie: sup,
                frente: 12 + (i % 3) * 2,
                fondo: Math.round(sup / 12),
                esEsquina: i === 0 || i === 9,
                orientacion: i < 5 ? "Norte" : "Sur",
                precio: 75000 + i * 3000,
                moneda: "USD",
                estado: estadosA[i],
                centerLat: -31.3284 + (i - 5) * 0.0002,
                centerLng: -64.2247 + (i % 3 - 1) * 0.0003,
            },
        });
    }

    // Lotes Manzana B (8 lotes)
    const estadosB = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","VENDIDA","SEÑADA","DISPONIBLE"];
    for (let i = 0; i < 8; i++) {
        const sup = 350 + Math.round(Math.random() * 150);
        await prisma.unidad.create({
            data: {
                manzanaId: p1m2.id,
                numero: `B-${String(i+1).padStart(2,"0")}`,
                tipo: "LOTE",
                superficie: sup,
                frente: 14,
                fondo: Math.round(sup / 14),
                esEsquina: i === 0 || i === 7,
                orientacion: i < 4 ? "Este" : "Oeste",
                precio: 80000 + i * 2500,
                moneda: "USD",
                estado: estadosB[i],
            },
        });
    }

    // Lotes Manzana C - Etapa 2 (6 lotes todos disponibles)
    for (let i = 0; i < 6; i++) {
        await prisma.unidad.create({
            data: {
                manzanaId: p1m3.id,
                numero: `C-${String(i+1).padStart(2,"0")}`,
                tipo: "LOTE",
                superficie: 400 + i * 25,
                frente: 15,
                fondo: Math.round((400 + i * 25) / 15),
                esEsquina: i === 0 || i === 5,
                precio: 92000 + i * 4000,
                moneda: "USD",
                estado: "DISPONIBLE",
            },
        });
    }

    // ─── PROJECT 2: Loteo San Martín (Mendoza) ───────────────────
    console.log("Creating project 2: Loteo San Martín...");
    const p2 = await prisma.proyecto.upsert({
        where: { slug: "loteo-san-martin-mendoza" },
        update: {},
        create: {
            nombre: "Loteo San Martín",
            slug: "loteo-san-martin-mendoza",
            descripcion: "Desarrollo de lotes residenciales en Maipú, Mendoza. Zona con alta demanda, a minutos del centro mendocino. Escrituración inmediata disponible.",
            ubicacion: "Calle Sarmiento 450, Maipú, Mendoza",
            estado: "EN_VENTA",
            tipo: "URBANIZACION",
            visibilityStatus: "PUBLICADO",
            mapCenterLat: -32.9812,
            mapCenterLng: -68.7783,
            mapZoom: 16,
            precioM2Mercado: 65,
            precioM2Inversor: 52,
            creadoPorId: carlos.id,
            orgId: orgSanMartin.id,
            puedePublicarse: true,
            puedeReservarse: true,
            puedeCaptarLeads: true,
            documentacionEstado: "APROBADA",
            estadoValidacion: "APROBADO",
        },
    });

    const p2e1 = await prisma.etapa.create({
        data: { proyectoId: p2.id, nombre: "Etapa Única", orden: 1, estado: "EN_CURSO" },
    });
    const p2m1 = await prisma.manzana.create({ data: { etapaId: p2e1.id, nombre: "Manzana 1" } });
    const p2m2 = await prisma.manzana.create({ data: { etapaId: p2e1.id, nombre: "Manzana 2" } });
    const p2m3 = await prisma.manzana.create({ data: { etapaId: p2e1.id, nombre: "Manzana 3" } });

    const estadosP2 = [
        ["DISPONIBLE","DISPONIBLE","VENDIDA","VENDIDA","VENDIDA","RESERVADA","DISPONIBLE"],
        ["RESERVADA","RESERVADA","DISPONIBLE","DISPONIBLE","SEÑADA","VENDIDA","DISPONIBLE"],
        ["DISPONIBLE","DISPONIBLE","DISPONIBLE","NO_DISPONIBLE","DISPONIBLE","RESERVADA"],
    ];
    const manzanasP2 = [p2m1, p2m2, p2m3];

    for (let m = 0; m < 3; m++) {
        const estados = estadosP2[m];
        for (let i = 0; i < estados.length; i++) {
            await prisma.unidad.create({
                data: {
                    manzanaId: manzanasP2[m].id,
                    numero: `${m+1}-${String(i+1).padStart(2,"0")}`,
                    tipo: "LOTE",
                    superficie: 250 + Math.round(Math.random() * 150),
                    frente: 10 + (i % 2) * 2,
                    fondo: 25,
                    esEsquina: i === 0,
                    precio: 55000 + (m * 7 + i) * 2000,
                    moneda: "USD",
                    estado: estados[i],
                    centerLat: -32.9812 + (m - 1) * 0.003 + i * 0.0003,
                    centerLng: -68.7783 + (m - 1) * 0.002,
                },
            });
        }
    }

    // ─── PROJECT 3: Chacras del Norte (Santa Fe) ─────────────────
    console.log("Creating project 3: Chacras del Norte...");
    const p3 = await prisma.proyecto.upsert({
        where: { slug: "chacras-del-norte-santa-fe" },
        update: {},
        create: {
            nombre: "Chacras del Norte",
            slug: "chacras-del-norte-santa-fe",
            descripcion: "Parcelamiento rural-residencial en las afueras de Rafaela, Santa Fe. Lotes amplios de 600 a 1200 m² ideales para vivienda permanente o segunda residencia.",
            ubicacion: "Ruta Provincial 70 km 4, Rafaela, Santa Fe",
            estado: "PREVENTA",
            tipo: "CHACRA",
            visibilityStatus: "PUBLICADO",
            mapCenterLat: -31.2526,
            mapCenterLng: -61.4878,
            mapZoom: 15,
            precioM2Mercado: 45,
            precioM2Inversor: 36,
            creadoPorId: hector.id,
            orgId: orgAlamos.id,
            puedePublicarse: true,
            puedeReservarse: false,
            puedeCaptarLeads: true,
            documentacionEstado: "EN_PROCESO",
            estadoValidacion: "EN_REVISION",
        },
    });

    const p3e1 = await prisma.etapa.create({
        data: { proyectoId: p3.id, nombre: "Parcelamiento Principal", orden: 1, estado: "EN_CURSO" },
    });
    const p3m1 = await prisma.manzana.create({ data: { etapaId: p3e1.id, nombre: "Sector Norte" } });
    const p3m2 = await prisma.manzana.create({ data: { etapaId: p3e1.id, nombre: "Sector Sur" } });

    const estadosP3norte = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","SEÑADA","DISPONIBLE","DISPONIBLE"];
    for (let i = 0; i < estadosP3norte.length; i++) {
        const sup = 600 + i * 75;
        await prisma.unidad.create({
            data: {
                manzanaId: p3m1.id,
                numero: `N-${String(i+1).padStart(2,"0")}`,
                tipo: "CHACRA",
                superficie: sup,
                frente: 20 + i * 2,
                fondo: Math.round(sup / (20 + i * 2)),
                esEsquina: i === 0 || i === 7,
                precio: 35000 + i * 5000,
                moneda: "USD",
                estado: estadosP3norte[i],
                centerLat: -31.2526 + i * 0.0005,
                centerLng: -61.4878,
            },
        });
    }
    const estadosP3sur = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","NO_DISPONIBLE","DISPONIBLE","DISPONIBLE","VENDIDA"];
    for (let i = 0; i < estadosP3sur.length; i++) {
        const sup = 700 + i * 50;
        await prisma.unidad.create({
            data: {
                manzanaId: p3m2.id,
                numero: `S-${String(i+1).padStart(2,"0")}`,
                tipo: "CHACRA",
                superficie: sup,
                frente: 22,
                fondo: Math.round(sup / 22),
                precio: 38000 + i * 4000,
                moneda: "USD",
                estado: estadosP3sur[i],
            },
        });
    }

    // ─── PROJECT 4: Villa del Lago (Buenos Aires) ─────────────────
    console.log("Creating project 4: Villa del Lago...");
    const p4 = await prisma.proyecto.upsert({
        where: { slug: "villa-del-lago-buenos-aires" },
        update: {},
        create: {
            nombre: "Villa del Lago",
            slug: "villa-del-lago-buenos-aires",
            descripcion: "Barrio cerrado con laguna en Cañuelas, Buenos Aires. Lotes premium con acceso al agua, seguridad 24hs y amenities de primer nivel.",
            ubicacion: "Ruta 3 km 89, Cañuelas, Buenos Aires",
            estado: "EN_VENTA",
            tipo: "BARRIO_CERRADO",
            visibilityStatus: "PUBLICADO",
            mapCenterLat: -35.0563,
            mapCenterLng: -58.7534,
            mapZoom: 16,
            precioM2Mercado: 120,
            precioM2Inversor: 95,
            creadoPorId: carlos.id,
            orgId: orgSanMartin.id,
            puedePublicarse: true,
            puedeReservarse: true,
            puedeCaptarLeads: true,
            documentacionEstado: "APROBADA",
            estadoValidacion: "APROBADO",
        },
    });

    const p4e1 = await prisma.etapa.create({
        data: { proyectoId: p4.id, nombre: "Etapa 1 - Frente al Lago", orden: 1, estado: "EN_CURSO" },
    });
    const p4e2 = await prisma.etapa.create({
        data: { proyectoId: p4.id, nombre: "Etapa 2 - Sector Interior", orden: 2, estado: "PENDIENTE" },
    });
    const p4m1 = await prisma.manzana.create({ data: { etapaId: p4e1.id, nombre: "Manzana Lago" } });
    const p4m2 = await prisma.manzana.create({ data: { etapaId: p4e1.id, nombre: "Manzana Parque" } });
    const p4m3 = await prisma.manzana.create({ data: { etapaId: p4e2.id, nombre: "Manzana Interior" } });

    const lotesLago = [
        { e: "VENDIDA", p: 185000, sup: 450 },
        { e: "VENDIDA", p: 190000, sup: 460 },
        { e: "VENDIDA", p: 195000, sup: 480 },
        { e: "RESERVADA", p: 200000, sup: 500 },
        { e: "SEÑADA", p: 210000, sup: 520 },
        { e: "DISPONIBLE", p: 215000, sup: 510 },
        { e: "DISPONIBLE", p: 220000, sup: 530 },
        { e: "DISPONIBLE", p: 225000, sup: 540 },
    ];
    for (let i = 0; i < lotesLago.length; i++) {
        const l = lotesLago[i];
        await prisma.unidad.create({
            data: {
                manzanaId: p4m1.id,
                numero: `L-${String(i+1).padStart(2,"0")}`,
                tipo: "LOTE",
                superficie: l.sup,
                frente: 15,
                fondo: Math.round(l.sup / 15),
                esEsquina: i === 0 || i === 7,
                precio: l.p,
                moneda: "USD",
                estado: l.e,
                centerLat: -35.0563 + (i - 4) * 0.0003,
                centerLng: -58.7534 + 0.003,
            },
        });
    }

    const estadosParque = ["DISPONIBLE","DISPONIBLE","DISPONIBLE","RESERVADA","RESERVADA","VENDIDA","DISPONIBLE","DISPONIBLE","NO_DISPONIBLE","DISPONIBLE"];
    for (let i = 0; i < estadosParque.length; i++) {
        await prisma.unidad.create({
            data: {
                manzanaId: p4m2.id,
                numero: `P-${String(i+1).padStart(2,"0")}`,
                tipo: "LOTE",
                superficie: 380 + i * 20,
                frente: 14,
                fondo: Math.round((380 + i * 20) / 14),
                precio: 145000 + i * 5000,
                moneda: "USD",
                estado: estadosParque[i],
            },
        });
    }

    for (let i = 0; i < 12; i++) {
        await prisma.unidad.create({
            data: {
                manzanaId: p4m3.id,
                numero: `I-${String(i+1).padStart(2,"0")}`,
                tipo: "LOTE",
                superficie: 320 + i * 15,
                frente: 12,
                fondo: Math.round((320 + i * 15) / 12),
                precio: 110000 + i * 3500,
                moneda: "USD",
                estado: "DISPONIBLE",
            },
        });
    }

    console.log("✅ Seed completed!");
    console.log(`\n📋 CREDENCIALES DE ACCESO (password: ${PASSWORD})`);
    console.log("- hector.ruiz@demo.seventoop.com      → DESARROLLADOR (org: Desarrollos Los Álamos)");
    console.log("- maria.garcia@demo.seventoop.com     → VENDEDOR       (org: Desarrollos Los Álamos)");
    console.log("- carlos.lopez@demo.seventoop.com     → DESARROLLADOR  (org: Loteos San Martín)");
    console.log("- luisa.fernandez@demo.seventoop.com  → VENDEDOR       (org: Loteos San Martín)");
    console.log("\n📦 PROYECTOS CREADOS:");
    console.log("1. Barrio Las Casuarinas  - Córdoba   - EN_VENTA    - 24 lotes (A, B, C)");
    console.log("2. Loteo San Martín       - Mendoza   - EN_VENTA    - 20 lotes (3 manzanas)");
    console.log("3. Chacras del Norte      - Santa Fe  - PREVENTA    - 15 chacras");
    console.log("4. Villa del Lago         - Bs As     - EN_VENTA    - 30 lotes (lago, parque, interior)");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
