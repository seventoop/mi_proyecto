const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting full project population...");

    // 1. Get creator user
    const creator = await prisma.user.findUnique({
        where: { email: "dany76162@gmail.com" }
    });

    if (!creator) {
        throw new Error("Creator user not found. Please run seed first.");
    }

    // 2. Create Project
    const project = await prisma.proyecto.create({
        data: {
            nombre: "Residencial Valle Escondido",
            slug: "residencial-valle-escondido",
            descripcion: "Desarrollo de lujo en el corazón de la Patagonia. 50 hectáreas de bosque virgen con servicios subterráneos, club house y seguridad inteligente.",
            ubicacion: "San Martín de los Andes, Neuquén",
            estado: "EN_VENTA",
            tipo: "ECO_BARRIO",
            creadoPorId: creator.id,
            imagenPortada: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=2000&auto=format&fit=crop",
            invertible: true,
            precioM2Inversor: 150,
            precioM2Mercado: 280,
            metaM2Objetivo: 10000,
            m2VendidosInversores: 4500,
            fechaLimiteFondeo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            documentacionEstado: "APROBADO",
            mapCenterLat: -40.155,
            mapCenterLng: -71.35,
            mapZoom: 15,
        }
    });

    console.log(`✅ Project created: ${project.nombre} (${project.id})`);

    // 3. Create Escrow Milestones
    await prisma.escrowMilestone.createMany({
        data: [
            { proyectoId: project.id, titulo: "Movimiento de Suelos", porcentaje: 15, estado: "COMPLETADO", fechaLogro: new Date() },
            { proyectoId: project.id, titulo: "Red Eléctrica Subterránea", porcentaje: 25, estado: "PENDIENTE" },
            { proyectoId: project.id, titulo: "Portal de Acceso", porcentaje: 10, estado: "PENDIENTE" },
        ]
    });

    // 4. Create Technical Files
    await prisma.proyectoArchivo.createMany({
        data: [
            { proyectoId: project.id, tipo: "PLANO", nombre: "Plano de Mensura General.pdf", url: "https://example.com/plano.pdf", visiblePublicamente: true },
            { proyectoId: project.id, tipo: "LEGAL", nombre: "Aprobación Municipal Exp 4500.pdf", url: "https://example.com/municipal.pdf" },
            { proyectoId: project.id, tipo: "MEMORIA", nombre: "Impacto Ambiental.pdf", url: "https://example.com/impacto.pdf" },
        ]
    });

    // 5. Create Images Gallery
    await prisma.proyectoImagen.createMany({
        data: [
            { proyectoId: project.id, categoria: "RENDER", url: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format", esPrincipal: true, orden: 0 },
            { proyectoId: project.id, categoria: "EXTERIOR", url: "https://images.unsplash.com/photo-1542332213-915993de7e76?auto=format", orden: 1 },
            { proyectoId: project.id, categoria: "INTERIOR", url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format", orden: 2 },
        ]
    });

    // 6. Create Review Documentation (KYC/Legal)
    await prisma.documentacion.createMany({
        data: [
            { proyectoId: project.id, tipo: "MUNICIPAL", archivoUrl: "https://example.com/municipal_approved.pdf", estado: "APROBADO", comentarios: "Validado por catastro." },
            { proyectoId: project.id, tipo: "OTRO", archivoUrl: "https://example.com/factibilidad.pdf", estado: "EN_REVISION" },
        ]
    });

    // 7. Create Stages & Units
    const etapa1 = await prisma.etapa.create({
        data: {
            proyectoId: project.id,
            nombre: "Fase 1 - El Bosque",
            orden: 1,
            estado: "EN_CURSO",
        }
    });

    const manzanaA = await prisma.manzana.create({
        data: {
            etapaId: etapa1.id,
            nombre: "Manzana 01",
        }
    });

    await prisma.unidad.createMany({
        data: [
            { manzanaId: manzanaA.id, numero: "101", superficie: 850, precio: 95000, estado: "DISPONIBLE", tipo: "LOTE" },
            { manzanaId: manzanaA.id, numero: "102", superficie: 1200, precio: 135000, estado: "RESERVADA", tipo: "LOTE_ESQUINA" },
            { manzanaId: manzanaA.id, numero: "103", superficie: 900, precio: 98000, estado: "VENDIDA", tipo: "LOTE" },
        ]
    });

    // 8. Create 360 Tour
    const scenes = [
        {
            id: "entrada",
            title: "Entrada del Bosque",
            imageUrl: "https://pannellum.org/images/alma.jpg",
            isDefault: true,
            hotspots: [
                { id: "hs1", type: "scene", pitch: 0, yaw: 180, text: "Ir al Mirador", sceneId: "mirador" },
                { id: "info1", type: "info", pitch: 10, yaw: 45, text: "Acceso con seguridad biométrica" }
            ]
        },
        {
            id: "mirador",
            title: "Mirador del Lago",
            imageUrl: "https://pannellum.org/images/jfk.jpg",
            hotspots: [
                { id: "hs2", type: "scene", pitch: 0, yaw: 0, text: "Volver a la Entrada", sceneId: "entrada" }
            ],
            floatingLabels: [
                { id: "l1", pitch: 0, yaw: 90, text: "Vista al Lago Lácar", style: "landmark" }
            ]
        }
    ];

    await prisma.tour360.create({
        data: {
            proyectoId: project.id,
            nombre: "Recorrido Virtual Experiencia Patagonia",
            escenas: JSON.stringify(scenes),
            estado: "APROBADO"
        }
    });

    // 9. Create Payments
    await prisma.pago.createMany({
        data: [
            { usuarioId: creator.id, proyectoId: project.id, monto: 1200, concepto: "Reserva Lote 102", estado: "APROBADO" },
            { usuarioId: creator.id, proyectoId: project.id, monto: 500, concepto: "Gastos Administrativos", estado: "PENDIENTE" },
        ]
    });

    console.log("✨ Population finished successfully!");
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
