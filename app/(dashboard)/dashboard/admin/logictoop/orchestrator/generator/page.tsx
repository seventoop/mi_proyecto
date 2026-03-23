import { Suspense } from "react";
import { db } from "@/lib/db";
import { getOrchestratorData } from "@/lib/actions/orchestrator";
import { OrchestratorClient } from "../orchestrator-client";

export default async function GeneratorPage({
    searchParams
}: {
    searchParams: Promise<{ orgId?: string }>
}) {
    const resolvedSearchParams = await searchParams;
    const orgId = resolvedSearchParams.orgId;

    const orgs = await db.organization.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" }
    });

    const activeOrgId = orgId || (orgs.length > 0 ? orgs[0].id : null);
    
    let orchestratorData = null;
    if (activeOrgId) {
        const result = await getOrchestratorData(activeOrgId);
        if (result.success) {
            orchestratorData = result.data;
        }
    }

    return (
        <div className="space-y-8 pb-12 px-4 md:px-0">
            <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                    <span className="text-brand-500">AI</span> Generator
                </h1>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                    LogicToop v2 • Autonomous Blueprinting
                </p>
            </div>

            <Suspense fallback={<div className="glass-card p-8 animate-pulse text-center uppercase font-black italic">Sincronizando Cerebro AI...</div>}>
                <OrchestratorClient 
                    initialData={orchestratorData} 
                    orgs={orgs}
                    activeOrgId={activeOrgId}
                    initialTab="generator"
                />
            </Suspense>
        </div>
    );
}
