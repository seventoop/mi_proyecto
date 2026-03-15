import prisma from "@/lib/db";
import ProjectsListClient from "@/components/dashboard/proyectos/projects-list-client";
import AdminProjectsMatrix from "@/components/dashboard/admin/admin-projects-matrix";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminProyectosPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
        redirect("/dashboard");
    }

    const proyectos = await prisma.proyecto.findMany({
        where: { deletedAt: null },
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
            organization: {
                select: { id: true, nombre: true, planId: true, planRef: true }
            },
            featureFlags: true,
            _count: {
                select: { leads: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    // Calculate unit stats per project
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
        <div className="space-y-10">
            {/* Card view — primary */}
            <ProjectsListClient
                projects={processedProyectos as any}
                newProjectPath="/dashboard/admin/proyectos/new"
                projectBasePath="/dashboard/proyectos"
            />

            {/* Admin feature flags matrix — secondary */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-black tracking-tighter uppercase italic">
                        Matriz de <span className="text-brand-500">Features</span>
                    </h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-0.5">
                        Control global de acceso por proyecto
                    </p>
                </div>
                <AdminProjectsMatrix projects={proyectos as any} />
            </div>
        </div>
    );
}
