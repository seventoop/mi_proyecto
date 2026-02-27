"use client";

import { useState } from "react";
import LeadsKanban from "./leads-kanban";
import LeadsTable from "./leads-table";
import LeadDialog from "./lead-dialog";
import { LeadsImportDialog } from "./leads-import-dialog";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeadsView({ leads, projects }: { leads: any[], projects: any[] }) {
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
                    <LeadsImportDialog />
                    <LeadDialog projects={projects} />
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {viewMode === "BOARD" ? (
                    <LeadsKanban leads={leads} />
                ) : (
                    <LeadsTable leads={leads} />
                )}
            </div>
        </div>
    );
}
