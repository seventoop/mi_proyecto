import { Suspense } from "react";
import { LogicToopDashboardClient } from "./logictoop-client";
import { getLogicToopDashboardData } from "@/lib/actions/logictoop";
import { db } from "@/lib/db";

export default async function LogicToopAdminPage() {
    const result = await getLogicToopDashboardData();
    
    // Fetch organizations for the creation modal
    const orgs = await db.organization.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" }
    });

    return (
        <div className="space-y-8 pb-12 px-4 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                        LogicToop <span className="text-brand-500 underline decoration-4">Automation</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        Motor de reglas y automatización v1.0 • <span className="text-brand-500">v2 Orchestrator Active</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <a 
                        href="/dashboard/admin/logictoop/integrations" 
                        className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-black uppercase italic text-xs flex items-center gap-2 transition-all shadow-lg shadow-slate-500/10"
                    >
                        Integraciones
                    </a>
                    <a 
                        href="/dashboard/admin/logictoop/orchestrator" 
                        className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-black uppercase italic text-xs flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20"
                    >
                        AI Orchestrator
                    </a>
                </div>
            </div>

            <Suspense fallback={<div className="glass-card p-8 animate-pulse text-center uppercase font-black italic">Iniciando Motor...</div>}>
                <LogicToopDashboardClient 
                    initialData={result.success ? result.data : null} 
                    orgs={orgs}
                />
            </Suspense>
        </div>
    );
}
