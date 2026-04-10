import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true });
loadEnv();
process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";

const prisma = require("../lib/db").default as typeof import("../lib/db").default;

async function main() {
    const projects = await prisma.proyecto.findMany({
        where: {
            nombre: { contains: "Cañuelas" },
        },
        select: {
            id: true,
            nombre: true,
            slug: true,
            masterplanSVG: true,
            overlayBounds: true,
            visibilityStatus: true,
            tours: { select: { id: true } },
            pagos: { select: { id: true } },
            documentacion: { select: { id: true } },
            leads: { select: { id: true } },
            etapas: {
                select: {
                    id: true,
                    manzanas: {
                        select: {
                            id: true,
                            unidades: { select: { id: true } },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const summary = projects.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        slug: p.slug,
        hasMasterplan: !!p.masterplanSVG,
        hasOverlay: !!p.overlayBounds,
        tours: p.tours.length,
        pagos: p.pagos.length,
        documentacion: p.documentacion.length,
        leads: p.leads.length,
        unidades: p.etapas.flatMap((e) => e.manzanas.flatMap((m) => m.unidades)).length,
        visibilityStatus: p.visibilityStatus,
    }));

    console.log(JSON.stringify(summary, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
