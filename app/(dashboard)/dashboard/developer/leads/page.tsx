import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LeadsView from "@/components/dashboard/leads/leads-view";
import { getOrgPlanWithUsage } from "@/lib/actions/plan-actions";
import { getPipelineEtapas } from "@/lib/actions/crm-actions";

export default async function LeadsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const userId = session.user.id;
    const userRole = session.user.role;
    const orgId = (session.user as any).orgId;

    // Fetch Leads - filtered for organization if present
    const where: any = userRole === "ADMIN" ? {} : {
        OR: [
            { asignadoAId: userId },
            { proyecto: { creadoPorId: userId } }
        ]
    };

    if (orgId) {
        where.orgId = orgId;
    }

    const [leads, planRes, etapasRes] = await Promise.all([
        prisma.lead.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                proyecto: { select: { id: true, nombre: true } },
                asignadoA: { select: { nombre: true, avatar: true } }
            }
        }),
        getOrgPlanWithUsage(orgId),
        getPipelineEtapas(orgId)
    ]);

    // Fetch Projects for Filter/Create - filtered for developers
    const projectsWhere = userRole === "ADMIN" ? {} : { creadoPorId: userId };
    const projects = await prisma.proyecto.findMany({
        where: projectsWhere,
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" }
    });

    const planFeatures = planRes.success && planRes.data ? planRes.data.features : [];
    const usage = planRes.success && planRes.data
        ? { current: planRes.data.usage.leads.current, limit: Number(planRes.data.usage.leads.limit) }
        : undefined;
    const etapas = etapasRes.success ? etapasRes.data : [];

    return (
        <div className="h-[calc(100vh-100px)] p-6 animate-fade-in">
            <LeadsView
                leads={leads}
                projects={projects}
                planFeatures={planFeatures}
                usage={usage}
                etapas={etapas}
            />
        </div>
    );
}
