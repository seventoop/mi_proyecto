import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "Demo@123456";
const DEMO_ORG_SLUG = "demo-org";

type Users = Record<"admin" | "developer" | "vendor" | "investor" | "client", { id: string }>;

type ProjectDef = {
    slug: string;
    nombre: string;
    tipo: string;
    estado: string;
    ubicacion: string;
    descripcion: string;
    portada: string;
    images: string[];
    lat: number;
    lng: number;
    invertible?: boolean;
    pMercado?: number;
    pInversor?: number;
    metaM2?: number;
    vendidosM2?: number;
    fondeoHasta?: Date;
    hero: { tag: string; title: string; subtitle: string };
    blocks: Array<{ name: string; prefix: string; count: number; price: number; surface: number; lat: number; lng: number; reserved: number[]; sold: number[]; tipo?: string; step?: number }>;
};

const DOC_URLS = [
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "https://www.orimi.com/pdf-test.pdf",
];

const HOME_BANNERS = [
    {
        titulo: "Demo Collection 01",
        internalName: "demo-global-banner-01",
        headline: "Desarrollos demo listos para navegar hoy",
        subheadline: "Cinco proyectos con stock, leads y reservas para probar preview.",
        tagline: "Demo 2026",
        ctaText: "Explorar proyectos",
        ctaUrl: "/proyectos",
        mediaUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2000&auto=format&fit=crop",
        prioridad: 100,
    },
    {
        titulo: "Demo Collection 02",
        internalName: "demo-global-banner-02",
        headline: "Del barrio premium al condominio urbano",
        subheadline: "Variedad de producto y lectura comercial para una preview viva.",
        tagline: "Preview viva",
        ctaText: "Ver destacados",
        ctaUrl: "/#proyectos",
        mediaUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=2000&auto=format&fit=crop",
        prioridad: 99,
    },
    {
        titulo: "Demo Collection 03",
        internalName: "demo-global-banner-03",
        headline: "Leads, reservas e inventario con actividad",
        subheadline: "Datos demo originales, seguros y listos para testing.",
        tagline: "Seed visual",
        ctaText: "Ir al home",
        ctaUrl: "/",
        mediaUrl: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=2000&auto=format&fit=crop",
        prioridad: 98,
    },
];

function polygon(lat: number, lng: number) {
    return [
        { lat, lng },
        { lat, lng: lng + 0.00012 },
        { lat: lat - 0.00009, lng: lng + 0.00012 },
        { lat: lat - 0.00009, lng },
    ];
}

function masterplanSvg(name: string) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900"><rect width="1400" height="900" fill="#f6efe3"/><rect x="80" y="80" width="1240" height="740" rx="42" fill="#e7d8bd" stroke="#8a7354" stroke-width="6"/><path d="M130 450 H1270" stroke="#b48b57" stroke-width="56" stroke-linecap="round"/><path d="M705 130 V770" stroke="#b48b57" stroke-width="44" stroke-linecap="round"/><circle cx="705" cy="450" r="96" fill="#d4b07d"/><ellipse cx="1080" cy="250" rx="170" ry="100" fill="#89c8da"/><rect x="180" y="600" width="210" height="120" rx="18" fill="#d7edc2"/><rect x="960" y="610" width="220" height="110" rx="18" fill="#d7edc2"/><rect x="925" y="390" width="250" height="120" rx="18" fill="#c4ddb2"/><rect x="465" y="595" width="180" height="110" rx="18" fill="#dff0d3"/><text x="700" y="852" text-anchor="middle" font-family="Arial" font-size="24" fill="#735531">${name} masterplan demo</text></svg>`;
}

