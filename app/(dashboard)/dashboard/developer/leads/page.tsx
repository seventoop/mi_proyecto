import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LeadsView from "@/components/dashboard/leads/leads-view";

export default async function LeadsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const userId = session.user.id;
    const userRole = session.user.role;

    // Fetch Leads
    const where = userRole === "ADMIN" ? {} : {
        OR: [
            { asignadoAId: userId },
            { proyecto: { creadoPorId: userId } }
        ]
    };

    const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            proyecto: { select: { id: true, nombre: true } },
            asignadoA: { select: { nombre: true, avatar: true } }
        }
    });

    // Fetch Projects for Filter/Create - filtered for developers
    const projectsWhere = userRole === "ADMIN" ? {} : { creadoPorId: userId };
    const projects = await prisma.proyecto.findMany({
        where: projectsWhere,
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" }
    });

    return (
        <div className="h-[calc(100vh-100px)] p-6 animate-fade-in">
            <LeadsView leads={leads} projects={projects} />
        </div>
    );
}
