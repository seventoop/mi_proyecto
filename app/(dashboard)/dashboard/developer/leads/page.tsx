import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LeadsView from "@/components/dashboard/leads/leads-view";
import EmptyOrgState from "@/components/dashboard/empty-org-state";
import { getOrgPlanWithUsage } from "@/lib/actions/plan-actions";
import { getPipelineEtapas } from "@/lib/actions/crm-actions";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function LeadsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const userId = session.user.id;
    const userRole = session.user.role;
    const orgId = session.user.orgId;

    if (!orgId) {
        return <EmptyOrgState moduleName="Leads" />;
    }

    // Build leads visibility filter.
    // Non-admin: own assigned leads always visible; projects with global leads access → all leads.
    // Legacy (creadoPorId, no ProyectoUsuario row) → treated as full-access OWNER.
    const where: { orgId?: string; OR?: any[] } = {};
    if (orgId) where.orgId = orgId;

    if (userRole !== "ADMIN") {
        // Both queries depend only on userId — run in parallel
        const [relaciones, legacyProjects] = await Promise.all([
            prisma.proyectoUsuario.findMany({
                where: { userId, estadoRelacion: "ACTIVA" },
                select: { proyectoId: true, permisoVerLeadsGlobales: true },
            }),
            prisma.proyecto.findMany({
                where: {
                    creadoPorId: userId,
                    deletedAt: null,
                    NOT: { usuariosRelaciones: { some: { userId } } },
                },
                select: { id: true },
            }),
        ]);
        const globalLeadIds = relaciones
            .filter(r => r.permisoVerLeadsGlobales)
            .map(r => r.proyectoId);

        const legacyIds = legacyProjects.map(p => p.id);

        const allGlobalLeadIds = [...globalLeadIds, ...legacyIds].filter((id, i, arr) => arr.indexOf(id) === i);

        const orClauses: any[] = [{ asignadoAId: userId }];
        if (allGlobalLeadIds.length > 0) {
            orClauses.push({ proyectoId: { in: allGlobalLeadIds } });
        }
        where.OR = orClauses;
    }

    // projectsWhere depends only on session data — compute before the parallel fetch
    const projectsWhere = userRole === "ADMIN" ? {} : {
        OR: [
            { creadoPorId: userId },
            { usuariosRelaciones: { some: { userId, estadoRelacion: "ACTIVA" as const } } },
        ],
    };

    const LEADS_LIMIT = 100;
    // projects is independent of `where` — include in the same round
    const [leads, totalLeadsCount, planRes, etapasRes, projects] = await Promise.all([
        prisma.lead.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: LEADS_LIMIT,
            include: {
                proyecto: { select: { id: true, nombre: true } },
                asignadoA: { select: { nombre: true, avatar: true } }
            }
        }),
        prisma.lead.count({ where }),
        getOrgPlanWithUsage(orgId),
        getPipelineEtapas(orgId),
        prisma.proyecto.findMany({
            where: projectsWhere,
            select: { id: true, nombre: true },
            orderBy: { nombre: "asc" }
        }),
    ]);
    const hasMoreLeads = totalLeadsCount > LEADS_LIMIT;

    const planFeatures = planRes.success && planRes.data ? planRes.data.features : [];
    const usage = planRes.success && planRes.data
        ? { current: planRes.data.usage.leads.current, limit: Number(planRes.data.usage.leads.limit) }
        : undefined;
    const etapas = etapasRes.success ? etapasRes.data : [];

    return (
        <div className="h-[calc(100vh-100px)] p-6 animate-fade-in flex flex-col">
            <ModuleHelp content={MODULE_HELP_CONTENT.leads} />

            {hasMoreLeads && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                    Mostrando los {LEADS_LIMIT} leads más recientes de {totalLeadsCount} total. Usa los filtros para encontrar leads específicos.
                </div>
            )}
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
