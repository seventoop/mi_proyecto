import { requireAuth, requireOrgAccess } from "@/lib/guards";
import { getCrmMetrics } from "@/lib/actions/crm-actions";
import CrmMetricsClient from "@/components/dashboard/crm/crm-metrics-client";
import { redirect } from "next/navigation";

export default async function MetricasPage() {
    const user = await requireAuth();
    const orgId = user.orgId;

    if (!orgId) {
        redirect("/dashboard/developer");
    }

    await requireOrgAccess(orgId);

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