async function ensureUsers() {
    const password = await bcrypt.hash(PASSWORD, 10);
    const org = await prisma.organization.upsert({
        where: { slug: DEMO_ORG_SLUG },
        update: { nombre: "SevenToop Demo District", plan: "FREE" },
        create: { nombre: "SevenToop Demo District", slug: DEMO_ORG_SLUG, plan: "FREE" },
    });
    const defs = [
        { key: "admin", email: "admin.demo@seventoop.local", nombre: "Admin Demo", rol: "ADMIN", orgId: null, kycStatus: "VERIFICADO" },
        { key: "developer", email: "desarrollador.demo@seventoop.local", nombre: "Desarrollador Demo", rol: "DESARROLLADOR", orgId: org.id, kycStatus: "VERIFICADO" },
        { key: "vendor", email: "vendedor.demo@seventoop.local", nombre: "Vendedor Demo", rol: "VENDEDOR", orgId: org.id, kycStatus: "VERIFICADO" },
        { key: "investor", email: "inversor.demo@seventoop.local", nombre: "Inversor Demo", rol: "INVERSOR", orgId: null, kycStatus: "VERIFICADO" },
        { key: "client", email: "cliente.demo@seventoop.local", nombre: "Cliente Demo", rol: "CLIENTE", orgId: null, kycStatus: "NINGUNO" },
    ] as const;
    const users = {} as Users;
    for (const def of defs) {
        const saved = await prisma.user.upsert({
            where: { email: def.email },
            update: { nombre: def.nombre, rol: def.rol, orgId: def.orgId, kycStatus: def.kycStatus, password },
            create: { email: def.email, nombre: def.nombre, rol: def.rol, orgId: def.orgId, kycStatus: def.kycStatus, password },
            select: { id: true },
        });
        users[def.key] = saved;
    }
    await prisma.pipelineEtapa.deleteMany({ where: { orgId: org.id } });
    await prisma.pipelineEtapa.createMany({
        data: [
            { orgId: org.id, nombre: "Nuevo", color: "#2563eb", orden: 1, esDefault: true },
            { orgId: org.id, nombre: "Contactado", color: "#0ea5e9", orden: 2, esDefault: false },
            { orgId: org.id, nombre: "Visita", color: "#f59e0b", orden: 3, esDefault: false },
            { orgId: org.id, nombre: "Negociacion", color: "#8b5cf6", orden: 4, esDefault: false },
            { orgId: org.id, nombre: "Reserva", color: "#10b981", orden: 5, esDefault: false },
        ],
    });
    return { orgId: org.id, users };
}

async function clearProject(slug: string) {
    const existing = await prisma.proyecto.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return;
    await prisma.banner.deleteMany({ where: { projectId: existing.id } });
    await prisma.lead.deleteMany({ where: { proyectoId: existing.id } });
    await prisma.proyecto.delete({ where: { id: existing.id } });
}

