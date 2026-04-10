import prisma from "@/lib/db";
import ProjectsListClient from "@/components/dashboard/proyectos/projects-list-client";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
        redirect("/dashboard");
    }

    // ADMIN/SUPERADMIN see all projects across all orgs — correct by design
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
        <div className="p-6 space-y-6 animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.adminProyectos} />
            <ProjectsListClient projects={processedProyectos} />
        </div>
    );
}

