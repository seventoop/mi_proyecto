"use client";

import { useState } from "react";
import LeadsKanban from "./leads-kanban";
import LeadsTable from "./leads-table";
import LeadDialog from "./lead-dialog";
import { LeadsImportDialog } from "./leads-import-dialog";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeatureGate from "@/components/saas/FeatureGate";

interface Lead {
    id: string;
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    estado?: string;
    createdAt: string | Date;
    proyecto?: {
        nombre: string;
    } | null;
}

interface Project {
    id: string;
    nombre: string;
}

export default function LeadsView({
    leads,
    projects,
    planFeatures = [],
    usage,
    etapas = []
}: {
    leads: Lead[],
    projects: Project[],
    planFeatures?: string[],
    usage?: { current: number; limit: number },
    etapas?: any[]
}) {
    const [viewMode, setViewMode] = useState<"BOARD" | "LIST">("BOARD");

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Gestión de Leads</h1>
                    <p className="text-slate-400 mt-1">Administra tu pipeline de ventas y contactos</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`px-3 py-1.5 h-8 ${viewMode === "BOARD" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
                            onClick={() => setViewMode("BOARD")}
                        >
                            <LayoutGrid className="w-4 h-4 mr-2" /> Tablero
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`px-3 py-1.5 h-8 ${viewMode === "LIST" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
                            onClick={() => setViewMode("LIST")}
                        >
                            <List className="w-4 h-4 mr-2" /> Lista
                        </Button>
                    </div>
                    <FeatureGate
                        feature="importacion_leads"
                        features={planFeatures}
                        showUpgradeCard={false}
                    >
                        <LeadsImportDialog />
                    </FeatureGate>

                    <FeatureGate
                        feature="leads"
                        max={usage?.limit}
                        current={usage?.current}
                        showUpgradeCard={false}
                    >
                        <LeadDialog projects={projects} />
                    </FeatureGate>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {viewMode === "BOARD" ? (
                    <LeadsKanban leads={leads} planFeatures={planFeatures} etapas={etapas} />
                ) : (
                    <LeadsTable leads={leads} planFeatures={planFeatures} etapas={etapas} />
                )}
            </div>
        </div>
    );
}
