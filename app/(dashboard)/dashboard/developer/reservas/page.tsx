import { getReservas } from "@/lib/actions/reservas";
import ReservasView from "@/components/dashboard/reservas/reservas-view";
import { getLeads } from "@/lib/actions/leads";
import { getAllUnidades } from "@/lib/actions/unidades";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
import EmptyOrgState from "@/components/dashboard/empty-org-state";
import prisma from "@/lib/db";

export default async function ReservasPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const orgId = session?.user?.orgId;

    if (!orgId) {
        return (
            <div className="p-6 space-y-6 animate-fade-in">
                <ModuleHelp content={MODULE_HELP_CONTENT.reservas} />
                <EmptyOrgState moduleName="Reservas" />
            </div>
        );
    }

    // Resolve scoped proyectoIds for the unidades query.
    // Same pattern as inventario/page.tsx — relation-based access + legacy creadoPorId fallback.
    // Prevents getAllUnidades from returning available units from other orgs.
    const userId = session.user.id;
    const userRole = (session.user as any).role;

    let proyectoIds: string[] | undefined;
    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
        const [relaciones, legacyProjects] = await Promise.all([
            prisma.proyectoUsuario.findMany({
                where: { userId, estadoRelacion: "ACTIVA" },
                select: { proyectoId: true },
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
        const relationIds = relaciones.map(r => r.proyectoId);
        const legacyIds = legacyProjects.map(p => p.id);
        proyectoIds = [...relationIds, ...legacyIds].filter((id, i, arr) => arr.indexOf(id) === i);
    }

    // Parallel data fetching — unidades now scoped to user's proyectoIds
    const [reservasRes, leadsRes, unidadesRes] = await Promise.all([
        getReservas(),
        getLeads(),
        getAllUnidades({ estado: "DISPONIBLE", proyectoIds }),
    ]);

    const reservas = reservasRes.success && "reservas" in reservasRes.data ? reservasRes.data.reservas : [];
    const leads = leadsRes.success && "leads" in leadsRes.data ? leadsRes.data.leads : [];
    const unidades = unidadesRes.success ? unidadesRes.data : [];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.reservas} />
            <ReservasView
                reservas={reservas as any[]}
                leads={leads as any[]}
                unidades={unidades as any[]}
            />
        </div>
    );
}
