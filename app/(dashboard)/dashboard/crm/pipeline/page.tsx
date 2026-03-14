import { resolveAdminOrgContext } from "@/lib/auth/guards";
import { getPipelineEtapas } from "@/lib/actions/crm-actions";
import PipelineConfigClient from "@/components/dashboard/crm/pipeline-config-client";
import AdminOrgSelector from "@/components/dashboard/admin/admin-org-selector";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";

export default async function PipelinePage({ 
    searchParams 
}: { 
    searchParams: { orgId?: string } 
}) {
    const context = await resolveAdminOrgContext(searchParams.orgId);
    const { orgId, user, needsSelection, error } = context;

    if (needsSelection) {
        return (
            <AdminOrgSelector 
                title="Pipeline CRM" 
                description="Selecciona una organización para gestionar sus etapas y flujo de leads."
                error={error}
            />
        );
    }

    if (!orgId) {
        redirect("/dashboard/developer");
    }

    // Obtener etapas actuales
    const res = await getPipelineEtapas(orgId);
    let etapas = res.success ? res.data : [];

    // Si no tiene etapas, crear las default de una vez
    if (etapas.length === 0) {
        const defaultEtapas = [
            { nombre: "Nuevo", color: "#6366f1", orden: 1, esDefault: true },
            { nombre: "Contactado", color: "#f59e0b", orden: 2, esDefault: false },
            { nombre: "Calificado", color: "#8b5cf6", orden: 3, esDefault: false },
            { nombre: "En negociación", color: "#ec4899", orden: 4, esDefault: false },
            { nombre: "Convertido", color: "#10b981", orden: 5, esDefault: false },
            { nombre: "Perdido", color: "#64748b", orden: 6, esDefault: false },
        ];

        await prisma.pipelineEtapa.createMany({
            data: defaultEtapas.map(e => ({ ...e, orgId }))
        });

        const refreshed = await getPipelineEtapas(orgId);
        etapas = refreshed.success ? refreshed.data : [];
    }

    return (
        <div className="p-6">
            <PipelineConfigClient orgId={orgId} initialEtapas={etapas} />
        </div>
    );
}
