const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const project = await prisma.proyecto.findFirst({
        where: { slug: "barrio-los-alamos" }
    });

    if (!project) {
        console.error("Project not found");
        return;
    }

    const escenas = [
        {
            id: "escena-1",
            title: "Entrada Principal",
            imageUrl: "https://pannellum.org/images/alma.jpg",
            isDefault: true,
            hotspots: [
                {
                    id: "hs-1",
                    type: "info",
                    pitch: -15,
                    yaw: 120,
                    text: "Bienvenido al Barrio Los Álamos",
                    icon: "info"
                }
            ],
            floatingLabels: [
                {
                    id: "lbl-1",
                    pitch: 10,
                    yaw: -20,
                    text: "Lote 45 - Disponible",
                    style: "landmark",
                    anchorPitch: 0,
                    anchorYaw: -20
                }
            ]
        }
    ];

    const tour = await prisma.tour360.create({
        data: {
            proyectoId: project.id,
            nombre: "Tour de Bienvenida",
            escenas: JSON.stringify(escenas),
            estado: "APROBADO"
        }
    });

    console.log("Mock tour created successfully:", tour.id);
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
