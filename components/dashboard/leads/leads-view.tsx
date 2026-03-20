"use client";

import { useState } from "react";
import LeadsKanban from "./leads-kanban";
import LeadsTable from "./leads-table";
import LeadDialog from "./lead-dialog";
import { LeadsImportDialog } from "./leads-import-dialog";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeatureGate from "@/components/saas/FeatureGate";
import { cn } from "@/lib/utils";

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
        <div className="space-y-6 h-full flex flex-col pb-8">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 w-full">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/[0.06] flex items-center">
                        <button
                            onClick={() => setViewMode("BOARD")}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all duration-300",
                                viewMode === "BOARD" 
                                    ? "bg-white dark:bg-white/[0.08] shadow-sm text-brand-500 dark:text-zinc-100" 
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-white/60"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Tablero</span>
                        </button>
                        <button
                            onClick={() => setViewMode("LIST")}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all duration-300",
                                viewMode === "LIST" 
                                    ? "bg-white dark:bg-white/[0.08] shadow-sm text-brand-500 dark:text-zinc-100" 
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-white/60"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>Lista</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
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
