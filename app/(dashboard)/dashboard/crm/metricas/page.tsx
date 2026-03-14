import { resolveAdminOrgContext } from "@/lib/auth/guards";
import { getCrmMetrics } from "@/lib/actions/crm-actions";
import CrmMetricsClient from "@/components/dashboard/crm/crm-metrics-client";
import AdminOrgSelector from "@/components/dashboard/admin/admin-org-selector";
import { redirect } from "next/navigation";

export default async function MetricasPage({ 
    searchParams 
}: { 
    searchParams: { orgId?: string } 
}) {
    const context = await resolveAdminOrgContext(searchParams.orgId);
    const { orgId, user, needsSelection, error } = context;

    if (needsSelection) {
        return (
            <AdminOrgSelector 
                title="BI Métricas" 
                description="Selecciona una organización para visualizar sus analíticas de CRM."
                error={error}
            />
        );
    }

    if (!orgId) {
        redirect("/dashboard/developer");
    }

    const res = await getCrmMetrics(orgId);

    if (!res.success || !res.data) {
        return (
            <div className="p-6 text-center py-20">
                <h1 className="text-2xl font-bold text-white">Error al cargar métricas</h1>
                <p className="text-slate-400 mt-2">{("error" in res) ? res.error : "Ocurrió un error inesperado"}</p>
            </div>
        );
    }

    return <CrmMetricsClient metrics={res.data} />;
}
