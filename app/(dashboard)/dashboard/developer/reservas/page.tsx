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
export default async function ReservasPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const orgId = session?.user?.orgId;

    if (!orgId) {
        return (
            <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
                <ModuleHelp content={MODULE_HELP_CONTENT.reservas} />
                <EmptyOrgState moduleName="Reservas" />
            </div>
        );
    }

    // Parallel data fetching
    const [reservasRes, leadsRes, unidadesRes] = await Promise.all([
        getReservas(),
        getLeads(),
        getAllUnidades({ estado: "DISPONIBLE" })
    ]);

    const reservas = reservasRes.success && "reservas" in reservasRes.data ? reservasRes.data.reservas : [];
    const leads = leadsRes.success && "leads" in leadsRes.data ? leadsRes.data.leads : [];
    const unidades = unidadesRes.success ? unidadesRes.data : [];

    return (
        <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
            <ModuleHelp content={MODULE_HELP_CONTENT.reservas} />
            <ReservasView
                reservas={reservas as any[]}
                leads={leads as any[]}
                unidades={unidades as any[]}
            />
        </div>
    );
}
