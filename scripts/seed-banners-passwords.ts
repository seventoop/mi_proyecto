import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ADMIN_ID = "cmmtx7u090000lkgtphz87y5r";

// Personalized passwords
const USERS_PASSWORDS = [
    { email: "hector.ruiz@demo.seventoop.com",     password: "Hector#Alamos24",    label: "Héctor Ruiz       (DESARROLLADOR)" },
    { email: "maria.garcia@demo.seventoop.com",    password: "Maria#Garcia2024",   label: "María García      (VENDEDOR)" },
    { email: "carlos.lopez@demo.seventoop.com",    password: "Carlos#SanMartin7",  label: "Carlos López      (DESARROLLADOR)" },
    { email: "luisa.fernandez@demo.seventoop.com", password: "Luisa#Fern2024!",   label: "Luisa Fernández   (VENDEDOR)" },
];

// Banners para los 4 proyectos demo — imágenes Unsplash de loteos argentinos
const BANNERS = [
    {
        projectSlug: "barrio-las-casuarinas",
        titulo: "Barrio Las Casuarinas",
        headline: "Tu lote en Córdoba te espera",
        subheadline: "Barrio Las Casuarinas — Corralejo, Córdoba",
        tagline: "Desde USD 75.000 · Escrituración inmediata",
        ctaText: "Ver lotes disponibles",
        ctaUrl: "/proyectos/barrio-las-casuarinas",
        mediaUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=2070&auto=format&fit=crop",
        prioridad: 90,
    },
    {
        projectSlug: "loteo-san-martin-mendoza",
        titulo: "Loteo San Martín",
        headline: "Invertí en Mendoza",
        subheadline: "Loteo San Martín — Maipú, Mendoza",
        tagline: "Lotes residenciales desde USD 55.000",
        ctaText: "Conocer el proyecto",
        ctaUrl: "/proyectos/loteo-san-martin-mendoza",
        mediaUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop",
        prioridad: 85,
    },
    {
        projectSlug: "chacras-del-norte-santa-fe",
        titulo: "Chacras del Norte",
        headline: "Chacras amplias en Santa Fe",
        subheadline: "Chacras del Norte — Rafaela, Santa Fe",
        tagline: "Preventa exclusiva · Chacras de 600 a 1200 m²",
        ctaText: "Reservar en preventa",
        ctaUrl: "/proyectos/chacras-del-norte-santa-fe",
        mediaUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
        prioridad: 80,
    },
    {
        projectSlug: "villa-del-lago-buenos-aires",
        titulo: "Villa del Lago",
        headline: "Vivir con vista al lago",
        subheadline: "Villa del Lago — Cañuelas, Buenos Aires",
        tagline: "Barrio cerrado premium · Desde USD 110.000",
        ctaText: "Ver disponibilidad",
        ctaUrl: "/proyectos/villa-del-lago-buenos-aires",
        mediaUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
        prioridad: 95,
    },
];

async function main() {
    // ─── 1. Update personalized passwords ─────────────────────
    console.log("🔐 Updating personalized passwords...");
    for (const u of USERS_PASSWORDS) {
        const hash = await bcrypt.hash(u.password, 10);
        await prisma.user.update({
            where: { email: u.email },
            data: { password: hash },
        });
        console.log(`  ✓ ${u.label} → ${u.password}`);
    }

    // ─── 2. Create banners for each project ───────────────────
    console.log("\n🎨 Creating banners...");
    for (const b of BANNERS) {
        const project = await prisma.proyecto.findUnique({ where: { slug: b.projectSlug } });
        if (!project) { console.log(`  ⚠ Project not found: ${b.projectSlug}`); continue; }

        // Check if banner already exists for this project
        const existing = await prisma.banner.findFirst({
            where: { titulo: b.titulo, context: "SEVENTOOP_GLOBAL" },
        });
        if (existing) { console.log(`  ↩ Banner already exists: ${b.titulo}`); continue; }

        await prisma.banner.create({
            data: {
                titulo: b.titulo,
                headline: b.headline,
                subheadline: b.subheadline,
                tagline: b.tagline,
                ctaText: b.ctaText,
                ctaUrl: b.ctaUrl,
                mediaUrl: b.mediaUrl,
                tipo: "IMAGEN",
                prioridad: b.prioridad,
                estado: "PUBLISHED",
                context: "SEVENTOOP_GLOBAL",
                creadoPorId: ADMIN_ID,
                publishedAt: new Date(),
                approvedAt: new Date(),
                approvedById: ADMIN_ID,
            },
        });
        console.log(`  ✓ Banner creado: ${b.titulo}`);
    }

    console.log("\n✅ Done!\n");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("📋 CREDENCIALES DE ACCESO — USUARIOS DEMO");
    console.log("═══════════════════════════════════════════════════════════");
    for (const u of USERS_PASSWORDS) {
        console.log(`  ${u.label}`);
        console.log(`    Email:    ${u.email}`);
        console.log(`    Password: ${u.password}`);
        console.log("");
    }
    console.log("  Admin (existente)");
    console.log("    Email:    dany76162@gmail.com");
    console.log("    Password: Catalin@0112192122$");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