function defs(): ProjectDef[] {
    return [
        {
            slug: "aurora-lagoon-golf",
            nombre: "Aurora Lagoon Golf",
            tipo: "BARRIO_PRIVADO",
            estado: "EN_DESARROLLO",
            ubicacion: "Corredor Norte, Pilar Lakes, Buenos Aires",
            descripcion: "Barrio premium con laguna, golf ejecutivo y lotes amplios para una demo aspiracional.",
            portada: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop",
            images: [
                "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop",
            ],
            lat: -34.4177,
            lng: -58.7501,
            invertible: true,
            pMercado: 235,
            pInversor: 165,
            metaM2: 9200,
            vendidosM2: 3480,
            fondeoHasta: new Date("2026-09-15T12:00:00.000Z"),
            hero: { tag: "Golf + laguna", title: "Paisajismo premium para una demo que impacta", subtitle: "Lotes al agua, boulevard central y amenities listas para mostrar." },
            blocks: [
                { name: "Isla A", prefix: "A", count: 12, price: 128000, surface: 780, lat: -34.4171, lng: -58.7514, reserved: [2, 7, 10], sold: [11, 12] },
                { name: "Isla B", prefix: "B", count: 12, price: 132000, surface: 820, lat: -34.4178, lng: -58.7496, reserved: [3, 4], sold: [10, 11, 12] },
                { name: "Boulevard C", prefix: "C", count: 10, price: 149000, surface: 860, lat: -34.4185, lng: -58.7511, reserved: [5], sold: [9] },
            ],
        },
        {
            slug: "senderos-del-parque",
            nombre: "Senderos del Parque",
            tipo: "BARRIO_PRIVADO",
            estado: "EN_DESARROLLO",
            ubicacion: "Cardales Oeste, Buenos Aires",
            descripcion: "Barrio familiar con plaza central y amenities cotidianos para una demo cercana y vendible.",
            portada: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=2000&auto=format&fit=crop",
            images: [
                "https://images.unsplash.com/photo-1505692794403-55d8d7b1f1b8?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1472220625704-91e1462799b2?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop",
            ],
            lat: -34.3002,
            lng: -59.0463,
            pMercado: 155,
            hero: { tag: "Barrio familiar", title: "Una demo pensada para vida cotidiana y venta rapida", subtitle: "Plaza central, SUM y lotes claros para navegar sin friccion." },
            blocks: [
                { name: "P1", prefix: "P1", count: 14, price: 52000, surface: 460, lat: -34.2999, lng: -59.0474, reserved: [4, 9], sold: [12] },
                { name: "P2", prefix: "P2", count: 14, price: 54500, surface: 480, lat: -34.3008, lng: -59.0458, reserved: [1, 5], sold: [11, 13] },
                { name: "P3", prefix: "P3", count: 12, price: 57500, surface: 500, lat: -34.3014, lng: -59.0470, reserved: [3], sold: [10] },
            ],
        },
        {
            slug: "portal-del-oeste-lotes",
            nombre: "Portal del Oeste Lotes",
            tipo: "URBANIZACION",
            estado: "PLANIFICACION",
            ubicacion: "Canning Sur, Buenos Aires",
            descripcion: "Lotes suburbanos mas accesibles con ticket de entrada competitivo y lectura comercial simple.",
            portada: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop",
            images: [
                "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop",
            ],
            lat: -34.8241,
            lng: -58.5348,
            pMercado: 98,
            hero: { tag: "Ticket accesible", title: "Una urbanizacion clara para probar filtros y stock", subtitle: "Inventario simple, estados mixtos y propuesta de entrada realista." },
            blocks: [
                { name: "O1", prefix: "O1", count: 16, price: 24500, surface: 305, lat: -34.8238, lng: -58.5356, reserved: [2, 8, 14], sold: [16] },
                { name: "O2", prefix: "O2", count: 16, price: 25200, surface: 315, lat: -34.8247, lng: -58.5343, reserved: [5, 12], sold: [15] },
                { name: "O3", prefix: "O3", count: 16, price: 26100, surface: 325, lat: -34.8253, lng: -58.5355, reserved: [6], sold: [13] },
            ],
        },
        {
            slug: "patios-del-jacaranda",
            nombre: "Patios del Jacaranda",
            tipo: "CONDOMINIO",
            estado: "EN_DESARROLLO",
            ubicacion: "Distrito Norte, Cordoba Capital",
            descripcion: "Condominio de baja densidad con patios privados y unidades urbanas mas boutique.",
            portada: "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=2000&auto=format&fit=crop",
            images: [
                "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1519643381401-22c77e60520e?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=1600&auto=format&fit=crop",
            ],
            lat: -31.3656,
            lng: -64.2473,
            pMercado: 1280,
            hero: { tag: "Condominio urbano", title: "Baja densidad y alto valor percibido para la preview", subtitle: "Otra escala de producto para mostrar variedad real." },
            blocks: [
                { name: "Bloque A", prefix: "A", count: 8, price: 89000, surface: 58, lat: -31.3652, lng: -64.2478, reserved: [2, 5], sold: [8], tipo: "DEPARTAMENTO", step: 4200 },
                { name: "Bloque B", prefix: "B", count: 8, price: 94000, surface: 64, lat: -31.3658, lng: -64.2469, reserved: [4], sold: [7], tipo: "DEPARTAMENTO", step: 4700 },
                { name: "Bloque C", prefix: "C", count: 8, price: 102000, surface: 72, lat: -31.3663, lng: -64.2477, reserved: [3], sold: [6], tipo: "DEPARTAMENTO", step: 5200 },
            ],
        },
        {
            slug: "alba-preventa-capital",
            nombre: "Alba Preventa Capital",
            tipo: "EDIFICIO",
            estado: "PLANIFICACION",
            ubicacion: "Distrito Rio, Rosario",
            descripcion: "Proyecto de preventa para mostrar fondeo, unidades urbanas y narrativa inversora.",
            portada: "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=2000&auto=format&fit=crop",
            images: [
                "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1600&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=1600&auto=format&fit=crop",
            ],
            lat: -32.9447,
            lng: -60.6324,
            invertible: true,
            pMercado: 1740,
            pInversor: 1280,
            metaM2: 4600,
            vendidosM2: 1680,
            fondeoHasta: new Date("2026-08-30T12:00:00.000Z"),
            hero: { tag: "Preventa inversora", title: "Un caso demo para mostrar fondeo e hitos", subtitle: "Ideal para probar dashboard inversor y detalle de proyecto." },
            blocks: [
                { name: "Torre A", prefix: "A", count: 10, price: 118000, surface: 42, lat: -32.9444, lng: -60.6329, reserved: [2, 6], sold: [10], tipo: "DEPARTAMENTO", step: 6300 },
                { name: "Torre B", prefix: "B", count: 10, price: 134000, surface: 48, lat: -32.9449, lng: -60.6322, reserved: [3, 8], sold: [9], tipo: "DEPARTAMENTO", step: 7100 },
            ],
        },
    ];
}

