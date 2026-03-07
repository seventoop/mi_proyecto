import prisma from "@/lib/db";
import AdminProjectsMatrix from "@/components/dashboard/admin/admin-projects-matrix";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function AdminProyectosPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
        redirect("/dashboard");
    }

    const proyectos = await prisma.proyecto.findMany({
        include: {
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                        Matriz de <span className="text-brand-500">Herramientas</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                        Control global de Features por Proyecto
                    </p>
                </div>
                <div>
                    <Link href="/dashboard/admin/proyectos/new"
                        className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>Crear Proyecto</span>
                    </Link>
                </div>
            </div>

            <AdminProjectsMatrix projects={proyectos as any} />
        </div>
    );
}
