import prisma from "@/lib/db";
import ProjectsListClient from "@/components/dashboard/proyectos/projects-list-client";

export default async function ProyectosPage() {
    // Fetch real projects from DB
    const proyectos = await prisma.proyecto.findMany({
        include: {
            etapas: {
                include: {
                    manzanas: {
                        include: {
                            unidades: true
                        }
                    }
                }
            },
            _count: {
                select: { leads: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    // Process projects to get unit stats
    const processedProyectos = proyectos.map(p => {
        let total = 0;
        let disponibles = 0;
        let reservadas = 0;
        let vendidas = 0;

        p.etapas.forEach(etapa => {
            etapa.manzanas.forEach(manzana => {
                manzana.unidades.forEach(u => {
                    total++;
                    if (u.estado === "DISPONIBLE") disponibles++;
                    if (u.estado === "RESERVADA") reservadas++;
                    if (u.estado === "VENDIDA") vendidas++;
                });
            });
        });

        return {
            ...p,
            unidades: { total, disponibles, reservadas, vendidas },
            leadsCount: p._count.leads
        };
    });

    return (
        <ProjectsListClient projects={processedProyectos} />
    );
}