async function seedGlobalBanners(adminId: string) {
    await prisma.banner.deleteMany({ where: { internalName: { startsWith: "demo-global-banner-" } } });
    await prisma.banner.createMany({
        data: HOME_BANNERS.map((b) => ({
            ...b,
            tipo: "IMAGEN",
            context: "SEVENTOOP_GLOBAL",
            posicion: "HOME_TOP",
            estado: "PUBLISHED",
            creadoPorId: adminId,
            approvedById: adminId,
            approvedAt: new Date(),
            publishedAt: new Date(),
        })),
    });
}

async function createProject(def: ProjectDef, orgId: string, users: Users) {
    await clearProject(def.slug);
    const project = await prisma.proyecto.create({
        data: {
            nombre: def.nombre,
            slug: def.slug,
            descripcion: def.descripcion,
            ubicacion: def.ubicacion,
            estado: def.estado,
            tipo: def.tipo,
            imagenPortada: def.portada,
            galeria: JSON.stringify(def.images),
            documentos: JSON.stringify(["Brochure demo", "Ficha tecnica"]),
            masterplanSVG: def.slug === "aurora-lagoon-golf" ? masterplanSvg(def.nombre) : null,
            mapCenterLat: def.lat,
            mapCenterLng: def.lng,
            mapZoom: 15,
            invertible: !!def.invertible,
            precioM2Mercado: def.pMercado ?? null,
            precioM2Inversor: def.pInversor ?? null,
            metaM2Objetivo: def.metaM2 ?? null,
            m2VendidosInversores: def.vendidosM2 ?? 0,
            fechaLimiteFondeo: def.fondeoHasta ?? null,
            documentacionEstado: "APROBADO",
            creadoPorId: users.developer.id,
            orgId,
            visibilityStatus: "PUBLICADO",
            estadoValidacion: "APROBADO",
            puedePublicarse: true,
            puedeReservarse: true,
            puedeCaptarLeads: true,
            requireKyc: false,
        },
    });
    await prisma.projectFeatureFlags.create({ data: { projectId: project.id, infoGeneral: true, archivos: true, documentos: true, pagos: !!def.invertible, masterplan: true, motorPlanos: def.slug === "aurora-lagoon-golf", tour360: false, etapas: true, inventario: true, metricas: true } });
    await prisma.proyectoUsuario.createMany({
        data: [
            { proyectoId: project.id, userId: users.developer.id, orgId, tipoRelacion: "OWNER", estadoRelacion: "ACTIVA", permisoEditarProyecto: true, permisoSubirDocumentacion: true, permisoVerLeadsGlobales: true, permisoVerMetricasGlobales: true, asignadoPorId: users.admin.id, aprobadoPorAdminId: users.admin.id, confirmadoPorEmpresa: true, fechaConfirmacion: new Date(), notas: "Owner demo" },
            { proyectoId: project.id, userId: users.vendor.id, orgId, tipoRelacion: "VENDEDOR_ASIGNADO", estadoRelacion: "ACTIVA", permisoEditarProyecto: false, permisoSubirDocumentacion: false, permisoVerLeadsGlobales: true, permisoVerMetricasGlobales: false, asignadoPorId: users.developer.id, aprobadoPorAdminId: users.admin.id, confirmadoPorEmpresa: true, fechaConfirmacion: new Date(), notas: "Vendedor demo" },
        ],
    });
    await prisma.proyectoImagen.createMany({ data: [{ proyectoId: project.id, url: def.portada, categoria: "portada", esPrincipal: true, orden: 0 }, ...def.images.map((url, i) => ({ proyectoId: project.id, url, categoria: "galeria", esPrincipal: false, orden: i + 1 }))] });
    await prisma.documentacion.createMany({ data: [{ tipo: "Brochure demo", archivoUrl: DOC_URLS[0], estado: "APROBADO", usuarioId: users.developer.id, proyectoId: project.id }, { tipo: "Ficha tecnica", archivoUrl: DOC_URLS[1], estado: "APROBADO", usuarioId: users.developer.id, proyectoId: project.id }] });
    await prisma.proyecto_archivos.createMany({ data: [{ id: `${def.slug}-file-1`, proyectoId: project.id, tipo: "PDF", nombre: "Brochure demo", url: DOC_URLS[0], visiblePublicamente: true }, { id: `${def.slug}-file-2`, proyectoId: project.id, tipo: "PDF", nombre: "Ficha tecnica", url: DOC_URLS[1], visiblePublicamente: true }] });
    await prisma.infraestructura.createMany({
        data: [
            { proyectoId: project.id, nombre: "Acceso principal", categoria: "vial", tipo: "ingreso", geometriaTipo: "LINESTRING", coordenadas: JSON.stringify([{ lat: def.lat + 0.001, lng: def.lng - 0.001 }, { lat: def.lat, lng: def.lng }]), estado: "en obra", descripcion: "Infraestructura demo de acceso", porcentajeAvance: 68, longitudM: 420, orden: 1, visible: true },
            { proyectoId: project.id, nombre: "Espacio central", categoria: "amenity", tipo: "plaza", geometriaTipo: "POLYGON", coordenadas: JSON.stringify([{ lat: def.lat, lng: def.lng }, { lat: def.lat, lng: def.lng + 0.0005 }, { lat: def.lat - 0.0005, lng: def.lng + 0.0005 }, { lat: def.lat - 0.0005, lng: def.lng }]), estado: "terminaciones", descripcion: "Amenity demo visible en preview", porcentajeAvance: 79, superficie: 1200, orden: 2, visible: true },
        ],
    });
    if (def.slug === "aurora-lagoon-golf") {
        await prisma.imagenMapa.createMany({ data: [{ proyectoId: project.id, url: def.images[0], tipo: "foto", titulo: "Laguna demo", lat: def.lat, lng: def.lng, orden: 1 }, { proyectoId: project.id, url: def.images[1], tipo: "foto", titulo: "Clubhouse demo", lat: def.lat - 0.0005, lng: def.lng + 0.0004, orden: 2 }] });
    }
    await prisma.testimonio.createMany({ data: [{ autorNombre: "Usuario Demo", autorTipo: def.invertible ? "Inversor" : "Comprador", texto: `Proyecto demo ${def.nombre} con narrativa comercial clara y visual util.`, rating: 5, proyectoId: project.id, estado: "APROBADO", destacado: true }] });
    if (def.invertible) {
        await prisma.escrowMilestone.createMany({ data: [{ proyectoId: project.id, titulo: "Soft cap", descripcion: "Meta inicial", porcentaje: 20, estado: "COMPLETADO", fechaLogro: new Date("2026-03-20T12:00:00.000Z") }, { proyectoId: project.id, titulo: "Inicio de obra", descripcion: "Primer desembolso", porcentaje: 55, estado: "PENDIENTE" }] });
    }
    const unitIds: Array<{ id: string; numero: string; estado: string }> = [];
    for (let bi = 0; bi < def.blocks.length; bi += 1) {
        const block = def.blocks[bi];
        const etapa = await prisma.etapa.create({ data: { proyectoId: project.id, nombre: `Etapa ${bi + 1}`, orden: bi + 1, estado: bi === 0 ? "EN_CURSO" : "PLANIFICADA" } });
        const manzana = await prisma.manzana.create({ data: { etapaId: etapa.id, nombre: block.name, coordenadas: JSON.stringify({ prefix: block.prefix }) } });
        for (let i = 1; i <= block.count; i += 1) {
            const estado = block.sold.includes(i) ? "VENDIDA" : block.reserved.includes(i) ? "RESERVADA" : "DISPONIBLE";
            const lat = block.lat - Math.floor((i - 1) / 6) * 0.00018;
            const lng = block.lng + ((i - 1) % 6) * 0.00014;
            const unit = await prisma.unidad.create({
                data: {
                    manzanaId: manzana.id,
                    numero: `${block.prefix}-${String(i).padStart(2, "0")}`,
                    tipo: block.tipo ?? "LOTE",
                    superficie: Number((block.surface + i * 2.5).toFixed(2)),
                    frente: block.tipo === "DEPARTAMENTO" ? 8 : 14,
                    fondo: block.tipo === "DEPARTAMENTO" ? 9 : 32,
                    esEsquina: i === 1 || i === block.count,
                    orientacion: "NORTE",
                    precio: block.price + (i - 1) * (block.step ?? 1700),
                    moneda: "USD",
                    estado,
                    centerLat: lat - 0.00004,
                    centerLng: lng + 0.00006,
                    coordenadasMasterplan: JSON.stringify(polygon(lat, lng)),
                    polygon: polygon(lat, lng),
                    responsableId: users.vendor.id,
                    financiacion: def.invertible ? "Anticipo 30% + 18 cuotas demo" : "Entrega 35% + saldo en cuotas demo",
                },
                select: { id: true, numero: true, estado: true },
            });
            unitIds.push(unit);
        }
    }
    const [u1, u2, u3] = unitIds;
    const stages = await prisma.pipelineEtapa.findMany({ where: { orgId }, select: { id: true, nombre: true } });
    const stageId = (name: string) => stages.find((s) => s.nombre === name)?.id ?? null;
    const leads = await Promise.all([
        prisma.lead.create({ data: { nombre: `Lucia ${def.nombre}`, email: `${def.slug}.lucia@demo.local`, telefono: "+5491100001001", origen: "WEB", proyectoId: project.id, unidadInteres: u1?.numero ?? null, estado: "NUEVO", asignadoAId: users.vendor.id, fuente: "Landing publica", mensaje: "Consulta demo por brochure y disponibilidad.", presupuesto: def.invertible ? 145000 : 78000, perfilInversor: def.invertible ? "MODERADO" : "CONSERVADOR", canalOrigen: "WEB", orgId, score: 82, etapaId: stageId("Contactado") } }),
        prisma.lead.create({ data: { nombre: `Martin ${def.nombre}`, email: `${def.slug}.martin@demo.local`, telefono: "+5491100001002", origen: "META_ADS", proyectoId: project.id, unidadInteres: u2?.numero ?? null, estado: "CONTACTADO", asignadoAId: users.vendor.id, fuente: "Meta Ads", mensaje: "Pidio visita y propuesta demo.", presupuesto: def.invertible ? 160000 : 92000, perfilInversor: "AGRESIVO", canalOrigen: "META", orgId, score: 91, etapaId: stageId("Negociacion") } }),
        prisma.lead.create({ data: { nombre: `Paula ${def.nombre}`, email: `${def.slug}.paula@demo.local`, telefono: "+5491100001003", origen: "REFERIDO", proyectoId: project.id, unidadInteres: u3?.numero ?? null, estado: "CALIFICADO", asignadoAId: users.vendor.id, fuente: "Referido", mensaje: "Lista para avanzar con senia demo.", presupuesto: def.invertible ? 172000 : 99000, perfilInversor: "MODERADO", canalOrigen: "BROKER", orgId, score: 88, etapaId: stageId("Reserva") } }),
    ]);
    await prisma.leadMessage.createMany({ data: leads.map((lead, i) => ({ leadId: lead.id, userId: users.vendor.id, role: i === 0 ? "assistant" : "seller", content: i === 0 ? "Ya enviamos brochure y stock demo." : "Seguimiento comercial activo en preview." })) });
    if (u1) await prisma.oportunidad.create({ data: { leadId: leads[0].id, proyectoId: project.id, unidadId: u1.id, etapa: "VISITA", probabilidad: 45, valorEstimado: Number(def.pMercado ?? 65000), presupuesto: Number(def.pMercado ?? 65000), fechaCierreEstimada: new Date("2026-05-12T12:00:00.000Z"), proximaAccion: "Agendar visita demo", fechaProximaAccion: new Date("2026-04-22T12:00:00.000Z") } });
    if (u2) await prisma.oportunidad.create({ data: { leadId: leads[1].id, proyectoId: project.id, unidadId: u2.id, etapa: "NEGOCIACION", probabilidad: 68, valorEstimado: Number((def.pMercado ?? 65000) * 1.12), presupuesto: Number((def.pMercado ?? 65000) * 1.1), fechaCierreEstimada: new Date("2026-05-28T12:00:00.000Z"), proximaAccion: "Enviar propuesta demo", fechaProximaAccion: new Date("2026-04-24T12:00:00.000Z") } });
    const reserved = unitIds.find((u) => u.estado === "RESERVADA");
    const sold = unitIds.find((u) => u.estado === "VENDIDA");
    if (reserved) {
        await prisma.reserva.create({ data: { unidadId: reserved.id, leadId: leads[2].id, vendedorId: users.vendor.id, fechaInicio: new Date("2026-04-15T12:00:00.000Z"), fechaVencimiento: new Date("2026-04-27T12:00:00.000Z"), montoSena: 3500, estadoPago: "PENDIENTE", estado: "ACTIVA", compradorId: users.client.id, compradorEmail: "cliente.demo@seventoop.local", compradorNombre: "Cliente Demo", notas: "Reserva demo activa", idempotencyKey: `${def.slug}-reserva-activa` } });
        await prisma.historialUnidad.create({ data: { unidadId: reserved.id, usuarioId: users.vendor.id, estadoAnterior: "DISPONIBLE", estadoNuevo: "RESERVADA", motivo: "Reserva demo seed" } });
    }
    if (sold) {
        await prisma.reserva.create({ data: { unidadId: sold.id, leadId: leads[1].id, vendedorId: users.vendor.id, fechaInicio: new Date("2026-03-20T12:00:00.000Z"), fechaVencimiento: new Date("2026-03-28T12:00:00.000Z"), montoSena: 4800, estadoPago: "PAGADO", estado: "VENDIDA", compradorId: users.client.id, compradorEmail: "cliente.demo@seventoop.local", compradorNombre: "Cliente Demo", notas: "Venta demo confirmada", idempotencyKey: `${def.slug}-reserva-vendida` } });
        await prisma.historialUnidad.create({ data: { unidadId: sold.id, usuarioId: users.admin.id, estadoAnterior: "RESERVADA", estadoNuevo: "VENDIDA", motivo: "Venta demo seed" } });
    }
    if (def.invertible) {
        await prisma.inversion.create({ data: { proyectoId: project.id, inversorId: users.investor.id, m2Comprados: 120, montoTotal: 120 * Number(def.pInversor ?? 100), precioM2Aplicado: Number(def.pInversor ?? 100), estado: "ESCROW", hashTransaccion: `demo-${def.slug}-tx` } });
        await prisma.pago.create({ data: { monto: 9500, moneda: "USD", concepto: `Cupo inversor ${def.nombre}`, estado: "PAGADO", fechaPago: new Date("2026-04-10T12:00:00.000Z"), usuarioId: users.investor.id, proyectoId: project.id, tipo: "INVESTMENT_DEPOSIT", idempotencyKey: `${def.slug}-investment-payment` } });
    }
    await prisma.favoritoProyecto.createMany({ data: [{ userId: users.investor.id, proyectoId: project.id }, { userId: users.client.id, proyectoId: project.id }], skipDuplicates: true });
    await prisma.banner.create({ data: { titulo: `${def.nombre} Hero`, internalName: `demo-project-banner-${def.slug}`, headline: def.hero.title, subheadline: def.hero.subtitle, tagline: def.hero.tag, ctaText: "Ver proyecto", ctaUrl: `/proyectos/${def.slug}`, tipo: "IMAGEN", mediaUrl: def.portada, context: "PROJECT_LANDING", projectId: project.id, posicion: "HOME_TOP", prioridad: 90, estado: "PUBLISHED", creadoPorId: users.admin.id, approvedById: users.admin.id, approvedAt: new Date(), publishedAt: new Date() } });
    return { nombre: def.nombre, slug: def.slug, unidades: unitIds.length, leads: leads.length };
}

async function main() {
    console.log("Seeding demo projects for Railway preview...");
    const { orgId, users } = await ensureUsers();
    await seedGlobalBanners(users.admin.id);
    const results = [];
    for (const def of defs()) results.push(await createProject(def, orgId, users));
    console.table(results);
    console.log("Demo seed complete.");
}

main().catch((error) => {
    console.error("Demo project seed failed:", error);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
