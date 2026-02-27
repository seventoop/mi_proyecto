import { getLeads } from "@/lib/actions/leads";
import LeadsTable from "./leads-table";
import { Suspense } from "react";
import { Loader2, UserPlus } from "lucide-react";

export default async function LeadsPage() {
    const res = await getLeads();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Leads
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Gestiona tus contactos y prospectos
                    </p>
                </div>
                <button className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Nuevo Lead
                </button>
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            }>
                <LeadsTable leads={res.success ? res.data || [] : []} />
            </Suspense>
        </div>
    );
}
