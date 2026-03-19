import { resolveAdminOrgContext } from "@/lib/auth/guards";
import { getCrmMetrics } from "@/lib/actions/crm-actions";
import CrmMetricsClient from "@/components/dashboard/crm/crm-metrics-client";
import AdminOrgSelector from "@/components/dashboard/admin/admin-org-selector";
import EmptyOrgState from "@/components/dashboard/empty-org-state";
import { redirect } from "next/navigation";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function MetricasPage({ 
    searchParams 
}: { 
    searchParams: { orgId?: string } 
}) {
    const context = await resolveAdminOrgContext(searchParams.orgId);
    const { orgId, user, needsSelection, error } = context;

    if (needsSelection) {
        return (
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
                <ModuleHelp content={MODULE_HELP_CONTENT.biMetrics} />
                <AdminOrgSelector 
                    title="BI Métricas" 
                    description="Selecciona una organización para visualizar sus analíticas de CRM."
                    error={error}
                />
            </div>
        );
    }

    if (!orgId) {
        return (
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
                <ModuleHelp content={MODULE_HELP_CONTENT.biMetrics} />
                <EmptyOrgState moduleName="BI y Métricas CRM" />
            </div>
        );
    }

    const res = await getCrmMetrics(orgId);

    if (!res.success || !res.data) {
        return (
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in text-center py-20">
                <ModuleHelp content={MODULE_HELP_CONTENT.biMetrics} />
                <h2 className="text-xl font-black text-slate-300 uppercase tracking-widest mt-10">Error al cargar métricas</h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">{("error" in res) ? res.error : "Ocurrió un error inesperado"}</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.biMetrics} />
            <CrmMetricsClient metrics={res.data} />
        </div>
    );
}
